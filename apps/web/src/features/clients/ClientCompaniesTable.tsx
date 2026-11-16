import React from "react";
import type { ClientCompanyRecord } from "../../lib/store";

const ORIGIN_FUNDS_LABELS: Record<ClientCompanyRecord["tseOriginFunds"], string> = {
  RECURSOS_PROPRIOS: "Recursos Próprios",
  FUNDO_PARTIDARIO: "Fundo Partidário",
  FEFC: "Fundo Especial de Financiamento de Campanha (FEFC)",
};

export function ClientCompaniesTable({
  clientCompanies,
  onEdit,
}: {
  readonly clientCompanies: readonly ClientCompanyRecord[];
  readonly onEdit?: (company: ClientCompanyRecord) => void;
}): React.JSX.Element {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", color: "#e5e2e1" }}>
      <thead>
        <tr style={{ borderBottom: "1px solid #353535", textAlign: "left", color: "#9aa0a6" }}>
          <th style={{ padding: "8px 4px" }}>Razão Social / Fantasia</th>
          <th style={{ padding: "8px 4px" }}>CNPJ</th>
          <th style={{ padding: "8px 4px" }}>Origem Recursos TSE</th>
          <th style={{ padding: "8px 4px" }}>Representante</th>
          <th style={{ padding: "8px 4px" }}>Cidade / UF</th>
          {onEdit && <th style={{ padding: "8px 4px", textAlign: "right" }}>Ações</th>}
        </tr>
      </thead>
      <tbody>
        {clientCompanies.map((item) => (
          <tr key={item.id} style={{ borderBottom: "1px solid #353535" }}>
            <td style={{ padding: "8px 4px" }}>
              <strong>{item.corporateName}</strong>
              <div style={{ fontSize: "11px", color: "#9aa0a6" }}>{item.tradeName}</div>
            </td>
            <td style={{ padding: "8px 4px", fontFamily: "monospace" }}>{item.cnpj}</td>
            <td style={{ padding: "8px 4px" }}>{ORIGIN_FUNDS_LABELS[item.tseOriginFunds]}</td>
            <td style={{ padding: "8px 4px" }}>{item.legalRepresentative}</td>
            <td style={{ padding: "8px 4px" }}>{item.cityUf}</td>
            {onEdit && (
              <td style={{ padding: "8px 4px", textAlign: "right" }}>
                <button
                  type="button"
                  onClick={() => onEdit(item)}
                  style={{
                    padding: "5px 10px",
                    borderRadius: "8px",
                    border: "1px solid #334155",
                    backgroundColor: "#1e293b",
                    color: "#93c5fd",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  ✏️ Editar
                </button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

