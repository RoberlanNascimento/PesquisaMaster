import React, { useState } from "react";
import type { QuestionnaireItem } from "./questionnairesData";

export interface BranchingRuleItem {
  readonly id: string;
  readonly sourceQuestionCode: string;
  readonly operator: "EQUALS" | "NOT_EQUALS" | "CONTAINS";
  readonly triggerOption: string;
  readonly actionType: "JUMP_TO" | "END_INTERVIEW";
  readonly targetQuestionCode: string;
}

const INITIAL_BRANCHING_RULES: readonly BranchingRuleItem[] = [
  { id: "br-01", sourceQuestionCode: "P02", operator: "EQUALS", triggerOption: "Indeciso / NS", actionType: "JUMP_TO", targetQuestionCode: "P03" },
  { id: "br-02", sourceQuestionCode: "P03", operator: "EQUALS", triggerOption: "Branco / Nulo", actionType: "JUMP_TO", targetQuestionCode: "P05" },
  { id: "br-03", sourceQuestionCode: "P01", operator: "NOT_EQUALS", triggerOption: "16 a 24 anos", actionType: "JUMP_TO", targetQuestionCode: "P02" },
];

const SELECT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: "6px",
  border: "1px solid #cbd5e1",
  fontSize: "12px",
  backgroundColor: "#ffffff",
  boxSizing: "border-box",
};

const LBL_STYLE: React.CSSProperties = {
  display: "block",
  fontSize: "11px",
  fontWeight: 700,
  marginBottom: "4px",
};

