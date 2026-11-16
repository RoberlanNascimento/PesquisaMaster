import React, { useState } from "react";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";

interface ChangePasswordModalProps {
  readonly isOpen: boolean;
  readonly defaultEmail: string;
  readonly onClose: () => void;
  readonly onSuccess: (msg: string) => void;
}

export function ChangePasswordModal({
  isOpen,
  defaultEmail,
  onClose,
  onSuccess,
}: ChangePasswordModalProps): React.JSX.Element | null {
  const [email, setEmail] = useState(defaultEmail);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("A confirmação da nova senha não confere.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/pesquisas-tabelas/usuarios/trocar-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          senha_atual: currentPassword,
          nova_senha: newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.detail || "Não foi possível alterar a senha.");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onSuccess("Senha alterada com sucesso no banco de dados!");
      onClose();
    } catch {
      setError("Erro de conexão com a API.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "10px",
    border: `1px solid ${NOCTURNE_TOKENS.colors.borderSubtle}`,
    backgroundColor: NOCTURNE_TOKENS.colors.surfaceBase,
    color: NOCTURNE_TOKENS.colors.textPrimary,
    fontSize: "13px",
    boxSizing: "border-box",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          backgroundColor: NOCTURNE_TOKENS.colors.surfaceContainer,
          border: `1px solid ${NOCTURNE_TOKENS.colors.borderSubtle}`,
          borderRadius: "16px",
          padding: "24px",
        }}
      >
        <h3 style={{ margin: "0 0 6px", fontSize: "17px", color: NOCTURNE_TOKENS.colors.textPrimary }}>
          Trocar Própria Senha
        </h3>
        <p style={{ margin: "0 0 16px", fontSize: "12px", color: NOCTURNE_TOKENS.colors.textMuted }}>
          Atualize sua credencial de acesso na tabela <code>usuarios</code>.
        </p>

        {error && (
          <div style={{ padding: "8px 12px", borderRadius: "8px", backgroundColor: "#451a1a", color: "#fca5a5", fontSize: "12px", marginBottom: "12px" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "12px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", color: NOCTURNE_TOKENS.colors.textMuted }}>E-mail *</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", color: NOCTURNE_TOKENS.colors.textMuted }}>Senha Atual *</label>
            <input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", color: NOCTURNE_TOKENS.colors.textMuted }}>Nova Senha *</label>
            <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", color: NOCTURNE_TOKENS.colors.textMuted }}>Confirmar Nova Senha *</label>
            <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
            <button type="button" onClick={onClose} style={{ padding: "8px 14px", borderRadius: "8px", border: `1px solid ${NOCTURNE_TOKENS.colors.borderSubtle}`, background: "transparent", color: NOCTURNE_TOKENS.colors.textPrimary, cursor: "pointer" }}>
              Cancelar
            </button>
            <button type="submit" disabled={submitting} style={{ padding: "8px 16px", borderRadius: "8px", border: "none", backgroundColor: "#3b82f6", color: "#ffffff", fontWeight: 600, cursor: "pointer" }}>
              {submitting ? "Salvando..." : "Salvar Nova Senha"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
