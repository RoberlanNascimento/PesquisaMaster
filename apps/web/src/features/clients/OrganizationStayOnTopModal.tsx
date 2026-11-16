import React, { useEffect, useState } from "react";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";

export interface OrganizationRecord {
  readonly id_organizacao: number;
  readonly razao_social: string;
  readonly nome_fantasia: string;
  readonly cnpj: string;
  readonly slug_subdominio: string;
  readonly plano_assinatura: string;
  readonly status_assinatura: string;
  readonly limite_pesquisas_ativas: number;
  readonly limite_entrevistas_mes: number;
}

interface OrganizationStayOnTopModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSuccess: (msg: string, org: OrganizationRecord) => void;
}

export function OrganizationStayOnTopModal({
  isOpen,
  onClose,
  onSuccess,
}: OrganizationStayOnTopModalProps): React.JSX.Element | null {
  const [orgId, setOrgId] = useState<number>(1);
  const [razaoSocial, setRazaoSocial] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [slug, setSlug] = useState("matriz");
  const [plano, setPlano] = useState("enterprise");
  const [statusAssinatura, setStatusAssinatura] = useState("ativa");
  const [limitePesquisas, setLimitePesquisas] = useState(10);
  const [limiteEntrevistas, setLimiteEntrevistas] = useState(10000);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    fetch("http://127.0.0.1:8000/api/v1/pesquisas-tabelas/organizacoes")
      .then((r) => (r.ok ? r.json() : []))
      .then((items: OrganizationRecord[]) => {
        const first = items?.[0];
        if (first) {
          setOrgId(first.id_organizacao);
          setRazaoSocial(first.razao_social);
          setNomeFantasia(first.nome_fantasia);
          setCnpj(first.cnpj);
          setSlug(first.slug_subdominio);
          setPlano(first.plano_assinatura);
          setStatusAssinatura(first.status_assinatura);
          setLimitePesquisas(first.limite_pesquisas_ativas);
          setLimiteEntrevistas(first.limite_entrevistas_mes);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/v1/pesquisas-tabelas/organizacoes/${orgId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razao_social: razaoSocial,
          nome_fantasia: nomeFantasia,
          cnpj,
          slug_subdominio: slug,
          plano_assinatura: plano,
          status_assinatura: statusAssinatura,
          limite_pesquisas_ativas: Number(limitePesquisas),
          limite_entrevistas_mes: Number(limiteEntrevistas),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.detail || "Erro ao salvar dados da organização.");
        return;
      }
      onSuccess("Dados da organização atualizados no banco de dados!", data);
      onClose();
    } catch {
      setError("Erro de conexão com o servidor.");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    borderRadius: "10px",
    border: `1px solid ${NOCTURNE_TOKENS.colors.borderSubtle}`,
    backgroundColor: NOCTURNE_TOKENS.colors.surfaceBase,
    color: NOCTURNE_TOKENS.colors.textPrimary,
    fontSize: "13px",
    boxSizing: "border-box",
  };

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.72)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1300, padding: "16px" }}>
      <div style={{ width: "100%", maxWidth: "540px", backgroundColor: NOCTURNE_TOKENS.colors.surfaceContainer, border: `1px solid ${NOCTURNE_TOKENS.colors.borderSubtle}`, borderRadius: "16px", padding: "24px", boxShadow: "0 24px 60px rgba(0,0,0,0.6)" }}>
        <h3 style={{ margin: "0 0 4px", fontSize: "18px", color: NOCTURNE_TOKENS.colors.textPrimary }}>
          🏢 Dados da Organização (Stay-on-Top)
        </h3>
        <p style={{ margin: "0 0 16px", fontSize: "12px", color: NOCTURNE_TOKENS.colors.textMuted }}>
          Complete ou altere os dados cadastrais da organização vinculada à conta na tabela <code>organizacoes</code>.
        </p>

        {error && (
          <div style={{ padding: "8px 12px", borderRadius: "8px", backgroundColor: "#451a1a", color: "#fca5a5", fontSize: "12px", marginBottom: "12px" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "12px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", color: NOCTURNE_TOKENS.colors.textMuted }}>Razão Social *</label>
            <input type="text" required value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", color: NOCTURNE_TOKENS.colors.textMuted }}>Nome Fantasia *</label>
              <input type="text" required value={nomeFantasia} onChange={(e) => setNomeFantasia(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", color: NOCTURNE_TOKENS.colors.textMuted }}>CNPJ *</label>
              <input type="text" required value={cnpj} onChange={(e) => setCnpj(e.target.value)} style={inputStyle} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", color: NOCTURNE_TOKENS.colors.textMuted }}>Subdomínio</label>
              <input type="text" required value={slug} onChange={(e) => setSlug(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", color: NOCTURNE_TOKENS.colors.textMuted }}>Plano</label>
              <select value={plano} onChange={(e) => setPlano(e.target.value)} style={inputStyle}>
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", color: NOCTURNE_TOKENS.colors.textMuted }}>Status</label>
              <select value={statusAssinatura} onChange={(e) => setStatusAssinatura(e.target.value)} style={inputStyle}>
                <option value="ativa">Ativa</option>
                <option value="suspensa">Suspensa</option>
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", color: NOCTURNE_TOKENS.colors.textMuted }}>Limite Pesquisas Ativas</label>
              <input type="number" min={1} value={limitePesquisas} onChange={(e) => setLimitePesquisas(Number(e.target.value))} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", color: NOCTURNE_TOKENS.colors.textMuted }}>Limite Entrevistas/Mês</label>
              <input type="number" min={100} value={limiteEntrevistas} onChange={(e) => setLimiteEntrevistas(Number(e.target.value))} style={inputStyle} />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
            <button type="button" onClick={onClose} style={{ padding: "8px 14px", borderRadius: "8px", border: `1px solid ${NOCTURNE_TOKENS.colors.borderSubtle}`, background: "transparent", color: NOCTURNE_TOKENS.colors.textPrimary, cursor: "pointer" }}>
              Fechar
            </button>
            <button type="submit" disabled={saving} style={{ padding: "8px 16px", borderRadius: "8px", border: "none", backgroundColor: "#3b82f6", color: "#ffffff", fontWeight: 600, cursor: "pointer" }}>
              {saving ? "Salvando..." : "Salvar Organização"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

