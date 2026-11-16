import React, { useState } from "react";
import {
  SAAS_PLANS,
  INITIAL_INVOICES,
  type SaasPlan,
  type SaasInvoice,
} from "./saasPlansData";

export function ClientSubscriptionSubscreen(): React.JSX.Element {
  const [currentPlan, setCurrentPlan] = useState<string>("pro");
  const [invoices] = useState<readonly SaasInvoice[]>(INITIAL_INVOICES);
  const [feedback, setFeedback] = useState<string | null>(null);

  const activePlanData = SAAS_PLANS.find((p) => p.id === currentPlan) ?? SAAS_PLANS[1];

  const handleSelectPlan = (plan: SaasPlan): void => {
    setCurrentPlan(plan.id);
    setFeedback(`Plano alterado com sucesso para "${plan.name}". As novas cotas foram liberadas!`);
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <div data-testid="saas-subscription-subscreen" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {feedback && (
        <div
          data-testid="saas-feedback-toast"
          style={{
            padding: "10px 14px",
            borderRadius: "12px",
            backgroundColor: "#183724",
            color: "#a8dab5",
            fontSize: "13px",
            border: "1px solid rgba(129, 201, 149, 0.3)",
            fontWeight: 600,
          }}
        >
          {feedback}
        </div>
      )}

      {/* Cartão do Plano Atual e Métricas de Consumo */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "16px",
          backgroundColor: "#1b1c1c",
          padding: "16px",
          borderRadius: "16px",
          border: "1px solid #353535",
        }}
      >
        <div>
          <div style={{ fontSize: "12px", color: "#9aa0a6", fontWeight: 600, textTransform: "uppercase" }}>
            Assinatura SaaS Ativa
          </div>
          <div style={{ fontSize: "18px", fontWeight: 700, color: "#e5e2e1", marginTop: "4px" }}>
            {activePlanData?.name}
          </div>
          <div style={{ fontSize: "14px", color: "#8ab4f8", fontWeight: 700, marginTop: "2px" }}>
            {activePlanData?.price}
          </div>
          <div style={{ display: "inline-block", marginTop: "8px", padding: "3px 10px", backgroundColor: "#183724", color: "#a8dab5", border: "1px solid rgba(129, 201, 149, 0.3)", borderRadius: "9999px", fontSize: "11px", fontWeight: 600 }}>
            🟢 Assinatura Ativa (Renovação em 05/10/2026)
          </div>
        </div>

        {/* Consumo de Cotas */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "#c3c6d1" }}>
            Consumo de Cotas do Período:
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#9aa0a6" }}>
              <span>Pesquisas TSE Cadastradas</span>
              <strong>4 / {activePlanData?.maxSurveys ?? 10}</strong>
            </div>
            <div style={{ height: "6px", backgroundColor: "#353535", borderRadius: "9999px", overflow: "hidden", marginTop: "2px" }}>
              <div style={{ width: "40%", height: "100%", backgroundColor: "#8ab4f8" }} />
            </div>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#9aa0a6" }}>
              <span>Entrevistas Coletadas & Auditadas</span>
              <strong>8.450 / {activePlanData?.maxInterviews ?? 20000}</strong>
            </div>
            <div style={{ height: "6px", backgroundColor: "#353535", borderRadius: "9999px", overflow: "hidden", marginTop: "2px" }}>
              <div style={{ width: "42%", height: "100%", backgroundColor: "#81c995" }} />
            </div>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#9aa0a6" }}>
              <span>Tablets Vinculados (Device Binding)</span>
              <strong>14 / {activePlanData?.maxDevices ?? 25}</strong>
            </div>
            <div style={{ height: "6px", backgroundColor: "#353535", borderRadius: "9999px", overflow: "hidden", marginTop: "2px" }}>
              <div style={{ width: "56%", height: "100%", backgroundColor: "#fdd663" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Catálogo de Planos SaaS */}
      <div>
        <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#e5e2e1", marginBottom: "12px" }}>
          Opções de Planos e Upgrade de Capacidade
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px" }}>
          {SAAS_PLANS.map((plan) => {
            const isSelected = plan.id === currentPlan;
            return (
              <div
                key={plan.id}
                style={{
                  border: isSelected ? "2px solid #8ab4f8" : "1px solid #353535",
                  borderRadius: "16px",
                  padding: "16px",
                  backgroundColor: isSelected ? "#2a2a2a" : "#1b1c1c",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 700, fontSize: "14px", color: "#e5e2e1" }}>{plan.name}</span>
                    {plan.isPopular && (
                      <span style={{ fontSize: "10px", padding: "2px 8px", backgroundColor: "#8ab4f8", color: "#003061", borderRadius: "9999px", fontWeight: 600 }}>
                        Mais Usado
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: 800, color: "#8ab4f8", margin: "6px 0" }}>
                    {plan.price}
                  </div>
                  <p style={{ fontSize: "12px", color: "#9aa0a6", margin: "0 0 10px 0" }}>{plan.description}</p>
                  <ul style={{ fontSize: "12px", color: "#c3c6d1", paddingLeft: "16px", margin: 0 }}>
                    <li>Até {plan.maxSurveys === 999 ? "Ilimitadas" : plan.maxSurveys} pesquisas</li>
                    <li>Até {plan.maxInterviews.toLocaleString()} entrevistas auditadas</li>
                    <li>Até {plan.maxDevices} dispositivos vinculados</li>
                  </ul>
                </div>
                <button
                  type="button"
                  data-testid={`btn-select-plan-${plan.id}`}
                  onClick={() => handleSelectPlan(plan)}
                  disabled={isSelected}
                  style={{
                    marginTop: "14px",
                    padding: "9px 12px",
                    borderRadius: "10px",
                    border: isSelected ? "1px solid #81c995" : "none",
                    backgroundColor: isSelected ? "#183724" : "#8ab4f8",
                    color: isSelected ? "#a8dab5" : "#003061",
                    fontWeight: 600,
                    fontSize: "12px",
                    cursor: isSelected ? "default" : "pointer",
                  }}
                >
                  {isSelected ? "✓ Plano Atual" : "Selecionar Plano"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Histórico de Faturamento e Notas Fiscais */}
      <div>
        <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#e5e2e1", marginBottom: "8px" }}>
          Histórico de Faturas & Notas Fiscais (NF-e)
        </h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", color: "#e5e2e1" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #353535", textAlign: "left", color: "#9aa0a6" }}>
              <th style={{ padding: "8px" }}>Fatura</th>
              <th style={{ padding: "8px" }}>Período</th>
              <th style={{ padding: "8px" }}>Valor</th>
              <th style={{ padding: "8px" }}>Data Pagamento</th>
              <th style={{ padding: "8px" }}>Status</th>
              <th style={{ padding: "8px", textAlign: "right" }}>Ação</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} style={{ borderBottom: "1px solid #353535" }}>
                <td style={{ padding: "8px", fontWeight: 600, fontFamily: "monospace" }}>{inv.id}</td>
                <td style={{ padding: "8px" }}>{inv.period}</td>
                <td style={{ padding: "8px", fontWeight: 600 }}>{inv.amount}</td>
                <td style={{ padding: "8px", color: "#9aa0a6" }}>{inv.date}</td>
                <td style={{ padding: "8px" }}>
                  <span style={{ padding: "2px 8px", borderRadius: "9999px", backgroundColor: "#183724", color: "#a8dab5", border: "1px solid rgba(129, 201, 149, 0.3)", fontWeight: 600, fontSize: "11px" }}>
                    ✓ {inv.status}
                  </span>
                </td>
                <td style={{ padding: "8px", textAlign: "right" }}>
                  <button
                    type="button"
                    data-testid={`btn-download-nfe-${inv.id}`}
                    onClick={() => {
                      setFeedback(`Download da NF-e ${inv.id} iniciado.`);
                      setTimeout(() => setFeedback(null), 3000);
                    }}
                    style={{ padding: "5px 10px", fontSize: "11px", fontWeight: 600, border: "1px solid #353535", backgroundColor: "#2a2a2a", color: "#e5e2e1", borderRadius: "8px", cursor: "pointer" }}
                  >
                    📥 Baixar NF-e
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
