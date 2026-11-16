import React, { useMemo, useState } from "react";
import { Card } from "../../components/ui/Card";
import { OfficeSectionCard } from "./OverviewCharts";
import { OVERVIEW_SURVEYS_CATALOG } from "./overviewData";
import { ExecutiveDossierModal } from "./ExecutiveDossierModal";

export function Dashboard(): React.JSX.Element {
  const [selectedDate, setSelectedDate] = useState<string>("ALL");
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>(
    OVERVIEW_SURVEYS_CATALOG[0]?.id ?? "",
  );
  const [dossierOpen, setDossierOpen] = useState<boolean>(false);

  const availableDates = useMemo(
    () => Array.from(new Set(OVERVIEW_SURVEYS_CATALOG.map((s) => s.surveyDate))),
    [],
  );

  const filteredSurveys = useMemo(
    () =>
      selectedDate === "ALL"
        ? OVERVIEW_SURVEYS_CATALOG
        : OVERVIEW_SURVEYS_CATALOG.filter((s) => s.surveyDate === selectedDate),
    [selectedDate],
  );

  const activeSurvey = useMemo(
    () =>
      filteredSurveys.find((s) => s.id === selectedSurveyId) ??
      filteredSurveys[0] ??
      OVERVIEW_SURVEYS_CATALOG[0],
    [filteredSurveys, selectedSurveyId],
  );

  const handleDateChange = (newDate: string): void => {
    setSelectedDate(newDate);
    const matching =
      newDate === "ALL"
        ? OVERVIEW_SURVEYS_CATALOG
        : OVERVIEW_SURVEYS_CATALOG.filter((s) => s.surveyDate === newDate);
    if (matching[0]) {
      setSelectedSurveyId(matching[0].id);
    }
  };

  return (
    <section data-testid="integrated-overview-page">
      <Card
        title="Dashboard - Pesquisas Eleitorais"
        subtitle="Selecione a data de campo e o nome da pesquisa registrada no TSE para visualizar os gráficos de todos os cargos pesquisados"
        badgeText={activeSurvey ? `Protocolo ${activeSurvey.protocolTse}` : undefined}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "16px",
            alignItems: "end",
          }}
        >
          <div>
            <label
              htmlFor="select-survey-date"
              style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "6px" }}
            >
              Filtrar por Data da Pesquisa
            </label>
            <select
              id="select-survey-date"
              data-testid="select-survey-date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                backgroundColor: "#ffffff",
              }}
            >
              <option value="ALL">Todas as Datas ({availableDates.length} rodadas)</option>
              {availableDates.map((dt) => (
                <option key={dt} value={dt}>
                  {dt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="select-survey-name"
              style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "6px" }}
            >
              Escolher Nome da Pesquisa (Protocolo TSE)
            </label>
            <select
              id="select-survey-name"
              data-testid="select-survey-name"
              value={activeSurvey?.id ?? ""}
              onChange={(e) => setSelectedSurveyId(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                backgroundColor: "#ffffff",
              }}
            >
              {filteredSurveys.map((srv) => (
                <option key={srv.id} value={srv.id}>
                  {srv.surveyName} [{srv.protocolTse}]
                </option>
              ))}
            </select>
          </div>
        </div>

        {activeSurvey && (
          <div
            style={{
              marginTop: "14px",
              paddingTop: "12px",
              borderTop: "1px solid #353535",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "16px",
              flexWrap: "wrap",
              fontSize: "12px",
              color: "#c3c6d1",
            }}
          >
            <div style={{ display: "flex", gap: "18px", flexWrap: "wrap" }}>
              <span>
                <strong>Pesquisa Selecionada:</strong> {activeSurvey.surveyName}
              </span>
              <span>
                <strong>Data de Campo:</strong> {activeSurvey.surveyDate}
              </span>
              <span>
                <strong>Amostra (N):</strong> {activeSurvey.sampleSize} eleitores
              </span>
              <span>
                <strong>Margem de Erro:</strong> ±{activeSurvey.marginOfError}%
              </span>
              <span>
                <strong>Cargos Pesquisados:</strong> {activeSurvey.offices.length}
              </span>
            </div>

            <button
              type="button"
              data-testid="btn-generate-executive-pdf"
              onClick={() => setDossierOpen(true)}
              style={{
                padding: "9px 16px",
                backgroundColor: "#8ab4f8",
                color: "#003061",
                border: "none",
                borderRadius: "10px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              📄 Gerar Dossiê Executivo PDF (TSE)
            </button>
          </div>
        )}
      </Card>

      {activeSurvey?.offices.map((office) => (
        <OfficeSectionCard key={office.officeCode} office={office} />
      ))}

      {dossierOpen && activeSurvey && (
        <ExecutiveDossierModal
          survey={activeSurvey}
          onClose={() => setDossierOpen(false)}
        />
      )}
    </section>
  );
}

export { Dashboard as IntegratedOverviewFeature };