export function QuestionnaireBranchingSubscreen({
  questions,
}: {
  readonly questions: readonly QuestionnaireItem[];
}): React.JSX.Element {
  const [rules, setRules] = useState<readonly BranchingRuleItem[]>(INITIAL_BRANCHING_RULES);
  const [sourceCode, setSourceCode] = useState<string>(questions[0]?.code ?? "P01");
  const [operator, setOperator] = useState<"EQUALS" | "NOT_EQUALS" | "CONTAINS">("EQUALS");
  const [triggerOpt, setTriggerOpt] = useState<string>("Não sabe / Não respondeu");
  const [actionType, setActionType] = useState<"JUMP_TO" | "END_INTERVIEW">("JUMP_TO");
  const [targetCode, setTargetCode] = useState<string>(questions[3]?.code ?? "P04");
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleAddRule = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!triggerOpt.trim()) return;
    const newRule: BranchingRuleItem = {
      id: `br-${Date.now()}`,
      sourceQuestionCode: sourceCode,
      operator,
      triggerOption: triggerOpt.trim(),
      actionType,
      targetQuestionCode: actionType === "END_INTERVIEW" ? "FIM" : targetCode,
    };
    setRules((prev) => [...prev, newRule]);
    setFeedback(`✓ Regra condicional adicionada: Se ${sourceCode} → ${newRule.targetQuestionCode}`);
  };

  const handleRemoveRule = (id: string): void => {
    setRules((prev) => prev.filter((r) => r.id !== id));
    setFeedback("Regra condicional removida do fluxo.");
  };

  return (
    <div
      data-testid="questionnaire-branching-editor"
      style={{ backgroundColor: "#202020", border: "1px solid #353535", borderRadius: "16px", padding: "20px" }}
    >
      <div style={{ marginBottom: "16px", borderBottom: "1px solid #353535", paddingBottom: "12px" }}>
        <h2 style={{ margin: 0, fontSize: "17px", color: "#e5e2e1" }}>
          🔀 Editor Visual de Lógica de Salto (Branching / Skip Logic)
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#9aa0a6" }}>
          Configure desvios condicionais (Se / Então) entre os quesitos para guiar automaticamente o tablet do entrevistador em campo.
        </p>
      </div>

      {feedback && (
        <div
          data-testid="branching-feedback"
          style={{ padding: "8px 12px", backgroundColor: "#183724", color: "#a8dab5", border: "1px solid rgba(129, 201, 149, 0.3)", borderRadius: "10px", fontSize: "12px", fontWeight: 600, marginBottom: "14px" }}
        >
          {feedback}
        </div>
      )}

      <form
        onSubmit={handleAddRule}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "10px",
          backgroundColor: "#1b1c1c",
          padding: "14px",
          borderRadius: "12px",
          border: "1px solid #353535",
          marginBottom: "18px",
          alignItems: "end",
        }}
      >
        <div>
          <label style={LBL_STYLE}>Se a Pergunta Origem</label>
          <select data-testid="branch-select-source" value={sourceCode} onChange={(e) => setSourceCode(e.target.value)} style={SELECT_STYLE}>
            {questions.map((q) => (
              <option key={q.id} value={q.code}>
                {q.code} — {q.text.slice(0, 28)}...
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={LBL_STYLE}>Operador Lógico</label>
          <select
            data-testid="branch-select-operator"
            value={operator}
            onChange={(e) => setOperator(e.target.value as "EQUALS" | "NOT_EQUALS" | "CONTAINS")}
            style={SELECT_STYLE}
          >
            <option value="EQUALS">For Igual a (=)</option>
            <option value="NOT_EQUALS">For Diferente de (≠)</option>
            <option value="CONTAINS">Contiver o Termo</option>
          </select>
        </div>

        <div>
          <label style={LBL_STYLE}>Resposta Gatilho</label>
          <input data-testid="branch-input-trigger" type="text" value={triggerOpt} onChange={(e) => setTriggerOpt(e.target.value)} placeholder="Ex: Não sabe" style={SELECT_STYLE} />
        </div>

        <div>
          <label style={LBL_STYLE}>Ação de Desvio</label>
          <select data-testid="branch-select-action" value={actionType} onChange={(e) => setActionType(e.target.value as "JUMP_TO" | "END_INTERVIEW")} style={SELECT_STYLE}>
            <option value="JUMP_TO">Pular para Pergunta</option>
            <option value="END_INTERVIEW">Encerrar Entrevista</option>
          </select>
        </div>

        {actionType === "JUMP_TO" && (
          <div>
            <label style={LBL_STYLE}>Pergunta Destino</label>
            <select data-testid="branch-select-target" value={targetCode} onChange={(e) => setTargetCode(e.target.value)} style={SELECT_STYLE}>
              {questions.map((q) => (
                <option key={q.id} value={q.code}>
                  {q.code} — {q.text.slice(0, 28)}...
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          type="submit"
          data-testid="btn-add-branching-rule"
          style={{ padding: "8px 14px", backgroundColor: "#8ab4f8", color: "#003061", border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "12px", cursor: "pointer" }}
        >
          + Adicionar Regra
        </button>
      </form>

      <div style={{ display: "grid", gap: "8px" }}>
        {rules.map((r, index) => (
          <div
            key={r.id}
            data-testid={`branch-rule-row-${index}`}
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", backgroundColor: "#1b1c1c", border: "1px solid #353535", borderRadius: "10px", fontSize: "13px" }}
          >
            <div>
              <span style={{ fontWeight: 700, color: "#8ab4f8" }}>SE [{r.sourceQuestionCode}]</span>{" "}
              <span style={{ color: "#c3c6d1" }}>
                {r.operator === "EQUALS" ? "for igual a" : r.operator === "NOT_EQUALS" ? "for diferente de" : "contiver"}
              </span>{" "}
              <strong style={{ backgroundColor: "#2a2a2a", color: "#fdd663", padding: "2px 6px", borderRadius: "4px" }}>
                "{r.triggerOption}"
              </strong>{" "}
              <span style={{ fontWeight: 700, color: "#81c995", marginLeft: "6px" }}>
                ➔ {r.actionType === "END_INTERVIEW" ? "ENCERRAR ENTREVISTA" : `PULAR PARA [${r.targetQuestionCode}]`}
              </span>
            </div>
            <button
              type="button"
              data-testid={`btn-delete-branch-${r.id}`}
              onClick={() => handleRemoveRule(r.id)}
              style={{ padding: "4px 10px", backgroundColor: "#93000a", color: "#ffdad6", border: "none", borderRadius: "6px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}
            >
              🗑️ Remover
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
