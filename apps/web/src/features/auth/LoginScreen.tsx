import React, { useState } from "react";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";

interface LoginScreenProps {
  readonly onLoginSuccess: (user: {
    id_usuario: number;
    id_organizacao: number;
    full_name: string;
    email: string;
    role: string;
    nome_organizacao?: string;
    plano_assinatura?: string;
  }) => void;
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps): React.JSX.Element {
  const [email, setEmail] = useState("iscosta@gmail.com");
  const [senha, setSenha] = useState("123456");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), senha }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.detail || "E-mail ou senha inválidos.");
        return;
      }
      if (data.access_token) {
        localStorage.setItem("pm_auth_token", data.access_token);
      }
      onLoginSuccess(data.user);
    } catch {
      setError("Não foi possível conectar ao servidor de autenticação (http://127.0.0.1:8000).");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: NOCTURNE_TOKENS.colors.surfaceBase,
        color: NOCTURNE_TOKENS.colors.textPrimary,
        fontFamily: NOCTURNE_TOKENS.typography.fontFamily,
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          backgroundColor: NOCTURNE_TOKENS.colors.surfaceContainer,
          border: `1px solid ${NOCTURNE_TOKENS.colors.borderSubtle}`,
          borderRadius: "16px",
          padding: "32px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.45)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "15px",
              color: "#ffffff",
            }}
          >
            PM
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 700 }}>PesquisaMaster SaaS</h1>
            <p style={{ margin: 0, fontSize: "12px", color: NOCTURNE_TOKENS.colors.textMuted }}>
              Autenticação Segura PostgreSQL (RLS + JWT)
            </p>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: "10px 12px",
              borderRadius: "10px",
              backgroundColor: "#451a1a",
              color: "#fca5a5",
              fontSize: "12px",
              marginBottom: "16px",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "14px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", marginBottom: "6px", color: NOCTURNE_TOKENS.colors.textMuted }}>
              E-mail Corporativo
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@dataopinion.com.br"
              style={{
                width: "100%",
                padding: "11px 12px",
                borderRadius: "10px",
                border: `1px solid ${NOCTURNE_TOKENS.colors.borderSubtle}`,
                backgroundColor: NOCTURNE_TOKENS.colors.surfaceBase,
                color: NOCTURNE_TOKENS.colors.textPrimary,
                fontSize: "14px",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", marginBottom: "6px", color: NOCTURNE_TOKENS.colors.textMuted }}>
              Senha
            </label>
            <input
              type="password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              style={{
                width: "100%",
                padding: "11px 12px",
                borderRadius: "10px",
                border: `1px solid ${NOCTURNE_TOKENS.colors.borderSubtle}`,
                backgroundColor: NOCTURNE_TOKENS.colors.surfaceBase,
                color: NOCTURNE_TOKENS.colors.textPrimary,
                fontSize: "14px",
                boxSizing: "border-box",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: "6px",
              padding: "12px",
              borderRadius: "10px",
              border: "none",
              backgroundColor: "#3b82f6",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 700,
              cursor: loading ? "wait" : "pointer",
            }}
          >
            {loading ? "Autenticando..." : "Entrar na Plataforma"}
          </button>
        </form>
      </div>
    </div>
  );
}

