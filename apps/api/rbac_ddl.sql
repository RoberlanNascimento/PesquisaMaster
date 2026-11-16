-- Padronização de Cargos na tabela usuarios para referenciar papeis_rbac
UPDATE usuarios SET cargo = 'administrador' WHERE cargo IN ('master', 'Diretor de Projetos', 'admin');
UPDATE usuarios SET cargo = 'estatistico' WHERE cargo ILIKE '%estat%';
UPDATE usuarios SET cargo = 'auditor' WHERE cargo ILIKE '%audit%';
UPDATE usuarios SET cargo = 'pesquisador' WHERE cargo NOT IN ('administrador', 'estatistico', 'auditor', 'pesquisador');

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS revogado BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS revogado_em TIMESTAMPTZ NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_usuarios_papel_rbac') THEN
        ALTER TABLE usuarios
            ADD CONSTRAINT fk_usuarios_papel_rbac
            FOREIGN KEY (cargo) REFERENCES papeis_rbac(codigo_papel) ON UPDATE CASCADE;
    END IF;
END $$;

-- Funções de Leitura de Contexto da Sessão (RLS & RBAC)
CREATE OR REPLACE FUNCTION fn_sessao_tenant_id() RETURNS INTEGER AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_tenant_id', true), '')::INTEGER;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION fn_sessao_usuario_id() RETURNS INTEGER AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_user_id', true), '')::INTEGER;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION fn_sessao_papel() RETURNS VARCHAR AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_user_role', true), '')::VARCHAR;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION fn_tem_permissao(p_codigo_permissao VARCHAR) RETURNS BOOLEAN AS $$
DECLARE
    v_papel VARCHAR;
BEGIN
    v_papel := fn_sessao_papel();
    IF v_papel IS NULL THEN
        RETURN FALSE;
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM papel_permissoes
        WHERE codigo_papel = v_papel AND codigo_permissao = p_codigo_permissao
    );
END;
$$ LANGUAGE plpgsql STABLE;

