import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { SlideOverDrawer } from "../../components/ui/SlideOverDrawer";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";

const { colors } = NOCTURNE_TOKENS;

export const externalSurveySchema = z.object({
  instituteName: z.string().min(2, "Nome do instituto obrigatório"),
  protocolTse: z.string().min(5, "Protocolo TSE obrigatório"),
  fieldDate: z.string().min(10, "Data de campo obrigatória"),
  sampleSize: z.coerce.number().min(200, "Amostra mínima de 200 entrevistas"),
  methodology: z.enum([
    "Presencial Domiciliar",
    "Presencial Ponto de Fluxo",
    "Telefônica CATI",
    "Painel Online Ponderado",
  ]),
  candA_pct: z.coerce.number().min(0).max(100),
  candB_pct: z.coerce.number().min(0).max(100),
  candC_pct: z.coerce.number().min(0).max(100),
});

export type ExternalSurveyFormData = z.infer<typeof externalSurveySchema>;

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

export function AggregatorExternalSurveyDrawer({
  isOpen,
  onClose,
  onSave,
}: {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSave: (data: ExternalSurveyFormData) => void;
}): React.JSX.Element {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ExternalSurveyFormData>({
    defaultValues: {
      instituteName: "DataFolha",
      protocolTse: "BR-2026-9999",
      fieldDate: "2026-10-25",
      sampleSize: 2500,
      methodology: "Presencial Domiciliar",
      candA_pct: 35.5,
      candB_pct: 31.0,
      candC_pct: 12.5,
    },
  });

  const onSubmit = (values: ExternalSurveyFormData): void => {
    const parsed = externalSurveySchema.safeParse(values);
    if (!parsed.success) return;
    onSave(parsed.data);
    reset();
    onClose();
  };

  return (
    <SlideOverDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Incluir Pesquisa Externa no Agregador"
      subtitle="Registro de pesquisas registradas no PesqEle/TSE para ponderação agregada"
      footerActions={
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
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
            Salvar e Ponderar
          </button>
        </div>
      }
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        style={{ display: "flex", flexDirection: "column", gap: "14px" }}
      >
        <div>
          <label style={LABEL_STYLE}>Nome do Instituto *</label>
          <input {...register("instituteName", { required: true })} style={INPUT_STYLE} />
          {errors.instituteName && (
            <span style={{ fontSize: "11px", color: "#e11d48" }}>
              {errors.instituteName.message}
            </span>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div>
            <label style={LABEL_STYLE}>Protocolo TSE *</label>
            <input {...register("protocolTse", { required: true })} style={INPUT_STYLE} />
          </div>
          <div>
            <label style={LABEL_STYLE}>Data de Coleta *</label>
            <input type="date" {...register("fieldDate")} style={INPUT_STYLE} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div>
            <label style={LABEL_STYLE}>Tamanho da Amostra (N) *</label>
            <input
              type="number"
              {...register("sampleSize", { valueAsNumber: true })}
              style={INPUT_STYLE}
            />
          </div>
          <div>
            <label style={LABEL_STYLE}>Metodologia *</label>
            <select {...register("methodology")} style={INPUT_STYLE}>
              <option value="Presencial Domiciliar">Presencial Domiciliar</option>
              <option value="Presencial Ponto de Fluxo">Presencial Ponto de Fluxo</option>
              <option value="Telefônica CATI">Telefônica CATI</option>
              <option value="Painel Online Ponderado">Painel Online Ponderado</option>
            </select>
          </div>
        </div>

        <div
          style={{
            borderTop: `1px solid ${colors.borderSubtle}`,
            paddingTop: "12px",
            marginTop: "6px",
          }}
        >
          <h4 style={{ margin: "0 0 10px", fontSize: "13px", color: colors.textPrimary }}>
            Percentuais Estimados (% Votos)
          </h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
            <div>
              <label style={LABEL_STYLE}>Candidato A (%)</label>
              <input
                type="number"
                step="0.1"
                {...register("candA_pct", { valueAsNumber: true })}
                style={INPUT_STYLE}
              />
            </div>
            <div>
              <label style={LABEL_STYLE}>Candidato B (%)</label>
              <input
                type="number"
                step="0.1"
                {...register("candB_pct", { valueAsNumber: true })}
                style={INPUT_STYLE}
              />
            </div>
            <div>
              <label style={LABEL_STYLE}>Candidato C (%)</label>
              <input
                type="number"
                step="0.1"
                {...register("candC_pct", { valueAsNumber: true })}
                style={INPUT_STYLE}
              />
            </div>
          </div>
        </div>
      </form>
    </SlideOverDrawer>
  );
}

