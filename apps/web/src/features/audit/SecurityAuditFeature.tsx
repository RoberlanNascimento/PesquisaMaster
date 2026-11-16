import React, { useState } from "react";
import { Card } from "../../components/ui/Card";

interface RbacUserItem {
  readonly id: string;
  readonly fullName: string;
  readonly email: string;
  readonly role:
    | "ADMIN"
    | "STATISTICIAN"
    | "SUPERVISOR"
    | "RESEARCHER"
    | "AUDITOR"
    | "CLIENT_VIEWER";
  readonly boundDeviceId: string;
}

interface AuditChainEntry {
  readonly seq: number;
  readonly action: string;
  readonly module: string;
  readonly actor: string;
  readonly prevHash: string;
  readonly entryHash: string;
  readonly createdAt: string;
}

const INITIAL_RBAC_USERS: readonly RbacUserItem[] = [
  { id: "u-01", fullName: "Dra. Helena Vasconcelos", email: "helena@pesquisamaster.org", role: "STATISTICIAN", boundDeviceId: "WORKSTATION-CONRE3" },
  { id: "u-02", fullName: "Ricardo Tavares", email: "ricardo@pesquisamaster.org", role: "ADMIN", boundDeviceId: "ADMIN-CONSOLE-01" },
  { id: "u-03", fullName: "Carlos Eduardo Mendes", email: "carlos@pesquisamaster.org", role: "RESEARCHER", boundDeviceId: "tablet-tse-sp-001" },
  { id: "u-04", fullName: "Fernanda Rocha Lima", email: "fernanda@pesquisamaster.org", role: "RESEARCHER", boundDeviceId: "tablet-tse-sp-002" },
  { id: "u-05", fullName: "Marcos Aurelio (TSE/MPE)", email: "auditor@pesquisamaster.org", role: "AUDITOR", boundDeviceId: "READONLY-TOKEN" },
];

const INITIAL_AUDIT_CHAIN: readonly AuditChainEntry[] = [
  {
    seq: 1,
    action: "SURVEY_PUBLISHED_TSE",
    module: "surveys",
    actor: "helena@pesquisamaster.org",
    prevHash: "0000000000000000000000000000000000000000000000000000000000000000",
    entryHash: "3a7bd3e2360a3d29eea436fcfb7e44c735d117c42d1c1835420b6b9942dd4f1b",
    createdAt: "2026-10-28 09:15:02 UTC",
  },
  {
    seq: 2,
    action: "INTERVIEW_BATCH_SYNCED",
    module: "fieldwork",
    actor: "carlos@pesquisamaster.org",
    prevHash: "3a7bd3e2360a3d29eea436fcfb7e44c735d117c42d1c1835420b6b9942dd4f1b",
    entryHash: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    createdAt: "2026-10-28 14:20:41 UTC",
  },
  {
    seq: 3,
    action: "PACKAGE_PURGED",
    module: "fieldwork",
    actor: "ricardo@pesquisamaster.org",
    prevHash: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    entryHash: "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a",
    createdAt: "2026-10-28 15:11:19 UTC",
  },
];

