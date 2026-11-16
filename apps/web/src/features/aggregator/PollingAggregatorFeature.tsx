import React, { useMemo, useState } from "react";
import { Card } from "../../components/ui/Card";
import { AggregatorTrendAndTable } from "./AggregatorTrendAndTable";
import {
  AGGREGATED_CANDIDATES_BY_HALFLIFE,
  type ExternalPollEntry,
  HISTORICAL_TREND_SERIES,
  INITIAL_EXTERNAL_POLLS,
  INITIAL_INSTITUTES,
  type InstituteCatalogEntry,
} from "./aggregatorData";

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "7px 10px",
  borderRadius: "6px",
  border: "1px solid #cbd5e1",
  fontSize: "12px",
  boxSizing: "border-box",
};

export function PollingAggregatorFeature(): React.JSX.Element {
  const [institutes] = useState<readonly InstituteCatalogEntry[]>(INITIAL_INSTITUTES);
  const [polls, setPolls] = useState<readonly ExternalPollEntry[]>(INITIAL_EXTERNAL_POLLS);
  const [halfLifeDays, setHalfLifeDays] = useState<string>("14.0000");

  // Formulário 5.1 Cadastro de Pesquisa Externa/Interna
  const [selectedInstId, setSelectedInstId] = useState<string>(INITIAL_INSTITUTES[0]?.id ?? "");
  const [protocolTse, setProtocolTse] = useState<string>("");
  const [medianDate, setMedianDate] = useState<string>("2026-10-29");
  const [sampleSize, setSampleSize] = useState<number>(2000);
  const [candAPct, setCandAPct] = useState<string>("43.2000");
  const [candBPct, setCandBPct] = useState<string>("36.1000");
  const [candCPct] = useState<string>("11.8000");
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const totalCombinedSample = useMemo(
    () => polls.reduce((acc, p) => acc + p.sampleSize, 0),
    [polls],
  );

  const activeCandidates =
    AGGREGATED_CANDIDATES_BY_HALFLIFE[halfLifeDays] ??
    AGGREGATED_CANDIDATES_BY_HALFLIFE["14.0000"] ??
    [];

  const handleRegisterPoll = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (!protocolTse.trim()) {
      setFeedbackToast("Informe o protocolo TSE (ex: BR-09123/2026) para registrar a pesquisa.");
      return;
    }
    const inst = institutes.find((i) => i.id === selectedInstId) ?? institutes[0];
    if (!inst) return;

    const newPoll: ExternalPollEntry = {
      id: `poll-${polls.length + 105}`,
      instituteName: inst.name,
      tseProtocolNumber: protocolTse.trim().toUpperCase(),
      fieldMedianDate: medianDate,
      sampleSize,
      marginOfError: "2.2000",
      methodologicalWeight: inst.methodologicalWeight,
      houseEffectAdjustment: inst.houseEffectAdjustment,
      sqrtSampleWeight: "1.0000",
      temporalDecayWeight: "1.0000",
      candAPct,
      candBPct,
      candCPct,
    };
    setPolls((prev) => [newPoll, ...prev]);
    setProtocolTse("");
    setFeedbackToast(
      `Pesquisa ${newPoll.tseProtocolNumber} (${inst.name}) incorporada ao Motor de Média Móvel Ponderada.`,
    );
  };

  return (
    <Card
      title="5.3 Painel Visual do Agregador de Pesquisas Eleitorais (Polling Aggregator)"
      subtitle={`Meia-vida Exponencial: ${halfLifeDays} dias | Pesos por √N e Correção de House Effects`}
      badgeText={`${polls.length} Pesquisas (${totalCombinedSample} entrevistas)`}
    >
      {/* 5.1 Formulário de Registro de Pesquisa Externa/Interna e Pesos de Instituto */}
      <form
        data-testid="form-register-external-poll"
        onSubmit={handleRegisterPoll}
        style={{
          backgroundColor: "#1b1c1c",
          border: "1px solid #353535",
          borderRadius: "16px",
          padding: "16px",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: "14px", color: "#e5e2e1", marginBottom: "4px" }}>
          5.1 Cadastro de Pesquisas Externas/Internas, Cenários & Pesos Metodológicos de Institutos
        </div>
        <div style={{ fontSize: "11px", color: "#9aa0a6", marginBottom: "12px" }}>
          Incorpore novas pesquisas registradas no PesqEle TSE aplicando automaticamente o rating
          metodológico e o ajuste de House Effect do instituto
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))",
            gap: "10px",
            alignItems: "end",
          }}
        >
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, marginBottom: "4px" }}>
              Instituto de Pesquisa
            </label>
            <select
              data-testid="select-poll-institute"
              value={selectedInstId}
              onChange={(e) => setSelectedInstId(e.target.value)}
              style={{ ...INPUT_STYLE, backgroundColor: "#ffffff" }}
            >
              {institutes.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name} (w={inst.methodologicalWeight} | Δ={inst.houseEffectAdjustment})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, marginBottom: "4px" }}>
              Protocolo TSE *
            </label>
            <input
              data-testid="input-poll-protocol"
              type="text"
              placeholder="Ex: BR-09123/2026"
              value={protocolTse}
              onChange={(e) => setProtocolTse(e.target.value)}
              style={INPUT_STYLE}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, marginBottom: "4px" }}>
              Data Mediana de Campo
            </label>
            <input
              data-testid="input-poll-date"
              type="date"
              value={medianDate}
              onChange={(e) => setMedianDate(e.target.value)}
              style={INPUT_STYLE}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, marginBottom: "4px" }}>
              Amostra (N)
            </label>
            <input
              data-testid="input-poll-sample"
              type="number"
              value={sampleSize}
              onChange={(e) => setSampleSize(Number(e.target.value))}
              style={INPUT_STYLE}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, marginBottom: "4px" }}>
              CAND_A (%) / CAND_B (%)
            </label>
            <div style={{ display: "flex", gap: "6px" }}>
              <input
                data-testid="input-poll-canda"
                type="text"
                value={candAPct}
                onChange={(e) => setCandAPct(e.target.value)}
                style={INPUT_STYLE}
              />
              <input
                data-testid="input-poll-candb"
                type="text"
                value={candBPct}
                onChange={(e) => setCandBPct(e.target.value)}
                style={INPUT_STYLE}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              data-testid="btn-submit-external-poll"
              style={{
                width: "100%",
                padding: "9px 12px",
                backgroundColor: "#8ab4f8",
                color: "#003061",
                border: "none",
                borderRadius: "10px",
                fontWeight: 600,
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              + Incorporar Pesquisa ao Agregador
            </button>
          </div>
        </div>
      </form>

      {feedbackToast && (
        <div
          data-testid="aggregator-feedback-toast"
          style={{
            marginTop: "12px",
            padding: "10px 14px",
            backgroundColor: "#183724",
            border: "1px solid rgba(129, 201, 149, 0.3)",
            borderRadius: "12px",
            color: "#a8dab5",
            fontSize: "12px",
            fontWeight: 600,
          }}
        >
          {feedbackToast}
        </div>
      )}

      <AggregatorTrendAndTable
        candidates={activeCandidates}
        trendSeries={HISTORICAL_TREND_SERIES}
        polls={polls}
        halfLifeDays={halfLifeDays}
        onChangeHalfLife={setHalfLifeDays}
      />
    </Card>
  );
}
