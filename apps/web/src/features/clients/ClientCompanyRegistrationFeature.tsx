import React, { useEffect, useState } from "react";
import { Card } from "../../components/ui/Card";
import { type ClientCompanyRecord, useUiSessionStore } from "../../lib/store";
import { ClientCollaboratorsSubscreen } from "./ClientCollaboratorsSubscreen";
import { ClientCompaniesTable } from "./ClientCompaniesTable";
import { ClientSubscriptionSubscreen } from "./ClientSubscriptionSubscreen";
import { OrganizationStayOnTopModal } from "./OrganizationStayOnTopModal";

type SubscreenTab = "COMPANIES" | "COLLABORATORS" | "SUBSCRIPTION";

export function ClientCompanyRegistrationFeature(): React.JSX.Element {
  const clientCompanies = useUiSessionStore((state) => state.clientCompanies);
  const collaboratorsCount = useUiSessionStore((state) => state.clientCollaborators.length);

  const [subTab, setSubTab] = useState<SubscreenTab>("COMPANIES");
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [orgModalOpen, setOrgModalOpen] = useState(false);
  const [dbCompanies, setDbCompanies] = useState<readonly ClientCompanyRecord[] | null>(null);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/v1/pesquisas-tabelas/organizacoes")
      .then((res) => (res.ok ? res.json() : []))
      .then((items: any[]) => {
        if (Array.isArray(items) && items.length > 0) {
          setDbCompanies(
            items.map((o) => ({
              id: String(o.id_organizacao),
              corporateName: o.razao_social,
              tradeName: o.nome_fantasia,
              cnpj: o.cnpj,
              tseOriginFunds: "RECURSOS_PROPRIOS",
              legalRepresentative: `Plano: ${o.plano_assinatura} (${o.status_assinatura})`,
              contactEmail: `${o.slug_subdominio}@dataopinion.com.br`,
              cityUf: `${o.limite_pesquisas_ativas} pesq / ${o.limite_entrevistas_mes} entr.`,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const displayedCompanies = dbCompanies ?? clientCompanies;

  const getTabButtonStyle = (active: boolean): React.CSSProperties => ({
    padding: "9px 16px",
    borderRadius: "9999px",
    border: active ? "1px solid #8ab4f8" : "1px solid #353535",
    backgroundColor: active ? "#8ab4f8" : "#2a2a2a",
    color: active ? "#003061" : "#e5e2e1",
    fontWeight: 600,
    fontSize: "12px",
    cursor: "pointer",
  });

  return (
    <Card
      title="Cadastro de Empresa Cliente, Colaboradores & Assinatura SaaS"
      subtitle="Qualificação obrigatória de contratantes (Art. 2º Res. TSE nº 23.600/2019), credenciamento de equipe e gestão de cotas/faturamento SaaS"
      badgeText={`${displayedCompanies.length} Contratante(s) • ${collaboratorsCount} Colaboradores`}
    >
      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "16px",
          paddingBottom: "12px",
          borderBottom: "1px solid #353535",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          data-testid="subtab-client-companies"
          onClick={() => setSubTab("COMPANIES")}
          style={getTabButtonStyle(subTab === "COMPANIES")}
        >
          1. Dados da Empresa Cliente ({displayedCompanies.length})
        </button>
        <button
          type="button"
          data-testid="subtab-client-collaborators"
          onClick={() => setSubTab("COLLABORATORS")}
          style={getTabButtonStyle(subTab === "COLLABORATORS")}
        >
          2. Colaboradores: Estatístico, Pesquisador, Auditor, Admin ({collaboratorsCount})
        </button>
        <button
          type="button"
          data-testid="subtab-client-subscription"
          onClick={() => setSubTab("SUBSCRIPTION")}
          style={getTabButtonStyle(subTab === "SUBSCRIPTION")}
        >
          3. Plano SaaS & Faturamento (Ativo)
        </button>
      </div>

      {subTab === "COLLABORATORS" && <ClientCollaboratorsSubscreen />}
      {subTab === "SUBSCRIPTION" && <ClientSubscriptionSubscreen />}
      {subTab === "COMPANIES" && (
        <>
          {feedbackMsg && (
            <div
              data-testid="client-company-feedback"
              style={{
                marginBottom: "14px",
                padding: "10px 14px",
                borderRadius: "12px",
                backgroundColor: "#183724",
                color: "#a8dab5",
                fontSize: "13px",
                border: "1px solid rgba(129, 201, 149, 0.3)",
              }}
            >
              {feedbackMsg}
            </div>
          )}

          <ClientCompaniesTable
            clientCompanies={displayedCompanies}
            onEdit={() => setOrgModalOpen(true)}
          />
        </>
      )}

      <OrganizationStayOnTopModal
        isOpen={orgModalOpen}
        onClose={() => setOrgModalOpen(false)}
        onSuccess={(msg, org) => {
          setDbCompanies([
            {
              id: String(org.id_organizacao),
              corporateName: org.razao_social,
              tradeName: org.nome_fantasia,
              cnpj: org.cnpj,
              tseOriginFunds: "RECURSOS_PROPRIOS",
              legalRepresentative: `Plano: ${org.plano_assinatura} (${org.status_assinatura})`,
              contactEmail: `${org.slug_subdominio}@dataopinion.com.br`,
              cityUf: `${org.limite_pesquisas_ativas} pesq / ${org.limite_entrevistas_mes} entr.`,
            },
          ]);
          setFeedbackMsg(msg);
          setTimeout(() => setFeedbackMsg(null), 4000);
        }}
      />
    </Card>
  );
}
