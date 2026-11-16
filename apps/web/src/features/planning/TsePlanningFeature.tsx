import React, { useState } from "react";
import { Card } from "../../components/ui/Card";
import {
  INITIAL_DYNAMIC_QUESTIONS,
  INITIAL_HARE_NIEMEYER_QUOTAS,
  INITIAL_PLANNED_SURVEYS,
  type PlannedSurveyItem,
} from "./tsePlanningData";

const STATUS_STYLE: Record<
  PlannedSurveyItem["status"],
  { readonly bg: string; readonly color: string; readonly label: string }
> = {
  DRAFT: { bg: "rgba(253, 214, 99, 0.14)", color: "#fdd663", label: "DRAFT (Editável)" },
  PUBLISHED_TSE: { bg: "rgba(138, 180, 248, 0.14)", color: "#8ab4f8", label: "PUBLISHED_TSE (Travado)" },
  ACTIVE_FIELD: { bg: "#183724", color: "#a8dab5", label: "ACTIVE_FIELD (Em Campo)" },
  CONCLUDED: { bg: "#2a2a2a", color: "#9aa0a6", label: "CONCLUDED" },
};

export function TsePlanningFeature(): React.JSX.Element {
  const [surveys, setSurveys] = useState<readonly PlannedSurveyItem[]>(INITIAL_PLANNED_SURVEYS);
  const [questions, setQuestions] = useState(INITIAL_DYNAMIC_QUESTIONS);
  const [quotas] = useState(INITIAL_HARE_NIEMEYER_QUOTAS);
  const [newQuestionCode, setNewQuestionCode] = useState<string>("");
  const [newQuestionPrompt, setNewQuestionPrompt] = useState<string>("");
  const [planningToast, setPlanningToast] = useState<string | null>(null);

  const handleLockSurveyTse = (surveyId: string): void => {
    setSurveys((prev) =>
      prev.map((s) =>
        s.id === surveyId && s.status === "DRAFT" ? { ...s, status: "PUBLISHED_TSE" } : s,
      ),
    );
    setPlanningToast(
      "Pesquisa publicada no PesqEle TSE (Status PUBLISHED_TSE — trava de imutabilidade ativada).",
    );
  };

  const handleAddQuestion = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (!newQuestionCode.trim() || !newQuestionPrompt.trim()) return;
    setQuestions((prev) => [
      ...prev,
      {
        code: newQuestionCode.trim().toUpperCase(),
        type: "STIMULATED_DISC",
        prompt: newQuestionPrompt.trim(),
        rotateDisc: true,
        skipLogicRule: "ANCORAR_BRANCO_NS_FIM",
      },
    ]);
    setNewQuestionCode("");
    setNewQuestionPrompt("");
    setPlanningToast("Quesito adicionado ao motor dinâmico com rodízio de disco TSE.");
  };

  const totalAllocatedQuotas = quotas.reduce((acc, q) => acc + q.finalTargetCount, 0);

  return (
    <section data-testid="tse-planning-page">
      <Card
        title="Épico 2 — Planejamento Amostral TSE (PesqEle), Questionários Dinâmicos & Cotas Hare-Niemeyer"
        subtitle="Gestão de metadados obrigatórios CONRE/TSE, travamento de imutabilidade, Skip Logic e alocação exata de Maiores Restos"
        badgeText={`Soma Exata Hare-Niemeyer: ${totalAllocatedQuotas} entrevistas`}
      >
        {planningToast && (
          <div
            data-testid="planning-toast"
            style={{ marginBottom: "14px", padding: "8px 12px", backgroundColor: "#183724", border: "1px solid #81c995", borderRadius: "12px", color: "#a8dab5", fontSize: "12px", fontWeight: 600 }}
          >
            {planningToast}
          </div>
        )}

        <div style={{ marginBottom: "18px" }}>
          <div style={{ fontWeight: 700, fontSize: "14px", color: "#e5e2e1", marginBottom: "8px" }}>
            2.1 Pesquisas Eleitorais Registradas (Metadados CONRE / PesqEle & Trava de Status)
          </div>
          <table data-testid="planned-surveys-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", color: "#e5e2e1" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #353535", textAlign: "left", color: "#c3c6d1", backgroundColor: "#1b1c1c" }}>
                <th style={{ padding: "7px 6px" }}>Protocolo TSE / Título</th>
                <th style={{ padding: "7px 6px" }}>Esfera / UF</th>
                <th style={{ padding: "7px 6px" }}>Estatístico CONRE</th>
                <th style={{ padding: "7px 6px" }}>Plano Amostral</th>
                <th style={{ padding: "7px 6px" }}>Status Imutabilidade</th>
                <th style={{ padding: "7px 6px", textAlign: "right" }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {surveys.map((srv) => {
                const st = STATUS_STYLE[srv.status];
                return (
                  <tr key={srv.id} style={{ borderBottom: "1px solid #353535" }}>
                    <td style={{ padding: "8px 6px" }}><strong>{srv.tseProtocolNumber}</strong> — {srv.title}</td>
                    <td style={{ padding: "8px 6px" }}>{srv.sphere} ({srv.targetUf})</td>
                    <td style={{ padding: "8px 6px", fontFamily: "monospace" }}>{srv.statisticianConre}</td>
                    <td style={{ padding: "8px 6px", fontFamily: "monospace" }}>N={srv.plannedSampleSize} | IC {srv.confidenceLevel}% | ±{srv.marginOfError}%</td>
                    <td style={{ padding: "8px 6px" }}>
                      <span
                        data-testid={`survey-status-${srv.id}`}
                        style={{ backgroundColor: st.bg, color: st.color, padding: "2px 8px", borderRadius: "9999px", fontWeight: 700, fontSize: "11px" }}
                      >
                        {st.label}
                      </span>
                    </td>
                    <td style={{ padding: "8px 6px", textAlign: "right" }}>
                      {srv.status === "DRAFT" ? (
                        <button
                          type="button"
                          data-testid={`btn-lock-tse-${srv.id}`}
                          onClick={() => handleLockSurveyTse(srv.id)}
                          style={{ padding: "5px 10px", backgroundColor: "#8ab4f8", color: "#003061", border: "none", borderRadius: "8px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}
                        >
                          Publicar & Travar TSE
                        </button>
                      ) : (
                        <span style={{ fontSize: "11px", color: "#9aa0a6" }}>🔒 Bloqueado</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ backgroundColor: "#1b1c1c", border: "1px solid #353535", borderRadius: "12px", padding: "14px", marginBottom: "18px" }}>
          <div style={{ fontWeight: 700, fontSize: "14px", color: "#e5e2e1", marginBottom: "8px" }}>
            2.2 Motor de Questionários Dinâmicos (Espontânea, Disco com Rodízio, Rejeição e Skip Logic)
          </div>
          <form onSubmit={handleAddQuestion} style={{ display: "flex", gap: "8px", marginBottom: "10px", flexWrap: "wrap" }}>
            <input
              data-testid="input-new-question-code"
              type="text"
              placeholder="Código (ex: Q04_AVALIACAO)"
              value={newQuestionCode}
              onChange={(e) => setNewQuestionCode(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: "8px", border: "1px solid #353535", backgroundColor: "#202020", color: "#e5e2e1", fontSize: "12px" }}
            />
            <input
              data-testid="input-new-question-prompt"
              type="text"
              placeholder="Enunciado da pergunta eleitoral..."
              value={newQuestionPrompt}
              onChange={(e) => setNewQuestionPrompt(e.target.value)}
              style={{ flex: 1, padding: "6px 10px", borderRadius: "8px", border: "1px solid #353535", backgroundColor: "#202020", color: "#e5e2e1", fontSize: "12px" }}
            />
            <button
              type="submit"
              data-testid="btn-add-question"
              style={{ padding: "6px 12px", backgroundColor: "#8ab4f8", color: "#003061", border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
            >
              + Adicionar Quesito
            </button>
          </form>

          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "6px", fontSize: "12px" }}>
            {questions.map((q) => (
              <li
                key={q.code}
                style={{ backgroundColor: "#202020", border: "1px solid #353535", borderRadius: "8px", padding: "8px 10px", display: "flex", justifyContent: "space-between", color: "#e5e2e1" }}
              >
                <span><strong>{q.code}</strong> [{q.type}] — {q.prompt}</span>
                <span style={{ fontFamily: "monospace", fontSize: "11px", color: "#8ab4f8" }}>
                  Rodízio: {q.rotateDisc ? "SIM" : "NÃO"} | Regra: {q.skipLogicRule}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div style={{ fontWeight: 700, fontSize: "14px", color: "#e5e2e1", marginBottom: "8px" }}>
            2.3 & 2.4 Alocação Inteira de Cotas (Método dos Maiores Restos de Hare-Niemeyer) & Pesquisadores
          </div>
          <table data-testid="hare-niemeyer-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", color: "#e5e2e1" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #353535", textAlign: "left", color: "#c3c6d1", backgroundColor: "#1b1c1c" }}>
                <th style={{ padding: "7px 6px" }}>Estrato / Setor Censitário</th>
                <th style={{ padding: "7px 6px" }}>Célula Demográfica</th>
                <th style={{ padding: "7px 6px" }}>Peso Pop. (%)</th>
                <th style={{ padding: "7px 6px" }}>Cota Exata / Resto</th>
                <th style={{ padding: "7px 6px" }}>Cota Inteira Final</th>
                <th style={{ padding: "7px 6px" }}>Pesquisador Designado</th>
              </tr>
            </thead>
            <tbody>
              {quotas.map((q) => (
                <tr key={q.id} style={{ borderBottom: "1px solid #353535" }}>
                  <td style={{ padding: "8px 6px", fontWeight: 600 }}>{q.stratumLabel}</td>
                  <td style={{ padding: "8px 6px" }}>{q.demographicLabel}</td>
                  <td style={{ padding: "8px 6px", fontFamily: "monospace" }}>{q.populationWeightPct}%</td>
                  <td style={{ padding: "8px 6px", fontFamily: "monospace" }}>{q.exactQuotaDecimal} (Resto: {q.remainderDecimal})</td>
                  <td style={{ padding: "8px 6px", fontFamily: "monospace", fontWeight: 700, color: "#a8dab5" }}>{q.finalTargetCount}</td>
                  <td style={{ padding: "8px 6px", fontSize: "11px" }}>{q.assignedResearcher}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}
