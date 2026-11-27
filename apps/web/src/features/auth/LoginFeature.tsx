import React, { useEffect, useState } from "react";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";
import { useUiSessionStore } from "../../lib/store";

const { colors, rounded, typography } = NOCTURNE_TOKENS;

interface OrgBranding {
  readonly id_organizacao: number;
  readonly nome_fantasia: string;
  readonly razao_social: string;
  readonly logomarca?: string | null;
}

function getCachedOrgBranding(): OrgBranding | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("pm_org_branding");
    return raw ? (JSON.parse(raw) as OrgBranding) : null;
  } catch {
    return null;
  }
}

interface DevCredentialPreset {
  readonly id: string;
  readonly testId: string;
  readonly tenantLabel: string;
  readonly tenantBadge: string;
  readonly email: string;
  readonly password: string;
}

const DEV_CREDENTIAL_PRESETS: readonly DevCredentialPreset[] = [
  {
    id: "dataopinion",
    testId: "btn-quick-fill-demo",
    tenantLabel: "DataOpinion Matriz",
    tenantBadge: "Cliente 1",
    email: "iwcosta@gmail.com",
    password: "123456",
  },
  {
    id: "veritas",
    testId: "btn-quick-fill-veritas",
    tenantLabel: "Instituto Veritas",
    tenantBadge: "Cliente 2",
    email: "admin@institutoveritas.com.br",
    password: "123456",
  },
  {
    id: "visitante",
    testId: "btn-quick-fill-visitante",
    tenantLabel: "Acesso Mínimo — Visitante",
    tenantBadge: "RBAC Mínimo",
    email: "visitante@dataopinion.com.br",
    password: "123456",
  },
];

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  borderRadius: rounded.DEFAULT,
  backgroundColor: colors.surfaceContainerLow,
  border: `1px solid ${colors.borderSubtle}`,
  color: colors.textPrimary,
  fontSize: "14px",
  outline: "none",
  transition: "border-color 0.15s ease",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  fontWeight: 600,
  color: colors.textMuted,
  marginBottom: "6px",
};

