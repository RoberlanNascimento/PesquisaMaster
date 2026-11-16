import React, { useState } from "react";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";
import { useUiSessionStore } from "../../lib/store";

const { colors, rounded, typography } = NOCTURNE_TOKENS;

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
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const login = useUiSessionStore((state) => state.login);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);
    try {
      const result = await login(email, password);
      if (!result.success) {
        setErrorMsg(result.error ?? "E-mail ou senha incorretos.");
      }
    } catch {
      setErrorMsg("Falha de conexão com o servidor de autenticação.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (): void => {
    setEmail("iwcosta@gmail.com");
    setPassword("123456");
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
      <div style={{ width: "100%", maxWidth: "440px", display: "flex", flexDirection: "column", gap: "24px" }}>
        <div style={{ textAlign: "center" }}>
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
            }}
          >
            PM
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: colors.textPrimary, margin: "0 0 6px 0" }}>
            PesquisaMaster
          </h1>
          <p style={{ fontSize: "13px", color: colors.textMuted, margin: 0 }}>
            Plataforma Eleitoral, Tabulação TSE & Agregador Multi-Tenant
          </p>
        </div>

        <div
          data-testid="login-card"
          style={{
            backgroundColor: colors.surfaceContainer,
            border: `1px solid ${colors.borderSubtle}`,
            borderRadius: rounded.DEFAULT,
            padding: "28px",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
          }}
        >
          <div style={{ marginBottom: "20px" }}>
            <h2 style={{ fontSize: "17px", fontWeight: 600, color: colors.textPrimary, margin: "0 0 4px 0" }}>
              Acesso ao Sistema
            </h2>
            <p style={{ fontSize: "12.5px", color: colors.textMuted, margin: 0 }}>
              Identifique-se para garantir a individualidade dos seus dados eleitorais.
            </p>
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
                marginBottom: "18px",
              }}
            >
              ⚠️ {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label htmlFor="login-email" style={labelStyle}>E-mail Institucional</label>
              <input
                id="login-email"
                data-testid="input-login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="iwcosta@gmail.com"
                style={inputStyle}
              />
            </div>

            <div>
              <label htmlFor="login-password" style={labelStyle}>Senha de Acesso</label>
              <input
                id="login-password"
                data-testid="input-login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="123456"
                style={inputStyle}
              />
            </div>

            <button
              type="button"
              data-testid="btn-quick-fill-demo"
              onClick={handleQuickFill}
              style={{
                background: "none",
                border: "none",
                padding: "4px 0",
                color: colors.warningPastel,
                fontSize: "11.5px",
                textAlign: "left",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              💡 Credenciais de Teste: iwcosta@gmail.com / 123456
            </button>

            <button
              type="submit"
              data-testid="btn-login-submit"
              disabled={isLoading}
              style={{
                marginTop: "6px",
                padding: "11px 16px",
                borderRadius: rounded.DEFAULT,
                backgroundColor: colors.primary,
                color: "#041e49",
                fontSize: "14px",
                fontWeight: 700,
                border: "none",
                cursor: isLoading ? "not-allowed" : "pointer",
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? "Validando Acesso..." : "Entrar no Sistema"}
            </button>
          </form>
        </div>

        <div style={{ textAlign: "center", fontSize: "11px", color: colors.textMuted, lineHeight: "1.5" }}>
          🔒 Ambiente Seguro & Conformidade Resolução TSE nº 23.600 • Multi-Tenant
        </div>
      </div>
    </div>
  );
}
