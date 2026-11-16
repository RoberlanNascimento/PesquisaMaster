import React, { useState } from "react";
import type { QuestionnaireItem } from "./questionnairesData";

export function QuestionnaireSimulatorSubscreen({
  questions,
}: {
  readonly questions: readonly QuestionnaireItem[];
}): React.JSX.Element {
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
  const [rotationOffset, setRotationOffset] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const currentQ = questions[selectedQuestionIndex] ?? questions[0];

  if (!currentQ) {
    return <div>Nenhuma pergunta cadastrada para simulação.</div>;
  }

  // Aplica o deslocamento circular para simular o rodízio do disco TSE
  const rotatedOptions = [...currentQ.options];
  if (currentQ.rotationRule === "CIRCULAR_OFFSET" && rotatedOptions.length > 0) {
    for (let i = 0; i < rotationOffset % rotatedOptions.length; i++) {
      const first = rotatedOptions.shift();
      if (first) rotatedOptions.push(first);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        backgroundColor: "#202020",
        padding: "24px",
        borderRadius: "16px",
        border: "1px solid #353535",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          borderBottom: "1px solid #353535",
          paddingBottom: "16px",
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#e5e2e1" }}>
            Simulador de Aplicação e Rotação do Disco TSE
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#9aa0a6" }}>
            Teste a visualização do pesquisador em campo e verifique a neutralidade de ordem do disco
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <label style={{ fontSize: "13px", fontWeight: 600, color: "#c3c6d1" }}>Pergunta:</label>
          <select
            value={selectedQuestionIndex}
            onChange={(e) => {
              setSelectedQuestionIndex(Number(e.target.value));
              setSelectedOption(null);
            }}
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              border: "1px solid #353535",
              fontSize: "13px",
            }}
          >
            {questions.map((q, idx) => (
              <option key={q.id} value={idx}>
                {q.code} — {q.text.slice(0, 38)}...
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        style={{
          backgroundColor: "#1b1c1c",
          border: "1px solid #353535",
          borderRadius: "12px",
          padding: "20px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "#8ab4f8",
              textTransform: "uppercase",
            }}
          >
            {currentQ.code} • {currentQ.type}
          </span>
          <span style={{ fontSize: "12px", color: "#9aa0a6" }}>
            Tempo Mínimo: {currentQ.minDurationSeconds}s
          </span>
        </div>

        <h4 style={{ margin: "0 0 16px", fontSize: "16px", color: "#e5e2e1" }}>
          {currentQ.text}
        </h4>

        {currentQ.rotationRule === "CIRCULAR_OFFSET" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "16px",
              backgroundColor: "#2a2a2a",
              border: "1px solid #353535",
              padding: "10px 14px",
              borderRadius: "10px",
            }}
          >
            <span style={{ fontSize: "13px", color: "#8ab4f8" }}>
              🔄 <strong>Rodízio TSE Ativo:</strong> Offset atual = {rotationOffset} posições
            </span>
            <button
              type="button"
              onClick={() => setRotationOffset((prev) => prev + 1)}
              style={{
                padding: "5px 12px",
                fontSize: "12px",
                fontWeight: 600,
                borderRadius: "8px",
                backgroundColor: "#8ab4f8",
                color: "#003061",
                border: "none",
                cursor: "pointer",
              }}
            >
              Girar Disco (+1)
            </button>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          {rotatedOptions.map((opt, i) => {
            const isSelected = selectedOption === opt;
            return (
              <button
                key={`${opt}-${i}`}
                type="button"
                onClick={() => setSelectedOption(opt)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  gap: "10px",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  border: isSelected ? "2px solid #8ab4f8" : "1px solid #353535",
                  backgroundColor: isSelected ? "#2a2a2a" : "#202020",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: "14px",
                  fontWeight: isSelected ? 600 : 400,
                  color: isSelected ? "#8ab4f8" : "#e5e2e1",
                }}
              >
                <span
                  style={{
                    width: "22px",
                    height: "22px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: isSelected ? "#8ab4f8" : "#353535",
                    color: isSelected ? "#003061" : "#c3c6d1",
                    fontSize: "12px",
                    fontWeight: 700,
                  }}
                >
                  {i + 1}
                </span>
                {opt}
              </button>
            );
          })}
        </div>

        {selectedOption && (
          <div
            style={{
              marginTop: "16px",
              padding: "10px",
              backgroundColor: "#183724",
              color: "#a8dab5",
              border: "1px solid rgba(129, 201, 149, 0.3)",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            ✓ Resposta registrada no simulador: &quot;{selectedOption}&quot;
          </div>
        )}
      </div>
    </div>
  );
}