export function LoginFeature(): React.JSX.Element {
  const [email, setEmail] = useState<string>("iwcosta@gmail.com");
  const [password, setPassword] = useState<string>("123456");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [branding, setBranding] = useState<OrgBranding | null>(() => getCachedOrgBranding());
  const [logoImgFailed, setLogoImgFailed] = useState<boolean>(false);
  const login = useUiSessionStore((state) => state.login);

  const normalizedEmail = email.trim().toLowerCase();

  useEffect(() => {
    setLogoImgFailed(false);
  }, [branding?.logomarca]);

  useEffect(() => {
    const isJsdom = typeof navigator !== "undefined" && navigator.userAgent.includes("jsdom");
    if (isJsdom) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      const qs = normalizedEmail ? `?email=${encodeURIComponent(normalizedEmail)}` : "";
      fetch(`http://127.0.0.1:8000/api/v1/pesquisas-tabelas/organizacoes/branding${qs}`, {
        cache: "no-store",
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: OrgBranding | null) => {
          if (cancelled || !data || !data.nome_fantasia) return;
          setBranding(data);
          setLogoImgFailed(false);
          try {
            window.localStorage.setItem("pm_org_branding", JSON.stringify(data));
          } catch {
            // ignore storage quota errors
          }
        })
        .catch(() => {
          // keep cached or default branding when offline
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [normalizedEmail]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setErrorMsg("");

    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setErrorMsg("Informe um e-mail institucional válido.");
      return;
    }
    if (!password.trim()) {
      setErrorMsg("Informe a senha de acesso.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(normalizedEmail, password);
      if (!result.success) {
        setErrorMsg(result.error ?? "E-mail ou senha incorretos.");
      }
    } catch {
      setErrorMsg("Falha de conexão com o servidor de autenticação.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (preset: DevCredentialPreset): void => {
    setEmail(preset.email);
    setPassword(preset.password);
    setErrorMsg("");
  };

  return (
    <div
      data-testid="login-screen"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.surfaceBase,
        fontFamily: typography.fontFamily,
        padding: "24px",
      }}
    >
      <div style={{ width: "100%", maxWidth: "460px", display: "flex", flexDirection: "column", gap: "22px" }}>
        <div style={{ textAlign: "center" }}>
          {branding?.logomarca && !logoImgFailed ? (
            <div
              data-testid="login-branding-logo"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                overflow: "hidden",
                border: `2px solid ${colors.borderSubtle}`,
                backgroundColor: colors.surfaceContainer,
                marginBottom: "12px",
                boxShadow: "0 6px 18px rgba(0, 0, 0, 0.35)",
              }}
            >
              <img
                src={branding.logomarca}
                alt={branding.nome_fantasia}
                onError={() => setLogoImgFailed(true)}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: "50%",
                  display: "block",
                }}
              />
            </div>
          ) : (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                backgroundColor: colors.primary,
                color: "#041e49",
                fontWeight: 800,
                fontSize: "20px",
                marginBottom: "12px",
                boxShadow: "0 6px 18px rgba(168, 199, 250, 0.25)",
              }}
            >
              PM
            </div>
          )}
          <h1
            data-testid="login-branding-title"
            style={{ fontSize: "24px", fontWeight: 700, color: colors.textPrimary, margin: "0 0 6px 0" }}
          >
            {branding?.nome_fantasia || "PesquisaMaster"}
          </h1>
          <p
            data-testid="login-branding-subtitle"
            style={{ fontSize: "13px", color: colors.textMuted, margin: 0 }}
          >
            {branding?.razao_social || "Plataforma Eleitoral, Tabulação TSE & Agregador Multi-Tenant"}
          </p>
        </div>

        <div
          data-testid="login-card"
          style={{
            backgroundColor: colors.surfaceContainer,
            border: `1px solid ${colors.borderSubtle}`,
            borderRadius: rounded.DEFAULT,
            padding: "28px",
            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.45)",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: "20px" }}>
            <div>
              <h2 style={{ fontSize: "17px", fontWeight: 600, color: colors.textPrimary, margin: "0 0 4px 0" }}>
                Acesso ao Sistema
              </h2>
              <p style={{ fontSize: "12.5px", color: colors.textMuted, margin: 0 }}>
                Identifique-se para garantir o isolamento multi-tenant dos seus dados.
              </p>
            </div>
            <span
              style={{
                flexShrink: 0,
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.4px",
                textTransform: "uppercase",
                padding: "4px 8px",
                borderRadius: "9999px",
                backgroundColor: "rgba(168, 199, 250, 0.12)",
                border: `1px solid ${colors.primary}`,
                color: colors.primary,
              }}
            >
              DEV
            </span>
          </div>

          {errorMsg && (
            <div
              data-testid="login-error-alert"
              role="alert"
              style={{
                padding: "10px 14px",
                borderRadius: rounded.DEFAULT,
                backgroundColor: "rgba(242, 139, 130, 0.12)",
                border: "1px solid #f28b82",
                color: "#f28b82",
                fontSize: "12.5px",
                lineHeight: "1.45",
                marginBottom: "18px",
              }}
            >
              ⚠️ {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label htmlFor="login-email" style={labelStyle}>
                E-mail Institucional
              </label>
              <input
                id="login-email"
                data-testid="input-login-email"
                type="email"
                autoComplete="email"
                required
                disabled={isLoading}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMsg) setErrorMsg("");
                }}
                placeholder="usuario@organizacao.com.br"
                style={{
                  ...inputStyle,
                  opacity: isLoading ? 0.7 : 1,
                }}
              />
            </div>

            <div>
              <label htmlFor="login-password" style={labelStyle}>
                Senha de Acesso
              </label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                  id="login-password"
                  data-testid="input-login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  disabled={isLoading}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg("");
                  }}
                  placeholder="••••••••"
                  style={{
                    ...inputStyle,
                    paddingRight: "78px",
                    opacity: isLoading ? 0.7 : 1,
                  }}
                />
                <button
                  type="button"
                  data-testid="btn-toggle-password"
                  disabled={isLoading}
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  aria-pressed={showPassword}
                  style={{
                    position: "absolute",
                    right: "8px",
                    background: "none",
                    border: "none",
                    padding: "4px 8px",
                    borderRadius: "6px",
                    color: colors.textMuted,
                    fontSize: "11.5px",
                    fontWeight: 600,
                    cursor: isLoading ? "not-allowed" : "pointer",
                  }}
                >
                  {showPassword ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              data-testid="btn-login-submit"
              disabled={isLoading}
              style={{
                marginTop: "4px",
                padding: "11px 16px",
                borderRadius: rounded.DEFAULT,
                backgroundColor: colors.primary,
                color: "#041e49",
                fontSize: "14px",
                fontWeight: 700,
                border: "none",
                cursor: isLoading ? "not-allowed" : "pointer",
                opacity: isLoading ? 0.75 : 1,
                transition: "opacity 0.15s ease",
              }}
            >
              {isLoading ? "Validando Acesso..." : "Entrar no Sistema"}
            </button>
          </form>

          <div
            style={{
              marginTop: "22px",
              paddingTop: "18px",
              borderTop: `1px solid ${colors.borderSubtle}`,
            }}
          >
            <div
              style={{
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.4px",
                color: colors.textMuted,
                marginBottom: "10px",
              }}
            >
              Credenciais Rápidas de Desenvolvimento (Isolamento Multi-Tenant)
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {DEV_CREDENTIAL_PRESETS.map((preset) => {
                const isSelected = normalizedEmail === preset.email.toLowerCase();
                return (
                  <button
                    key={preset.id}
                    type="button"
                    data-testid={preset.testId}
                    disabled={isLoading}
                    onClick={() => handleQuickFill(preset)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: "3px",
                      padding: "10px 12px",
                      borderRadius: rounded.DEFAULT,
                      backgroundColor: isSelected
                        ? "rgba(168, 199, 250, 0.12)"
                        : colors.surfaceContainerLow,
                      border: `1px solid ${isSelected ? colors.primary : colors.borderSubtle}`,
                      color: colors.textPrimary,
                      textAlign: "left",
                      cursor: isLoading ? "not-allowed" : "pointer",
                      transition: "border-color 0.15s ease, background-color 0.15s ease",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        color: isSelected ? colors.primary : colors.warningPastel,
                        textTransform: "uppercase",
                        letterSpacing: "0.3px",
                      }}
                    >
                      {preset.tenantBadge}
                    </span>
                    <span style={{ fontSize: "12.5px", fontWeight: 700, color: colors.textPrimary }}>
                      {preset.tenantLabel}
                    </span>
                    <span
                      style={{
                        fontSize: "10.5px",
                        color: colors.textMuted,
                        wordBreak: "break-all",
                      }}
                    >
                      {preset.email}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ textAlign: "center", fontSize: "11px", color: colors.textMuted, lineHeight: "1.5" }}>
          🔒 Ambiente Seguro & Conformidade Resolução TSE nº 23.600 • Multi-Tenant RLS + JWT
        </div>
      </div>
    </div>
  );
}
