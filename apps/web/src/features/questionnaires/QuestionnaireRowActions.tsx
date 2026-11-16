import React from "react";
import type { QuestionnaireItem } from "./questionnairesData";

const BTN_BASE: React.CSSProperties = {
  padding: "4px 8px",
  fontSize: "11px",
  fontWeight: 600,
  borderRadius: "4px",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  lineHeight: "1",
};

export function QuestionnaireRowActions({
  question,
  index,
  total,
  isLocked,
  onReorder,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  readonly question: QuestionnaireItem;
  readonly index: number;
  readonly total: number;
  readonly isLocked: boolean;
  readonly onReorder: (idx: number, dir: -1 | 1) => void;
  readonly onEdit: (q: QuestionnaireItem) => void;
  readonly onDuplicate: (q: QuestionnaireItem) => void;
  readonly onDelete: (q: QuestionnaireItem) => void;
}): React.JSX.Element {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "nowrap" }}>
      {/* Botões de Reordenação ⬆️ / ⬇️ */}
      <button
        type="button"
        title="Mover pergunta para cima"
        disabled={index === 0 || isLocked}
        data-testid={`btn-reorder-up-${question.code}`}
        onClick={() => onReorder(index, -1)}
        style={{
          ...BTN_BASE,
          border: "1px solid #353535",
          backgroundColor: "#2a2a2a",
          color: "#e5e2e1",
          opacity: index === 0 || isLocked ? 0.4 : 1,
          cursor: index === 0 || isLocked ? "not-allowed" : "pointer",
        }}
      >
        ⬆️
      </button>

      <button
        type="button"
        title="Mover pergunta para baixo"
        disabled={index === total - 1 || isLocked}
        data-testid={`btn-reorder-down-${question.code}`}
        onClick={() => onReorder(index, 1)}
        style={{
          ...BTN_BASE,
          border: "1px solid #353535",
          backgroundColor: "#2a2a2a",
          color: "#e5e2e1",
          opacity: index === total - 1 || isLocked ? 0.4 : 1,
          cursor: index === total - 1 || isLocked ? "not-allowed" : "pointer",
        }}
      >
        ⬇️
      </button>

      {/* Botão Editar Pergunta / Opções */}
      <button
        type="button"
        title="Editar Enunciado, Opções e Regras"
        disabled={isLocked}
        data-testid={`btn-edit-question-${question.code}`}
        onClick={() => onEdit(question)}
        style={{
          ...BTN_BASE,
          border: "1px solid #fde293",
          backgroundColor: "#3b2e08",
          color: "#fde293",
          opacity: isLocked ? 0.5 : 1,
          cursor: isLocked ? "not-allowed" : "pointer",
        }}
      >
        ✏️ Editar
      </button>

      {/* Botão Duplicar Pergunta */}
      <button
        type="button"
        title="Duplicar esta pergunta para novo cenário"
        disabled={isLocked}
        data-testid={`btn-duplicate-question-${question.code}`}
        onClick={() => onDuplicate(question)}
        style={{
          ...BTN_BASE,
          border: "1px solid #353535",
          backgroundColor: "#202020",
          color: "#c3c6d1",
          opacity: isLocked ? 0.5 : 1,
          cursor: isLocked ? "not-allowed" : "pointer",
        }}
      >
        📋 Clonar
      </button>

      {/* Botão Remover Pergunta (Bloqueado se em campo) */}
      <button
        type="button"
        title={isLocked ? "Bloqueado: Pesquisa já em campo" : "Excluir pergunta do questionário"}
        disabled={isLocked}
        data-testid={`btn-delete-question-${question.code}`}
        onClick={() => onDelete(question)}
        style={{
          ...BTN_BASE,
          border: "none",
          backgroundColor: isLocked ? "#353535" : "#f28b82",
          color: isLocked ? "#9aa0a6" : "#690005",
          opacity: isLocked ? 0.5 : 1,
          cursor: isLocked ? "not-allowed" : "pointer",
        }}
      >
        🚫 Excluir
      </button>
    </div>
  );
}

