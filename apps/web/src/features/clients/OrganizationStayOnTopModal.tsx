import React, { useEffect, useRef, useState } from "react";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";
import { useUiSessionStore } from "../../lib/store";

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
  readonly logomarca?: string | null;
}

interface OrganizationStayOnTopModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSuccess: (msg: string, org: OrganizationRecord) => void;
  readonly onLogoUploaded?: (logoUrl: string) => void;
}

function getOrgInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  if (!first) return "PM";
  const last = parts[parts.length - 1];
  if (parts.length === 1 || !last) return first.slice(0, 2).toUpperCase();
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

export function OrganizationStayOnTopModal({
  isOpen,
  onClose,
  onSuccess,
  onLogoUploaded,
}: OrganizationStayOnTopModalProps): React.JSX.Element | null {
  const activeTenantId = useUiSessionStore((state) => state.activeTenantId);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [orgId, setOrgId] = useState<number>(1);
  const [razaoSocial, setRazaoSocial] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [slug, setSlug] = useState("matriz");
  const [plano, setPlano] = useState("enterprise");
  const [statusAssinatura, setStatusAssinatura] = useState("ativa");
  const [limitePesquisas, setLimitePesquisas] = useState(10);
  const [limiteEntrevistas, setLimiteEntrevistas] = useState(10000);
  const [logomarca, setLogomarca] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoHovered, setLogoHovered] = useState(false);
  const [logoImgFailed, setLogoImgFailed] = useState(false);
  const [storageBadge, setStorageBadge] = useState<"gcs" | "inline_fallback" | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLogoImgFailed(false);
  }, [logomarca]);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setStorageBadge(null);
    setLogoImgFailed(false);
    fetch("http://127.0.0.1:8000/api/v1/pesquisas-tabelas/organizacoes", {
      cache: "no-store",
    })
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
          setLogomarca(first.logomarca ?? "");
          setLogoImgFailed(false);
        }
      })
      .catch(() => {});
  }, [isOpen, activeTenantId]);

  if (!isOpen) return null;

  const handleLogoFileChange = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(file.type)) {
      setError("Formato inválido. Envie PNG, JPEG, WEBP ou SVG.");
      return;
    }

    setError(null);
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(
        `http://127.0.0.1:8000/api/v1/pesquisas-tabelas/organizacoes/${orgId}/logomarca`,
        {
          method: "POST",
          body: formData,
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        logomarca?: string;
        storage?: "gcs" | "inline_fallback";
        detail?: string;
      };
      if (!res.ok || !data.logomarca) {
        setError(data.detail || `Erro ao enviar logomarca para o GCS (HTTP ${res.status}).`);
        return;
      }
      setLogomarca(data.logomarca);
      setLogoImgFailed(false);
      setStorageBadge(data.storage ?? "gcs");
      onLogoUploaded?.(data.logomarca);
      try {
        const brandingPayload = {
          id_organizacao: orgId,
          nome_fantasia: nomeFantasia,
          razao_social: razaoSocial,
          logomarca: data.logomarca,
        };
        window.localStorage.setItem("pm_org_branding", JSON.stringify(brandingPayload));
        window.dispatchEvent(new CustomEvent("pm_org_branding_updated", { detail: brandingPayload }));
      } catch {
        // ignore storage errors
      }
    } catch {
      setError("Erro de conexão ao enviar logomarca para o GCS.");
    } finally {
      setUploadingLogo(false);
    }
  };

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
          logomarca: logomarca.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.detail || "Erro ao salvar dados da organização.");
        return;
      }
      try {
        const brandingPayload = {
          id_organizacao: data.id_organizacao ?? orgId,
          nome_fantasia: data.nome_fantasia ?? nomeFantasia,
          razao_social: data.razao_social ?? razaoSocial,
          logomarca: data.logomarca ?? (logomarca.trim() || null),
        };
        window.localStorage.setItem("pm_org_branding", JSON.stringify(brandingPayload));
        window.dispatchEvent(new CustomEvent("pm_org_branding_updated", { detail: brandingPayload }));
      } catch {
        // ignore storage errors
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
      <div style={{ width: "100%", maxWidth: "540px", backgroundColor: NOCTURNE_TOKENS.colors.surfaceContainer, border: `1px solid ${NOCTURNE_TOKENS.colors.borderSubtle}`, borderRadius: "16px", padding: "24px", boxShadow: "0 24px 60px rgba(0,0,0,0.6)", maxHeight: "92vh", overflowY: "auto" }}>
        <h3 style={{ margin: "0 0 4px", fontSize: "18px", color: NOCTURNE_TOKENS.colors.textPrimary }}>
          🏢 Dados da Organização
        </h3>
        <p style={{ margin: "0 0 18px", fontSize: "12px", color: NOCTURNE_TOKENS.colors.textMuted }}>
          Complete ou altere os dados cadastrais e a logomarca da organização vinculada à conta.
        </p>

        {/* Circular Logo Container (GCS Upload) */}
        <div
          data-testid="org-logo-container"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "10px",
            marginBottom: "18px",
            paddingBottom: "16px",
            borderBottom: `1px solid ${NOCTURNE_TOKENS.colors.borderSubtle}`,
          }}
        >
          <input
            ref={fileInputRef}
            data-testid="input-org-logo-file"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            style={{ display: "none" }}
            onChange={(e) => void handleLogoFileChange(e)}
          />
          <button
            type="button"
            data-testid="btn-org-logo-circle"
            disabled={uploadingLogo}
            onClick={() => fileInputRef.current?.click()}
            onMouseEnter={() => setLogoHovered(true)}
            onMouseLeave={() => setLogoHovered(false)}
            title={uploadingLogo ? "Enviando logomarca para o GCS..." : "Clique para enviar/alterar a logomarca (GCS)"}
            aria-label="Enviar logomarca da empresa"
            style={{
              position: "relative",
              width: "88px",
              height: "88px",
              padding: 0,
              borderRadius: "50%",
              overflow: "hidden",
              border: `2px solid ${NOCTURNE_TOKENS.colors.borderSubtle}`,
              backgroundColor: NOCTURNE_TOKENS.colors.surfaceBase,
              color: NOCTURNE_TOKENS.colors.textMuted,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "24px",
              cursor: uploadingLogo ? "wait" : "pointer",
              boxShadow: "0 6px 18px rgba(0,0,0,0.35)",
            }}
          >
            {logomarca.trim() && !logoImgFailed ? (
              <img
                data-testid="preview-org-logomarca"
                src={logomarca.trim()}
                alt={nomeFantasia || "Logomarca da Organização"}
                onError={() => setLogoImgFailed(true)}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: "50%",
                  display: "block",
                }}
              />
            ) : (
              getOrgInitials(nomeFantasia || razaoSocial || "PM")
            )}

            {(logoHovered || uploadingLogo) && (
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundColor: "rgba(0, 0, 0, 0.58)",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: uploadingLogo ? "12px" : "22px",
                  fontWeight: 700,
                }}
              >
                {uploadingLogo ? "..." : "📷"}
              </span>
            )}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
            <button
              type="button"
              data-testid="btn-upload-org-logo"
              disabled={uploadingLogo}
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: "5px 12px",
                borderRadius: "8px",
                border: `1px solid ${NOCTURNE_TOKENS.colors.borderSubtle}`,
                backgroundColor: NOCTURNE_TOKENS.colors.surfaceContainerHigh,
                color: NOCTURNE_TOKENS.colors.textPrimary,
                fontSize: "12px",
                fontWeight: 600,
                cursor: uploadingLogo ? "wait" : "pointer",
              }}
            >
              {uploadingLogo ? "Enviando..." : "Enviar Logomarca (GCS)"}
            </button>
            {logomarca.trim() && (
              <button
                type="button"
                data-testid="btn-remove-org-logo"
                disabled={uploadingLogo}
                onClick={() => {
                  setLogomarca("");
                  setLogoImgFailed(false);
                  setStorageBadge(null);
                }}
                style={{
                  padding: "5px 10px",
                  borderRadius: "8px",
                  border: "1px solid rgba(242, 139, 130, 0.35)",
                  backgroundColor: "transparent",
                  color: "#f28b82",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Remover
              </button>
            )}
            {storageBadge && (
              <span
                data-testid="badge-org-logo-storage"
                style={{
                  padding: "3px 8px",
                  borderRadius: "9999px",
                  fontSize: "10px",
                  fontWeight: 700,
                  backgroundColor: "rgba(129, 201, 149, 0.14)",
                  border: "1px solid rgba(129, 201, 149, 0.35)",
                  color: "#81c995",
                }}
              >
                {storageBadge === "gcs" ? "GCS" : "Salvo"}
              </span>
            )}
          </div>
        </div>

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
            <button type="submit" disabled={saving || uploadingLogo} style={{ padding: "8px 16px", borderRadius: "8px", border: "none", backgroundColor: "#3b82f6", color: "#ffffff", fontWeight: 600, cursor: "pointer" }}>
              {saving ? "Salvando..." : "Salvar Organização"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
