#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "=========================================================="
echo "🛡️  INICIANDO QUALITY GATE COMPLETO DO REPOSITÓRIO"
echo "=========================================================="

# 1. Validação de tamanho máximo de arquivos (Regra de 250 linhas)
echo "📏 [1/6] Verificando limite de modularidade (máx 250 linhas por arquivo de código)..."
VIOLATIONS=$(find apps/api/src apps/web/src -type f \( -name "*.py" -o -name "*.ts" -o -name "*.tsx" \) \
  ! -path "*/api-client/*" ! -path "*/migrations/*" \
  -exec awk 'FNR == 251 { print FILENAME " (>250 linhas)" }' {} + || true)

if [ -n "$VIOLATIONS" ]; then
  echo "❌ ERRO ARQUITETURAL: Os seguintes arquivos ultrapassaram 250 linhas e precisam ser modularizados:"
  echo "$VIOLATIONS"
  exit 1
fi
echo "✅ Modularidade dentro do padrão."

# 2. Linter e Formatação do Backend
if [ -d "apps/api" ]; then
  echo "🐍 [2/6] Executando Ruff (Linter & Formatter Check) no Backend..."
  pushd apps/api > /dev/null
  if [ -d ".venv/Scripts" ]; then
    export PATH="$PWD/.venv/Scripts:$PATH"
  elif [ -d ".venv/bin" ]; then
    export PATH="$PWD/.venv/bin:$PATH"
  fi
  python -m ruff check src tests
  python -m ruff format --check src tests

  echo "🔍 [3/6] Executando verificação estrita de tipos (Mypy)..."
  python -m mypy src

  echo "🧪 [4/6] Executando suíte de testes automatizados (Pytest)..."
  python -m pytest -q --tb=short
  popd > /dev/null
fi

# 4. Validação de Conformidade com 07-design.md (Nocturne Editorial & Amarelo Pastel)
echo "🎨 [5/7] Verificando conformidade de design com docs/memory-bank/07-design.md..."
if [ ! -f "docs/memory-bank/07-design.md" ]; then
  echo "❌ ERRO DE DESIGN: O arquivo obrigatório docs/memory-bank/07-design.md não foi encontrado."
  exit 1
fi
if ! grep -q "warning-pastel: '#fde293'" docs/memory-bank/07-design.md; then
  echo "❌ ERRO DE DESIGN: docs/memory-bank/07-design.md deve definir a cor amarelo pastel (#fde293) para alertas e botões de editar."
  exit 1
fi
if ! grep -q "StandardPageTemplate" apps/web/src/App.tsx; then
  echo "❌ ERRO DE DESIGN: Todas as telas roteadas em App.tsx devem utilizar o StandardPageTemplate de 07-design.md."
  exit 1
fi
echo "✅ Conformidade com 07-design.md verificada."

# 5. Sincronização de Contratos OpenAPI
if [ -f "scripts/sync-contracts.sh" ] && [ -f "apps/api/src/main.py" ] && [ -f "apps/web/package.json" ]; then
  echo "🔗 [6/7] Validando sincronização de contratos OpenAPI..."
  bash ./scripts/sync-contracts.sh
fi

# 6. Validação de Tipagem, Lint e Testes do Frontend
if [ -d "apps/web" ] && [ -f "apps/web/package.json" ]; then
  echo "⚛️  [7/7] Executando Typecheck (tsc --noEmit), Lint e Testes no Frontend..."
  pushd apps/web > /dev/null
  npm run typecheck
  npm run lint
  npm run test -- --run
  popd > /dev/null
fi

echo "=========================================================="
echo "✅ SUCESSO ABSOLUTO: Todos os controles de qualidade passaram (Exit Code 0)."
echo "=========================================================="