"""Utilitário de Diagnóstico e Conexão Manual ao PostgreSQL Local.

Permite configurar manualmente os parâmetros de conexão no código,
passar argumentos via linha de comando ou utilizar o arquivo .env.

Exemplos de uso:
    python test_postgres_connection.py
    python test_postgres_connection.py -i                     (modo interativo)
    python test_postgres_connection.py --user postgres --password minha_senha
"""

import argparse
import asyncio
import os
import subprocess
import sys
import time
from urllib.parse import quote_plus

# ==============================================================================
# 🔄 AUTO-FORWARDING PARA O AMBIENTE VIRTUAL (.venv)
# Se invocado com o Python global, repassa automaticamente para o .venv do projeto
# ==============================================================================
def _ensure_venv():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.join(current_dir, ".venv", "Scripts", "python.exe"),
        os.path.join(current_dir, "apps", "api", ".venv", "Scripts", "python.exe"),
        os.path.join(os.path.dirname(current_dir), ".venv", "Scripts", "python.exe"),
    ]
    for candidate in candidates:
        if os.path.exists(candidate) and sys.executable.lower() != os.path.abspath(candidate).lower():
            if "PM_VENV_FORWARDED" not in os.environ:
                os.environ["PM_VENV_FORWARDED"] = "1"
                result = subprocess.run([candidate, *sys.argv])
                sys.exit(result.returncode)

_ensure_venv()

# ==============================================================================
# ⚙️ PARÂMETROS MANUAIS DE CONEXÃO AO POSTGRESQL LOCAL
# Edite os valores abaixo diretamente para conectar manualmente:
# ==============================================================================
MANUAL_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "user": "postgres",
    "password": "123456",
    "database": "pesquisas",
}

# Defina como True para priorizar a MANUAL_CONFIG acima em vez do .env
FORCE_MANUAL = True


def resolve_connection_params(args: argparse.Namespace) -> dict[str, str | int]:
    """Resolve os parâmetros priorizando CLI > Manual (se FORCE_MANUAL) > .env."""
    if args.interactive:
        print("\n--- 📝 Entrada Manual de Credenciais ---")
        host = input(f"Host [{MANUAL_CONFIG['host']}]: ").strip() or MANUAL_CONFIG["host"]
        port_raw = input(f"Porta [{MANUAL_CONFIG['port']}]: ").strip()
        port = int(port_raw) if port_raw else int(MANUAL_CONFIG["port"])
        user = input(f"Usuário [{MANUAL_CONFIG['user']}]: ").strip() or MANUAL_CONFIG["user"]
        password = input("Senha: ").strip() or MANUAL_CONFIG["password"]
        database = input(f"Banco [{MANUAL_CONFIG['database']}]: ").strip() or MANUAL_CONFIG["database"]
        return {"host": host, "port": port, "user": user, "password": password, "database": database}

    host = args.host or (MANUAL_CONFIG["host"] if FORCE_MANUAL else os.getenv("POSTGRES_HOST", MANUAL_CONFIG["host"]))
    port = int(args.port or (MANUAL_CONFIG["port"] if FORCE_MANUAL else os.getenv("POSTGRES_PORT", MANUAL_CONFIG["port"])))
    user = args.user or (MANUAL_CONFIG["user"] if FORCE_MANUAL else os.getenv("POSTGRES_USER", MANUAL_CONFIG["user"]))
    password = args.password or (MANUAL_CONFIG["password"] if FORCE_MANUAL else os.getenv("POSTGRES_PASSWORD", MANUAL_CONFIG["password"]))
    database = args.database or (MANUAL_CONFIG["database"] if FORCE_MANUAL else os.getenv("POSTGRES_DB", MANUAL_CONFIG["database"]))

    return {"host": str(host), "port": port, "user": str(user), "password": str(password), "database": str(database)}


def build_async_url(params: dict[str, str | int]) -> str:
    """Monta a URL de conexão assíncrona SQLAlchemy (asyncpg)."""
    user_enc = quote_plus(str(params["user"]))
    pass_enc = quote_plus(str(params["password"]))
    return f"postgresql+asyncpg://{user_enc}:{pass_enc}@{params['host']}:{params['port']}/{params['database']}"


async def test_direct_asyncpg(params: dict[str, str | int]) -> bool:
    """Testa handshake de socket direto com o driver asyncpg nativo."""
    print(f"\n[1/2] 🔌 Testando conexão direta com driver asyncpg...")
    try:
        import asyncpg
    except ImportError:
        print("      ⚠️ asyncpg não instalado no interpretador atual. Tentando via driver alternativo...")
        return await test_direct_psycopg(params)

    start_time = time.perf_counter()
    try:
        conn = await asyncpg.connect(
            host=str(params["host"]),
            port=int(params["port"]),
            user=str(params["user"]),
            password=str(params["password"]),
            database=str(params["database"]),
            timeout=5.0,
        )
        elapsed = (time.perf_counter() - start_time) * 1000
        print(f"      ✅ Socket TCP conectado com sucesso em {elapsed:.1f}ms!")

        version = await conn.fetchval("SELECT version();")
        print(f"      📦 PostgreSQL: {version.split(',')[0]}")

        try:
            gis_ver = await conn.fetchval("SELECT PostGIS_Version();")
            print(f"      🌐 PostGIS: Ativo (Versão {gis_ver})")
        except Exception:
            print("      ⚠️ PostGIS: Extensão não encontrada no banco atual.")

        await conn.close()
        return True

    except asyncpg.InvalidCatalogNameError:
        print(f"      ⚠️ O banco '{params['database']}' ainda não existe.")
        print("      Tentando conectar no banco padrão de manutenção 'postgres'...")
        return await try_create_database(params)
    except Exception as exc:
        print(f"      ❌ Falha no asyncpg: {exc}")
        return False


