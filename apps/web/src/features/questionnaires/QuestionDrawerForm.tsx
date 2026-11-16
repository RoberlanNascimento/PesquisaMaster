import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { SlideOverDrawer } from "../../components/ui/SlideOverDrawer";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";
import {
  questionFormSchema,
  type QuestionFormData,
  type QuestionnaireItem,
} from "./questionnairesData";

const { colors } = NOCTURNE_TOKENS;

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 12px",
  borderRadius: "10px",
  border: `1px solid ${colors.borderSubtle}`,
  fontSize: "13px",
  backgroundColor: colors.surfaceContainerLow,
  color: colors.textPrimary,
};

const LABEL_STYLE: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  color: colors.onSurfaceVariant,
  marginBottom: "5px",
  display: "block",
};

export function QuestionDrawerForm({
  isOpen,
  onClose,
  initialData,
  onSave,
}: {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly initialData?: QuestionnaireItem | null;
  readonly onSave: (data: QuestionFormData) => void;
}): React.JSX.Element {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<QuestionFormData>({
    defaultValues: {
      code: initialData?.code ?? "",
      text: initialData?.text ?? "",
      type: initialData?.type ?? "ESTIMULADA_DISCO",
      isMandatory: initialData?.isMandatory ?? true,
      rotationRule: initialData?.rotationRule ?? "CIRCULAR_OFFSET",
      minDurationSeconds: initialData?.minDurationSeconds ?? 10,
      optionsRaw: initialData?.options.join("\n") ?? "",
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        code: initialData.code,
        text: initialData.text,
        type: initialData.type,
        isMandatory: initialData.isMandatory,
        rotationRule: initialData.rotationRule,
        minDurationSeconds: initialData.minDurationSeconds,
        optionsRaw: initialData.options.join("\n"),
      });
    } else {
      reset({
        code: "P0" + Math.floor(Math.random() * 80 + 10),
        text: "",
        type: "ESTIMULADA_DISCO",
        isMandatory: true,
        rotationRule: "CIRCULAR_OFFSET",
        minDurationSeconds: 10,
        optionsRaw: "Candidato 1\nCandidato 2\nBranco / Nulo\nNão sabe",
      });
    }
  }, [initialData, reset]);

  const onSubmit = (values: QuestionFormData): void => {
    const parsed = questionFormSchema.safeParse(values);
    if (!parsed.success) return;
    onSave(parsed.data);
    onClose();
  };

  return (
    <SlideOverDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Editar Pergunta do Questionário" : "Nova Pergunta / Variável"}
      subtitle="Defina o tipo, rodízio de disco TSE e tempo mínimo de resposta para antifraude"
      footerActions={
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            data-testid="btn-cancel-question"
            onClick={onClose}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: `1px solid ${colors.borderSubtle}`,
              backgroundColor: colors.surfaceContainerHigh,
              color: colors.textPrimary,
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            data-testid="btn-save-question"
            onClick={handleSubmit(onSubmit)}
            style={{
              padding: "8px 18px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: colors.primaryContainer,
              color: colors.onPrimary,
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Salvar Pergunta
          </button>
        </div>
      }
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        style={{ display: "flex", flexDirection: "column", gap: "14px" }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px" }}>
          <div>
            <label style={LABEL_STYLE}>Código (TSE) *</label>
            <input {...register("code", { required: true })} style={INPUT_STYLE} />
            {errors.code && (
              <span style={{ fontSize: "11px", color: "#e11d48" }}>{errors.code.message}</span>
            )}
          </div>
          <div>
            <label style={LABEL_STYLE}>Tipo de Pergunta *</label>
            <select {...register("type")} style={INPUT_STYLE}>
              <option value="ESTIMULADA_DISCO">Estimulada com Disco TSE</option>
              <option value="ESPONTANEA">Espontânea Livre</option>
              <option value="REJEICAO_MULTIPLA">Rejeição Múltipla</option>
              <option value="COTA_DEMOGRAFICA">Filtro de Cota Demográfica</option>
              <option value="AVALIACAO_GOVERNO">Avaliação de Gestão/Governo</option>
            </select>
          </div>
        </div>

        <div>
          <label style={LABEL_STYLE}>Enunciado Completo da Pergunta *</label>
          <textarea
            {...register("text", { required: true })}
            rows={3}
            placeholder="Ex: Se a eleição fosse hoje e os candidatos fossem estes..."
            style={INPUT_STYLE}
          />
          {errors.text && (
            <span style={{ fontSize: "11px", color: "#e11d48" }}>{errors.text.message}</span>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div>
            <label style={LABEL_STYLE}>Regra de Rodízio TSE *</label>
            <select {...register("rotationRule")} style={INPUT_STYLE}>
              <option value="CIRCULAR_OFFSET">Deslocamento Circular (Disco)</option>
              <option value="RANDOM">Aleatorização Completa</option>
              <option value="NONE">Ordem Fixa</option>
            </select>
          </div>
          <div>
            <label style={LABEL_STYLE}>Tempo Mínimo (segundos) *</label>
            <input
              type="number"
              {...register("minDurationSeconds", { valueAsNumber: true })}
              style={INPUT_STYLE}
            />
          </div>
        </div>

        <div>
          <label style={LABEL_STYLE}>Opções de Resposta / Candidatos (Uma por linha) *</label>
          <textarea
            {...register("optionsRaw", { required: true })}
            rows={5}
            placeholder="Opção 1&#10;Opção 2&#10;Branco / Nulo"
            style={INPUT_STYLE}
          />
          {errors.optionsRaw && (
            <span style={{ fontSize: "11px", color: "#e11d48" }}>{errors.optionsRaw.message}</span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input type="checkbox" id="isMandatory" {...register("isMandatory")} />
          <label htmlFor="isMandatory" style={{ fontSize: "13px", color: colors.textPrimary }}>
            Pergunta de preenchimento obrigatório para prosseguir a entrevista
          </label>
        </div>
      </form>
    </SlideOverDrawer>
  );
}

