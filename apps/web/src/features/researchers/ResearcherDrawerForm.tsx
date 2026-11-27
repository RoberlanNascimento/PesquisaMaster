import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { SlideOverDrawer } from "../../components/ui/SlideOverDrawer";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";
import {
  researcherFormSchema,
  type ResearcherFormData,
  type ResearcherRecord,
} from "./researchersData";

export type ProfessionalRoleType =
  | "pesquisador_campo"
  | "estatistico_responsavel"
  | "supervisor_campo";

export interface ExtendedResearcherFormData extends ResearcherFormData {
  readonly tipoProfissional: ProfessionalRoleType;
  readonly registroProfissional: string;
  readonly telefone: string;
}

export interface ExtendedResearcherRecord extends ResearcherRecord {
  readonly tipoProfissional?: ProfessionalRoleType | string;
  readonly registroProfissional?: string | null;
  readonly telefone?: string | null;
}

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

function normalizeRoleType(raw?: string | null): ProfessionalRoleType {
  if (raw === "estatistico_responsavel" || raw === "supervisor_campo") return raw;
  return "pesquisador_campo";
}

export function ResearcherDrawerForm({
  isOpen,
  onClose,
  onSave,
  editingResearcher,
}: {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSave: (data: ExtendedResearcherFormData) => void;
  readonly editingResearcher?: ExtendedResearcherRecord | null;
}): React.JSX.Element {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ExtendedResearcherFormData>({
    defaultValues: {
      fullName: "",
      cpf: "",
      tipoProfissional: "pesquisador_campo",
      registroProfissional: "",
      telefone: "",
      coordinatorName: "Carlos Eduardo Mendes",
      assignedSector: "São Paulo — Zona Sul (Setor 014)",
      targetCount: 150,
    },
  });

  const selectedRole = watch("tipoProfissional");

  useEffect(() => {
    if (editingResearcher) {
      reset({
        fullName: editingResearcher.fullName,
        cpf: editingResearcher.maskedCpf,
        tipoProfissional: normalizeRoleType(editingResearcher.tipoProfissional),
        registroProfissional: editingResearcher.registroProfissional ?? "",
        telefone: editingResearcher.telefone ?? "",
        coordinatorName: editingResearcher.coordinatorName,
        assignedSector: editingResearcher.assignedSector,
        targetCount: editingResearcher.targetCount,
      });
    } else {
      reset({
        fullName: "",
        cpf: "",
        tipoProfissional: "pesquisador_campo",
        registroProfissional: "",
        telefone: "",
        coordinatorName: "Carlos Eduardo Mendes",
        assignedSector: "São Paulo — Zona Sul (Setor 014)",
        targetCount: 150,
      });
    }
  }, [editingResearcher, isOpen, reset]);

  const onSubmit = (values: ExtendedResearcherFormData): void => {
    const parsed = researcherFormSchema.safeParse(values);
    if (!parsed.success) return;
    onSave({
      ...parsed.data,
      tipoProfissional: normalizeRoleType(values.tipoProfissional),
      registroProfissional: (values.registroProfissional ?? "").trim(),
      telefone: (values.telefone ?? "").trim(),
    });
    reset();
    onClose();
  };

  return (
    <SlideOverDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={
        editingResearcher
          ? "Editar Profissional"
          : "Cadastrar Profissional (Campo / Estatístico)"
      }
      subtitle="Credenciamento oficial, função (Pesquisador, Estatístico CONRE ou Supervisor) e metas"
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
            data-testid="btn-submit-researcher"
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
            {editingResearcher ? "Salvar Alterações" : "Cadastrar Profissional"}
          </button>
        </div>
      }
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        style={{ display: "flex", flexDirection: "column", gap: "14px" }}
      >
        <div>
          <label style={LABEL_STYLE}>Tipo de Profissional *</label>
          <select
            data-testid="select-tipo-profissional"
            {...register("tipoProfissional")}
            style={INPUT_STYLE}
          >
            <option value="pesquisador_campo">Pesquisador de Campo</option>
            <option value="estatistico_responsavel">Estatístico Responsável (CONRE)</option>
            <option value="supervisor_campo">Supervisor de Campo</option>
          </select>
        </div>

        <div>
          <label style={LABEL_STYLE}>Nome Completo *</label>
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
          <label style={LABEL_STYLE}>CPF / CNPJ (Somente Números) *</label>
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
          <label style={LABEL_STYLE}>
            Registro Profissional (CONRE){selectedRole === "estatistico_responsavel" ? " *" : ""}
          </label>
          <input
            data-testid="input-registro-profissional"
            {...register("registroProfissional")}
            placeholder="Ex: CONRE 10482-A (obrigatório para Estatístico TSE)"
            style={INPUT_STYLE}
          />
        </div>

        <div>
          <label style={LABEL_STYLE}>Telefone / WhatsApp</label>
          <input
            data-testid="input-telefone"
            {...register("telefone")}
            placeholder="Ex: (91) 99999-0000"
            style={INPUT_STYLE}
          />
        </div>

        <div>
          <label style={LABEL_STYLE}>Coordenador de Campo Responsável *</label>
          <input {...register("coordinatorName", { required: true })} style={INPUT_STYLE} />
        </div>

        <div>
          <label style={LABEL_STYLE}>Especialidade / Setor Designado *</label>
          <input
            {...register("assignedSector", { required: true })}
            placeholder="Ex: Entrevistador de Campo ou Estatística Eleitoral"
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