async def test_direct_psycopg(params: dict[str, str | int]) -> bool:
    """Fallback usando psycopg caso asyncpg não esteja disponível."""
    try:
        import psycopg
        conn = psycopg.connect(
            host=str(params["host"]),
            port=int(params["port"]),
            user=str(params["user"]),
            password=str(params["password"]),
            dbname=str(params["database"]),
            connect_timeout=5,
        )
        cur = conn.cursor()
        cur.execute("SELECT version();")
        ver = cur.fetchone()[0]
        print(f"      ✅ Conectado via psycopg! Versão: {ver.split(',')[0]}")
        conn.close()
        return True
    except Exception as exc:
        print(f"      ❌ Falha na conexão: {exc}")
        return False


async def try_create_database(params: dict[str, str | int]) -> bool:
    """Conecta no banco 'postgres' padrão e cria o banco do projeto se solicitado."""
    try:
        import asyncpg
        conn = await asyncpg.connect(
            host=str(params["host"]),
            port=int(params["port"]),
            user=str(params["user"]),
            password=str(params["password"]),
            database="postgres",
            timeout=5.0,
        )
        print("      ✅ Conectado com sucesso ao banco de manutenção 'postgres'!")
        db_target = str(params["database"])
        await conn.execute(f'CREATE DATABASE "{db_target}";')
        print(f"      🎉 Banco de dados '{db_target}' criado com sucesso!")
        await conn.close()
        return True
    except Exception as exc:
        print(f"      ❌ Não foi possível criar o banco automaticamente: {exc}")
        return False


async def test_sqlalchemy_engine(params: dict[str, str | int]) -> bool:
    """Testa o pool de conexões do SQLAlchemy 2.0 (utilizado pela API FastAPI)."""
    print(f"\n[2/2] ⚙️ Testando SQLAlchemy 2.0 AsyncEngine (FastAPI)...")
    try:
        from sqlalchemy import text
        from sqlalchemy.ext.asyncio import create_async_engine
        url = build_async_url(params)
        engine = create_async_engine(url, echo=False, pool_pre_ping=True)
        async with engine.connect() as conn:
            res = await conn.execute(text("SELECT current_user, current_database();"))
            user, db = res.one()
            print(f"      ✅ Sessão SQLAlchemy operacional! Usuário: '{user}', Banco: '{db}'")
            await engine.dispose()
            return True
    except Exception as exc:
        print(f"      ❌ Falha no SQLAlchemy AsyncEngine: {exc}")
        return False


async def main() -> int:
    parser = argparse.ArgumentParser(description="Teste manual de conexão PostgreSQL Local - PesquisaMaster")
    parser.add_argument("-i", "--interactive", action="store_true", help="Solicitar credenciais interativamente")
    parser.add_argument("--host", default=None, help="Host do PostgreSQL")
    parser.add_argument("--port", default=None, help="Porta do PostgreSQL")
    parser.add_argument("-u", "--user", default=None, help="Usuário")
    parser.add_argument("-p", "--password", default=None, help="Senha")
    parser.add_argument("-d", "--database", default=None, help="Nome do banco de dados")
    args = parser.parse_args()

    params = resolve_connection_params(args)

    print("=" * 65)
    print("🐘 PESQUISAMASTER - TESTE DE CONEXÃO POSTGRESQL LOCAL")
    print("=" * 65)
    print(f"  • Python:   {sys.version.split()[0]} ({'VENV' if sys.prefix != sys.base_prefix else 'GLOBAL'})")
    print(f"  • Host:     {params['host']}:{params['port']}")
    print(f"  • Usuário:  {params['user']}")
    print(f"  • Senha:    {'*' * len(str(params['password']))}")
    print(f"  • Banco:    {params['database']}")

    ok_direct = await test_direct_asyncpg(params)
    if not ok_direct:
        print("\n" + "=" * 65)
        print("💡 DICAS PARA RESOLVER:")
        print("  1. Iniciar banco via Docker Compose:")
        print("     docker compose up -d db")
        print("  2. Caso utilize PostgreSQL instalado no Windows:")
        print("     Verifique se o serviço 'postgresql-x64-16' está em execução.")
        print("  3. Para digitar as credenciais na hora, execute:")
        print("     python test_postgres_connection.py -i")
        print("=" * 65)
        return 1

    ok_sa = await test_sqlalchemy_engine(params)
    print("\n" + "=" * 65)
    if ok_direct and ok_sa:
        print("🚀 STATUS: TUDO PRONTO! Conexão local validada com sucesso.")
    else:
        print("⚠️ STATUS: Conexão direta funcionou, mas houve ressalva no pool SQLAlchemy.")
    print("=" * 65)
    return 0 if (ok_direct and ok_sa) else 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
