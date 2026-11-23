import React, { useState, useEffect } from "react";
import { SlideOverDrawer } from "../../components/ui/SlideOverDrawer";
import { INITIAL_SURVEYS, type SurveyRecord } from "./surveysData";
import {
  QUESTIONNAIRE_TEMPLATES,
  type SurveyCompositionRecord,
  type SurveyCompositionFormData,
} from "./surveyCompositionData";

export interface QuestionnaireOption {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly questionsCount: number;
  readonly estimatedSeconds?: number;
}

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 12px",
  borderRadius: "10px",
  border: "1px solid #353535",
  fontSize: "13px",
  backgroundColor: "#1b1c1c",
  color: "#e5e2e1",
};
const LABEL_STYLE: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  color: "#c3c6d1",
  marginBottom: "5px",
  display: "block",
};

export function SurveyCompositionDrawerForm({
  isOpen,
  onClose,
  initialData,
  surveys = INITIAL_SURVEYS,
  questionnaires = QUESTIONNAIRE_TEMPLATES,
  onSave,
}: {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly initialData?: SurveyCompositionRecord | null;
  readonly surveys?: readonly SurveyRecord[];
  readonly questionnaires?: readonly QuestionnaireOption[];
  readonly onSave: (data: SurveyCompositionFormData) => void;
}): React.JSX.Element {
  const effectiveSurveys = surveys.length > 0 ? surveys : INITIAL_SURVEYS;
  const effectiveQuestionnaires =
    questionnaires.length > 0 ? questionnaires : QUESTIONNAIRE_TEMPLATES;

  const [surveyId, setSurveyId] = useState<string>(
    initialData?.surveyId ?? effectiveSurveys[0]?.id ?? "",
  );
  const [compositionVersion, setCompositionVersion] = useState<string>(
    initialData?.compositionVersion ?? "v1.0-TSE",
  );
  const [status, setStatus] = useState<SurveyCompositionRecord["status"]>(
    initialData?.status ?? "EM_MONTAGEM",
  );
  const [selectedIds, setSelectedIds] = useState<readonly string[]>(
    initialData?.questionnaireIds ??
      effectiveQuestionnaires.slice(0, 3).map((q) => q.id),
  );
  const [pickerBlockId, setPickerBlockId] = useState<string>(
    effectiveQuestionnaires[0]?.id ?? "",
  );

  useEffect(() => {
    if (initialData) {
      setSurveyId(initialData.surveyId);
      setCompositionVersion(initialData.compositionVersion);
      setStatus(initialData.status);
      setSelectedIds(initialData.questionnaireIds);
    } else {
      setSurveyId(effectiveSurveys[0]?.id ?? "");
      setCompositionVersion("v1.0-TSE");
      setStatus("EM_MONTAGEM");
      setSelectedIds(effectiveQuestionnaires.slice(0, 3).map((q) => q.id));
    }
    setPickerBlockId(effectiveQuestionnaires[0]?.id ?? "");
  }, [initialData, isOpen, effectiveSurveys, effectiveQuestionnaires]);

  const handleAddBlock = (): void => {
    if (!pickerBlockId || selectedIds.includes(pickerBlockId)) return;
    setSelectedIds((prev) => [...prev, pickerBlockId]);
  };

  const handleToggleBlock = (blockId: string): void => {
    setSelectedIds((prev) =>
      prev.includes(blockId)
        ? prev.filter((id) => id !== blockId)
        : [...prev, blockId],
    );
  };

  const handleMove = (idx: number, dir: -1 | 1): void => {
    const target = idx + dir;
    if (target < 0 || target >= selectedIds.length) return;
    const next = [...selectedIds];
    const current = next[idx];
    const swap = next[target];
    if (!current || !swap) return;
    next[idx] = swap;
    next[target] = current;
    setSelectedIds(next);
  };

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!surveyId || selectedIds.length === 0) return;
    onSave({
      surveyId,
      compositionVersion: compositionVersion.trim() || "v1.0-TSE",
      questionnaireIds: selectedIds,
      status,
    });
    onClose();
  };

  return (
    <SlideOverDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={
        initialData
          ? "Editar Composição de Questionários da Pesquisa"
          : "Nova Composição de Pesquisa TSE"
      }
      subtitle="Junte e ordene os cadernos/questionários que compõem a pesquisa registrada no PesqEle"
      footerActions={
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            data-testid="btn-cancel-composition"
            onClick={onClose}
            style={{
              padding: "8px 16px",
              borderRadius: "10px",
              border: "1px solid #353535",
              backgroundColor: "#202020",
              color: "#e5e2e1",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            data-testid="btn-save-composition"
            onClick={handleSubmit}
            style={{
              padding: "8px 18px",
              borderRadius: "10px",
              border: "none",
              backgroundColor: "#8ab4f8",
              color: "#003061",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Salvar Composição
          </button>
        </div>
      }
    >
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "14px" }}
      >
        <div>
          <label style={LABEL_STYLE}>1. Pesquisa TSE Destino (Combobox) *</label>
          <select
            data-testid="select-composition-survey"
            value={surveyId}
            onChange={(e) => setSurveyId(e.target.value)}
            style={INPUT_STYLE}
          >
            {effectiveSurveys.map((s) => (
              <option key={s.id} value={s.id}>
                {s.protocolTse} — {s.title} ({s.cityUf})
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div>
            <label style={LABEL_STYLE}>Versão do Caderno *</label>
            <input
              data-testid="input-composition-version"
              value={compositionVersion}
              onChange={(e) => setCompositionVersion(e.target.value)}
              placeholder="Ex: v1.0-TSE"
              style={INPUT_STYLE}
            />
          </div>
          <div>
            <label style={LABEL_STYLE}>Status da Composição *</label>
            <select
              data-testid="select-composition-status"
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as SurveyCompositionRecord["status"])
              }
              style={INPUT_STYLE}
            >
              <option value="EM_MONTAGEM">Em Montagem</option>
              <option value="HOMOLOGADA_TSE">Homologada TSE</option>
              <option value="TRAVADA_SHA256">Travada SHA-256</option>
            </select>
          </div>
        </div>

        <div>
          <label style={LABEL_STYLE}>
            2. Juntar Questionário à Pesquisa (Combobox) *
          </label>
          <div style={{ display: "flex", gap: "8px" }}>
            <select
              data-testid="select-composition-questionnaire"
              value={pickerBlockId}
              onChange={(e) => setPickerBlockId(e.target.value)}
              style={INPUT_STYLE}
            >
              {effectiveQuestionnaires.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.code} — {q.title}
                  {q.questionsCount > 0 ? ` (${q.questionsCount} perg.)` : ""}
                </option>
              ))}
            </select>
            <button
              type="button"
              data-testid="btn-append-questionnaire-to-survey"
              onClick={handleAddBlock}
              style={{
                padding: "8px 14px",
                borderRadius: "10px",
                border: "1px solid #8ab4f8",
                backgroundColor: "#2a2a2a",
                color: "#8ab4f8",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              + Juntar
            </button>
          </div>
        </div>

        <div>
          <label style={LABEL_STYLE}>
            Sequência de Questionários Juntados ({selectedIds.length} selecionados)
          </label>
          <div style={{ display: "grid", gap: "8px" }}>
            {effectiveQuestionnaires.map((tpl) => {
              const idx = selectedIds.indexOf(tpl.id);
              const isSelected = idx !== -1;
              return (
                <div
                  key={tpl.id}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: isSelected ? "1px solid #8ab4f8" : "1px solid #353535",
                    backgroundColor: isSelected ? "#202020" : "#131313",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px",
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      cursor: "pointer",
                      fontSize: "12px",
                      color: "#e5e2e1",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleBlock(tpl.id)}
                    />
                    <span>
                      <strong style={{ color: isSelected ? "#8ab4f8" : "#9aa0a6" }}>
                        {isSelected ? `#${idx + 1} ` : ""}
                        {tpl.code}
                      </strong>{" "}
                      — {tpl.title}
                    </span>
                  </label>
                  {isSelected && (
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button
                        type="button"
                        onClick={() => handleMove(idx, -1)}
                        disabled={idx === 0}
                        style={{
                          padding: "2px 6px",
                          fontSize: "11px",
                          borderRadius: "6px",
                          border: "1px solid #353535",
                          backgroundColor: "#2a2a2a",
                          color: "#e5e2e1",
                          cursor: "pointer",
                        }}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMove(idx, 1)}
                        disabled={idx === selectedIds.length - 1}
                        style={{
                          padding: "2px 6px",
                          fontSize: "11px",
                          borderRadius: "6px",
                          border: "1px solid #353535",
                          backgroundColor: "#2a2a2a",
                          color: "#e5e2e1",
                          cursor: "pointer",
                        }}
                      >
                        ↓
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </form>
    </SlideOverDrawer>
  );
}