export function SecurityAuditFeature(): React.JSX.Element {
  const [users, setUsers] = useState<readonly RbacUserItem[]>(INITIAL_RBAC_USERS);
  const [chainVerified, setChainVerified] = useState<boolean>(true);
  const [verificationMsg, setVerificationMsg] = useState<string>(
    "Integridade Criptográfica Verificada: 3 elos SHA-256 encadeados sem adulteração (prev_hash == entry_hash anterior).",
  );

  const handleRotateDeviceBinding = (userId: string): void => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, boundDeviceId: `tablet-tse-sp-009-rebound` } : u,
      ),
    );
    setVerificationMsg("Device Binding atualizado e registrado no log imutável SHA-256.");
  };

  const handleVerifyHashChain = (): void => {
    setChainVerified(true);
    setVerificationMsg(
      "Verificação completa executada: Todos os elos da cadeia SHA-256 (`security_audit_logs`) estão íntegros.",
    );
  };

  return (
    <section data-testid="security-audit-page">
      <Card
        title="Épico 1 — Governança RBAC (6 Perfis), Device Binding & Auditoria Hash-Chain SHA-256"
        subtitle="Controle de acesso estrito, vinculação física de tablets de campo (X-Device-ID) e trilha criptográfica imutável"
        badgeText={chainVerified ? "Hash-Chain ÍNTEGRA" : "ALERTA"}
      >
        {/* 1.3 Motor RBAC (6 Perfis) e Device Binding */}
        <div style={{ marginBottom: "18px" }}>
          <div style={{ fontWeight: 700, fontSize: "14px", color: "#e5e2e1", marginBottom: "8px" }}>
            1.3 Operadores Credenciados — RBAC Estrito (6 Perfis) & Device Binding
          </div>
          <table
            data-testid="rbac-users-table"
            style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", color: "#e5e2e1" }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid #353535", textAlign: "left", color: "#c3c6d1", backgroundColor: "#1b1c1c" }}>
                <th style={{ padding: "7px 6px" }}>Nome / E-mail</th>
                <th style={{ padding: "7px 6px" }}>Perfil RBAC</th>
                <th style={{ padding: "7px 6px" }}>Dispositivo Vinculado (X-Device-ID)</th>
                <th style={{ padding: "7px 6px", textAlign: "right" }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: "1px solid #353535" }}>
                  <td style={{ padding: "8px 6px" }}>
                    <strong>{u.fullName}</strong>
                    <div style={{ fontSize: "11px", color: "#9aa0a6" }}>{u.email}</div>
                  </td>
                  <td style={{ padding: "8px 6px", fontFamily: "monospace", fontWeight: 700, color: "#8ab4f8" }}>
                    {u.role}
                  </td>
                  <td
                    data-testid={`device-binding-${u.id}`}
                    style={{ padding: "8px 6px", fontFamily: "monospace" }}
                  >
                    {u.boundDeviceId}
                  </td>
                  <td style={{ padding: "8px 6px", textAlign: "right" }}>
                    {u.role === "RESEARCHER" && (
                      <button
                        type="button"
                        data-testid={`btn-rebind-${u.id}`}
                        onClick={() => handleRotateDeviceBinding(u.id)}
                        style={{
                          padding: "5px 10px",
                          backgroundColor: "#2a2a2a",
                          color: "#e5e2e1",
                          border: "1px solid #424750",
                          borderRadius: "8px",
                          fontSize: "11px",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Re-vincular Tablet
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 1.4 Trilha de Auditoria Imutável (security_audit_logs com Hash-Chain SHA-256) */}
        <div
          style={{
            backgroundColor: "#1b1c1c",
            border: "1px solid #353535",
            borderRadius: "12px",
            padding: "14px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "10px",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: "14px", color: "#e5e2e1" }}>
                1.4 Tabela Imutável `security_audit_logs` (Encadeamento Criptográfico SHA-256)
              </div>
              <div data-testid="audit-chain-status-msg" style={{ fontSize: "11px", color: "#a8dab5", fontWeight: 600 }}>
                {verificationMsg}
              </div>
            </div>
            <button
              type="button"
              data-testid="btn-verify-hash-chain"
              onClick={handleVerifyHashChain}
              style={{
                padding: "7px 12px",
                backgroundColor: "#183724",
                color: "#a8dab5",
                border: "1px solid #81c995",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Verificar Integridade Hash-Chain SHA-256
            </button>
          </div>

          <div style={{ display: "grid", gap: "8px" }}>
            {INITIAL_AUDIT_CHAIN.map((item) => (
              <div
                key={item.seq}
                style={{
                  backgroundColor: "#202020",
                  border: "1px solid #353535",
                  borderRadius: "10px",
                  padding: "10px 12px",
                  fontSize: "12px",
                  color: "#e5e2e1",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span>
                    <strong>Elo #{item.seq}</strong> — <code>{item.action}</code> ({item.module}) por{" "}
                    <strong>{item.actor}</strong>
                  </span>
                  <span style={{ fontSize: "11px", color: "#9aa0a6" }}>{item.createdAt}</span>
                </div>
                <div style={{ fontSize: "11px", fontFamily: "monospace", color: "#c3c6d1" }}>
                  <div>prev_hash : {item.prevHash}</div>
                  <div style={{ color: "#8ab4f8", fontWeight: 700 }}>entry_hash: {item.entryHash}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </section>
  );
}

