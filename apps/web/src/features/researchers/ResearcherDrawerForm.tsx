import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { SlideOverDrawer } from "../../components/ui/SlideOverDrawer";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";
import {
  researcherFormSchema,
  type ResearcherFormData,
  type ResearcherRecord,
} from "./researchersData";

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

export function ResearcherDrawerForm({
  isOpen,
  onClose,
  onSave,
  editingResearcher,
}: {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSave: (data: ResearcherFormData) => void;
  readonly editingResearcher?: ResearcherRecord | null;
}): React.JSX.Element {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ResearcherFormData>({
    defaultValues: {
      fullName: "",
      cpf: "",
      coordinatorName: "Carlos Eduardo Mendes",
      assignedSector: "São Paulo — Zona Sul (Setor 014)",
      targetCount: 150,
    },
  });

  useEffect(() => {
    if (editingResearcher) {
      reset({
        fullName: editingResearcher.fullName,
        cpf: editingResearcher.maskedCpf,
        coordinatorName: editingResearcher.coordinatorName,
        assignedSector: editingResearcher.assignedSector,
        targetCount: editingResearcher.targetCount,
      });
    } else {
      reset({
        fullName: "",
        cpf: "",
        coordinatorName: "Carlos Eduardo Mendes",
        assignedSector: "São Paulo — Zona Sul (Setor 014)",
        targetCount: 150,
      });
    }
  }, [editingResearcher, isOpen, reset]);

  const onSubmit = (values: ResearcherFormData): void => {
    const parsed = researcherFormSchema.safeParse(values);
    if (!parsed.success) return;
    onSave(parsed.data);
    reset();
    onClose();
  };

  return (
    <SlideOverDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={
        editingResearcher
          ? "Editar Profissional de Campo"
          : "Cadastrar Novo Pesquisador de Campo"
      }
      subtitle="Credenciamento oficial, setor censitário designado e controle de metas"
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
            Cadastrar Pesquisador
          </button>
        </div>
      }
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        style={{ display: "flex", flexDirection: "column", gap: "14px" }}
      >
        <div>
          <label style={LABEL_STYLE}>Nome Completo do Pesquisador *</label>
          <input
            {...register("fullName", { required: true })}
            placeholder="Ex: Mariana Silveira Rocha"
            style={INPUT_STYLE}
          />
          {errors.fullName && (
            <span style={{ fontSize: "11px", color: "#e11d48" }}>{errors.fullName.message}</span>
          )}
        </div>

        <div>
          <label style={LABEL_STYLE}>CPF (Somente Números) *</label>
          <input
            {...register("cpf", { required: true })}
            placeholder="Ex: 12345678900"
            style={INPUT_STYLE}
          />
          {errors.cpf && (
            <span style={{ fontSize: "11px", color: "#e11d48" }}>{errors.cpf.message}</span>
          )}
        </div>

        <div>
          <label style={LABEL_STYLE}>Coordenador de Campo Responsável *</label>
          <input {...register("coordinatorName", { required: true })} style={INPUT_STYLE} />
        </div>

        <div>
          <label style={LABEL_STYLE}>Setor Censitário / Região Designada *</label>
          <input
            {...register("assignedSector", { required: true })}
            placeholder="Ex: São Paulo — Zona Leste (Setor 092)"
            style={INPUT_STYLE}
          />
        </div>

        <div>
          <label style={LABEL_STYLE}>Meta de Entrevistas (N) *</label>
          <input
            type="number"
            {...register("targetCount", { valueAsNumber: true })}
            style={INPUT_STYLE}
          />
        </div>
      </form>
    </SlideOverDrawer>
  );
}

