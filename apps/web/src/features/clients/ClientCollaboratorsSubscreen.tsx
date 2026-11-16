import React, { useMemo, useState } from "react";
import { type CollaboratorRole, useUiSessionStore } from "../../lib/store";
import { INPUT_STYLE, LABEL_STYLE, ROLE_CONFIG } from "./collaboratorConfig";

export function ClientCollaboratorsSubscreen(): React.JSX.Element {
  const clientCompanies = useUiSessionStore((state) => state.clientCompanies);
  const collaborators = useUiSessionStore((state) => state.clientCollaborators);
  const addCollaborator = useUiSessionStore((state) => state.addClientCollaborator);

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(clientCompanies[0]?.id ?? "comp-001");
  const [roleFilter, setRoleFilter] = useState<CollaboratorRole | "ALL">("ALL");
  const [fullName, setFullName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [cpf, setCpf] = useState<string>("");
  const [role, setRole] = useState<CollaboratorRole>("ESTATISTICO");
  const [credentialOrDevice, setCredentialOrDevice] = useState<string>("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const filteredCollaborators = useMemo(
    () => collaborators.filter((c) => roleFilter === "ALL" || c.role === roleFilter),
    [collaborators, roleFilter],
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      setFeedback("Informe ao menos o Nome Completo e o E-mail do colaborador.");
      return;
    }

    const company = clientCompanies.find((c) => c.id === selectedCompanyId) ?? clientCompanies[0];
    addCollaborator({
      companyId: company?.id ?? "comp-001",
      companyName: company?.corporateName ?? "Empresa Cliente",
      fullName: fullName.trim(),
      email: email.trim(),
      cpf: cpf.trim() || "000.000.000-00",
      role,
      credentialOrDevice: credentialOrDevice.trim() || ROLE_CONFIG[role].hint.replace(/^.*ex:\s*|\)$/g, ""),
    });

    setFullName("");
    setEmail("");
    setCpf("");
    setCredentialOrDevice("");
    setFeedback(`Colaborador (${ROLE_CONFIG[role].label}) cadastrado e vinculado à empresa ${company?.tradeName ?? "cliente"}.`);
    setIsModalOpen(false);
  };

  return (
    <div data-testid="client-collaborators-subscreen">
      {isModalOpen && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1200, padding: "16px" }}>
          <div style={{ width: "100%", maxWidth: "680px", backgroundColor: "#1b1c1c", border: "1px solid #353535", borderRadius: "16px", padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "16px", color: "#e5e2e1" }}>+ Adicionar Colaborador</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} style={{ background: "transparent", border: "none", color: "#9aa0a6", fontSize: "18px", cursor: "pointer" }}>×</button>
            </div>
            <form
              data-testid="form-client-collaborator"
              onSubmit={handleSubmit}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                gap: "12px",
              }}
            >
        <div>
          <label style={LABEL_STYLE}>Empresa Cliente Vinculada</label>
          <select
            data-testid="select-collab-company"
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            style={{ ...INPUT_STYLE, backgroundColor: "#ffffff" }}
          >
            {clientCompanies.map((comp) => (
              <option key={comp.id} value={comp.id}>{comp.corporateName} ({comp.cnpj})</option>
            ))}
          </select>
        </div>

        <div>
          <label style={LABEL_STYLE}>Função / Perfil do Colaborador *</label>
          <select
            data-testid="select-collab-role"
            value={role}
            onChange={(e) => setRole(e.target.value as CollaboratorRole)}
            style={{ ...INPUT_STYLE, backgroundColor: "#ffffff" }}
          >
            <option value="ESTATISTICO">Estatístico (Responsável CONRE)</option>
            <option value="PESQUISADOR">Pesquisador de Campo</option>
            <option value="AUDITOR">Auditor / Fiscal</option>
            <option value="ADMINISTRADOR">Administrador</option>
          </select>
        </div>

        <div>
          <label style={LABEL_STYLE}>Nome Completo *</label>
          <input
            data-testid="input-collab-name"
            type="text"
            placeholder="Ex: Dr. Paulo Henrique Silva"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            style={INPUT_STYLE}
          />
        </div>

        <div>
          <label style={LABEL_STYLE}>E-mail de Acesso *</label>
          <input
            data-testid="input-collab-email"
            type="email"
            placeholder="colaborador@cliente.com.br"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={INPUT_STYLE}
          />
        </div>

        <div>
          <label style={LABEL_STYLE}>CPF</label>
          <input
            data-testid="input-collab-cpf"
            type="text"
            placeholder="000.000.000-00"
            value={cpf}
            onChange={(e) => setCpf(e.target.value)}
            style={INPUT_STYLE}
          />
        </div>

        <div>
          <label style={LABEL_STYLE}>Registro CONRE / ID Tablet / Credencial</label>
          <input
            data-testid="input-collab-credential"
            type="text"
            placeholder={ROLE_CONFIG[role].hint}
            value={credentialOrDevice}
            onChange={(e) => setCredentialOrDevice(e.target.value)}
            style={INPUT_STYLE}
          />
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", gap: "8px" }}>
          <button
            type="button"
            onClick={() => setIsModalOpen(false)}
            style={{ padding: "10px 14px", borderRadius: "10px", border: "1px solid #353535", backgroundColor: "transparent", color: "#e5e2e1", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            data-testid="btn-submit-collaborator"
            style={{ flex: 1, padding: "10px 14px", borderRadius: "10px", border: "none", backgroundColor: "#8ab4f8", color: "#003061", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}
          >
            + Cadastrar Colaborador
          </button>
        </div>
      </form>
          </div>
        </div>
      )}

      {feedback && (
        <div
          data-testid="collab-feedback-msg"
          style={{ marginBottom: "14px", padding: "10px 14px", borderRadius: "12px", backgroundColor: "#183724", color: "#a8dab5", fontSize: "12px", fontWeight: 600, border: "1px solid rgba(129, 201, 149, 0.3)" }}
        >
          {feedback}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
        <div style={{ fontSize: "13px", fontWeight: 700, color: "#e5e2e1" }}>
          Quadro de Colaboradores Vinculados ({filteredCollaborators.length})
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <select
            data-testid="filter-collab-role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as CollaboratorRole | "ALL")}
            style={{ padding: "6px 10px", borderRadius: "8px", border: "1px solid #353535", fontSize: "12px", backgroundColor: "#202020", color: "#e5e2e1" }}
          >
            <option value="ALL">Filtrar Perfil: Todos ({collaborators.length})</option>
            <option value="ESTATISTICO">Estatísticos</option>
            <option value="PESQUISADOR">Pesquisadores</option>
            <option value="AUDITOR">Auditores</option>
            <option value="ADMINISTRADOR">Administradores</option>
          </select>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            style={{ padding: "7px 14px", borderRadius: "8px", border: "none", backgroundColor: "#8ab4f8", color: "#003061", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}
          >
            + Adicionar Colaborador
          </button>
        </div>
      </div>

      <table data-testid="collaborators-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", color: "#e5e2e1" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #353535", textAlign: "left", color: "#9aa0a6" }}>
            <th style={{ padding: "8px 4px" }}>Nome / E-mail</th>
            <th style={{ padding: "8px 4px" }}>Perfil / Função</th>
            <th style={{ padding: "8px 4px" }}>Empresa Cliente</th>
            <th style={{ padding: "8px 4px" }}>CPF</th>
            <th style={{ padding: "8px 4px" }}>CONRE / Dispositivo / Credencial</th>
          </tr>
        </thead>
        <tbody>
          {filteredCollaborators.map((col) => {
            const badge = ROLE_CONFIG[col.role];
            return (
              <tr key={col.id} style={{ borderBottom: "1px solid #353535" }}>
                <td style={{ padding: "8px 4px" }}>
                  <strong>{col.fullName}</strong>
                  <div style={{ fontSize: "11px", color: "#9aa0a6" }}>{col.email}</div>
                </td>
                <td style={{ padding: "8px 4px" }}>
                  <span style={{ backgroundColor: badge.bg, color: badge.color, padding: "2px 8px", borderRadius: "9999px", fontSize: "11px", fontWeight: 700 }}>
                    {badge.label}
                  </span>
                </td>
                <td style={{ padding: "8px 4px" }}>{col.companyName}</td>
                <td style={{ padding: "8px 4px", fontFamily: "monospace" }}>{col.cpf}</td>
                <td style={{ padding: "8px 4px", fontFamily: "monospace", fontWeight: 600 }}>{col.credentialOrDevice}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
