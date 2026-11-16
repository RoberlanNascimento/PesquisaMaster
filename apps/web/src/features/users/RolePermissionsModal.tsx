import React, { useEffect, useState } from "react";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";

interface PapelRbac {
  readonly codigo_papel: string;
  readonly nome_exibicao: string;
  readonly canal_acesso: string;
  readonly nivel_hierarquia: number;
  readonly descricao: string;
}

interface PermissaoRbac {
  readonly codigo_permissao: string;
  readonly modulo: string;
  readonly descricao: string;
}

interface RolePermissionsModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSuccess: (msg: string) => void;
}

export function RolePermissionsModal({
  isOpen,
  onClose,
  onSuccess,
}: RolePermissionsModalProps): React.JSX.Element | null {
  const [papeis, setPapeis] = useState<readonly PapelRbac[]>([]);
  const [permissoes, setPermissoes] = useState<readonly PermissaoRbac[]>([]);
  const [selectedPapel, setSelectedPapel] = useState<string>("administrador");
  const [checkedPerms, setCheckedPerms] = useState<Set<string>>(new Set());
  const [matrix, setMatrix] = useState<readonly { codigo_papel: string; codigo_permissao: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    fetch("http://127.0.0.1:8000/api/v1/pesquisas-tabelas/usuarios/rbac")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setPapeis(data.papeis ?? []);
        setPermissoes(data.permissoes ?? []);
        setMatrix(data.papel_permissoes ?? []);
        const firstRole = data.papeis?.[0]?.codigo_papel ?? "administrador";
        setSelectedPapel(firstRole);
        const initialSet = new Set<string>(
          (data.papel_permissoes ?? [])
            .filter((m: any) => m.codigo_papel === firstRole)
            .map((m: any) => m.codigo_permissao)
        );
        setCheckedPerms(initialSet);
      })
      .catch(() => {});
  }, [isOpen]);

  const handleSelectPapel = (codigo: string): void => {
    setSelectedPapel(codigo);
    setCheckedPerms(
      new Set(matrix.filter((m) => m.codigo_papel === codigo).map((m) => m.codigo_permissao))
    );
  };

  const togglePerm = (codigo: string): void => {
    setCheckedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(codigo)) next.delete(codigo);
      else next.add(codigo);
      return next;
    });
  };

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/api/v1/pesquisas-tabelas/usuarios/rbac/${selectedPapel}/permissoes`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ codigos_permissao: Array.from(checkedPerms) }),
        }
      );
      if (res.ok) {
        onSuccess(`Permissões do papel "${selectedPapel}" atualizadas na tabela papel_permissoes!`);
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "16px" }}>
      <div style={{ width: "100%", maxWidth: "620px", maxHeight: "85vh", overflowY: "auto", backgroundColor: NOCTURNE_TOKENS.colors.surfaceContainer, border: `1px solid ${NOCTURNE_TOKENS.colors.borderSubtle}`, borderRadius: "16px", padding: "24px" }}>
        <h3 style={{ margin: "0 0 6px", fontSize: "18px", color: NOCTURNE_TOKENS.colors.textPrimary }}>
          Matriz de Permissões RBAC (Papeis_RBAC & Papel_Permissoes)
        </h3>
        <p style={{ margin: "0 0 16px", fontSize: "12px", color: NOCTURNE_TOKENS.colors.textMuted }}>
          Selecione um cargo padronizado e defina suas permissões operacionais no banco de dados.
        </p>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
          {papeis.map((p) => (
            <button
              key={p.codigo_papel}
              type="button"
              onClick={() => handleSelectPapel(p.codigo_papel)}
              style={{
                padding: "7px 12px",
                borderRadius: "8px",
                border: `1px solid ${selectedPapel === p.codigo_papel ? "#3b82f6" : NOCTURNE_TOKENS.colors.borderSubtle}`,
                backgroundColor: selectedPapel === p.codigo_papel ? "rgba(59,130,246,0.18)" : "transparent",
                color: NOCTURNE_TOKENS.colors.textPrimary,
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {p.nome_exibicao} ({p.codigo_papel})
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gap: "8px", marginBottom: "20px" }}>
          {permissoes.map((perm) => (
            <label
              key={perm.codigo_permissao}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                padding: "10px 12px",
                borderRadius: "10px",
                backgroundColor: NOCTURNE_TOKENS.colors.surfaceBase,
                border: `1px solid ${NOCTURNE_TOKENS.colors.borderSubtle}`,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={checkedPerms.has(perm.codigo_permissao)}
                onChange={() => togglePerm(perm.codigo_permissao)}
                style={{ marginTop: "3px" }}
              />
              <div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: NOCTURNE_TOKENS.colors.textPrimary }}>
                  {perm.codigo_permissao}{" "}
                  <span style={{ fontSize: "11px", color: "#60a5fa", fontWeight: 500 }}>[{perm.modulo}]</span>
                </div>
                <div style={{ fontSize: "11px", color: NOCTURNE_TOKENS.colors.textMuted }}>{perm.descricao}</div>
              </div>
            </label>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button type="button" onClick={onClose} style={{ padding: "8px 14px", borderRadius: "8px", border: `1px solid ${NOCTURNE_TOKENS.colors.borderSubtle}`, background: "transparent", color: NOCTURNE_TOKENS.colors.textPrimary, cursor: "pointer" }}>
            Fechar
          </button>
          <button type="button" onClick={handleSave} disabled={saving} style={{ padding: "8px 16px", borderRadius: "8px", border: "none", backgroundColor: "#3b82f6", color: "#ffffff", fontWeight: 600, cursor: "pointer" }}>
            {saving ? "Salvando..." : "Salvar Permissões"}
          </button>
        </div>
      </div>
    </div>
  );
}

