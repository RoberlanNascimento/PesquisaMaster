import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { SlideOverDrawer } from "../../components/ui/SlideOverDrawer";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";
import { useUiSessionStore } from "../../lib/store";
import { useTerritorialStore } from "../regions/regionsStore";
import {
  SAMPLE_PLAN_PRESETS,
  surveyFormSchema,
  type SurveyFormData,
  type SurveyRecord,
} from "./surveysData";

const { colors } = NOCTURNE_TOKENS;

const INPUT_STYLE: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: "10px", border: `1px solid ${colors.borderSubtle}`, fontSize: "13px", backgroundColor: colors.surfaceContainerLow, color: colors.textPrimary };
const LABEL_STYLE: React.CSSProperties = { fontSize: "12px", fontWeight: 600, color: colors.onSurfaceVariant, marginBottom: "5px", display: "block" };
const SECTION_STYLE: React.CSSProperties = { borderTop: `1px solid ${colors.borderSubtle}`, paddingTop: "14px", marginTop: "2px", display: "flex", flexDirection: "column", gap: "12px" };
const SECTION_TITLE_STYLE: React.CSSProperties = { margin: 0, fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: colors.primary };

function getInitialValues(initialData: SurveyRecord | null | undefined): SurveyFormData {
  return {
    protocolTse: initialData?.protocolTse ?? "",
    title: initialData?.title ?? "",
    office: initialData?.office ?? "Presidente",
    stateId: initialData?.stateId ?? "state-sp",
    municipalityId: initialData?.municipalityId ?? "mun-sp",
    collaboratorId: initialData?.collaboratorId ?? "colab-001",
    samplePlanId: initialData?.samplePlanId ?? "smp-2000",
    cityUf: initialData?.cityUf ?? "São Paulo / SP",
    statisticianName: initialData?.statisticianName ?? "Dra. Helena Vasconcelos",
    conreNumber: initialData?.conreNumber ?? "CONRE-3 nº 9482-A",
    sampleTarget: initialData?.sampleTarget ?? 2000,
    fieldStartDate: initialData?.fieldStartDate ?? "2026-11-01",
    fieldEndDate: initialData?.fieldEndDate ?? "2026-11-05",
    tseReceiptPdf: initialData?.tseReceiptPdf ?? "",
  };
}

export function SurveyDrawerForm({
  isOpen,
  onClose,
  initialData,
  onSave,
}: {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly initialData?: SurveyRecord | null;
  readonly onSave: (data: SurveyFormData) => void;
}): React.JSX.Element {
  const states = useTerritorialStore((s) => s.states);
  const municipalities = useTerritorialStore((s) => s.municipalities);
  const collaborators = useUiSessionStore((s) => s.clientCollaborators);
  const [dbAmostras, setDbAmostras] = useState<any[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    fetch("http://127.0.0.1:8000/api/v1/amostragem/opcoes", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : ({} as any)))
      .then((d) => {
        if (Array.isArray(d?.amostras)) setDbAmostras(d.amostras);
      })
      .catch(() => {});
  }, [isOpen]);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<SurveyFormData>({
    defaultValues: getInitialValues(initialData),
  });

  const watchedStateId = watch("stateId");
  const filteredMunicipalities = municipalities.filter((m) => m.stateId === watchedStateId);

  useEffect(() => {
    reset(getInitialValues(initialData));
  }, [initialData, reset]);

  const handleStateChange = (newStateId: string): void => {
    setValue("stateId", newStateId);
    const firstMun = municipalities.find((m) => m.stateId === newStateId);
    const st = states.find((s) => s.id === newStateId);
    if (firstMun) {
      setValue("municipalityId", firstMun.id);
      setValue("cityUf", `${firstMun.name} / ${firstMun.uf}`);
    } else if (st) {
      setValue("cityUf", `${st.name} / ${st.uf}`);
    }
  };

  const handleMunicipalityChange = (newMunId: string): void => {
    setValue("municipalityId", newMunId);
    const mun = municipalities.find((m) => m.id === newMunId);
    if (mun) setValue("cityUf", `${mun.name} / ${mun.uf}`);
  };

  const handleCollaboratorChange = (newCollabId: string): void => {
    setValue("collaboratorId", newCollabId);
    const collab = collaborators.find((c) => c.id === newCollabId);
    if (collab) {
      setValue("statisticianName", collab.fullName);
      setValue("conreNumber", collab.credentialOrDevice);
    }
  };

  const handleSamplePlanChange = (newPlanId: string): void => {
    setValue("samplePlanId", newPlanId);
    const dbPlan = dbAmostras.find((a) => String(a.id_amostra) === newPlanId);
    if (dbPlan) {
      setValue("sampleTarget", Number(dbPlan.tamanho_amostral) || 400);
      return;
    }
    const plan = SAMPLE_PLAN_PRESETS.find((p) => p.id === newPlanId);
    if (plan) setValue("sampleTarget", plan.sampleSize);
  };

  const onSubmit = (values: SurveyFormData): void => {
    const parsed = surveyFormSchema.safeParse(values);
    if (!parsed.success) return;
    onSave(parsed.data);
    onClose();
  };

  return (
    <SlideOverDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Editar Metadados da Pesquisa TSE" : "Nova Pesquisa"}
      subtitle="Registro obrigatório de metadados conforme Resolução TSE nº 23.600"
      footerActions={
        <div style={{ display: "flex", gap: "10px" }}>
          <button type="button" onClick={onClose} style={{ padding: "8px 16px", borderRadius: "8px", border: `1px solid ${colors.borderSubtle}`, backgroundColor: colors.surfaceContainerHigh, color: colors.textPrimary, fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
            Cancelar
          </button>
          <button type="button" data-testid="btn-save-survey" onClick={handleSubmit(onSubmit)} style={{ padding: "8px 18px", borderRadius: "8px", border: "none", backgroundColor: colors.primaryContainer, color: colors.onPrimary, fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
            Salvar Pesquisa
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <h4 style={SECTION_TITLE_STYLE}>1. Identificação Oficial TSE (PesqEle)</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={LABEL_STYLE}>Protocolo TSE (PesqEle) *</label>
              <input {...register("protocolTse", { required: true })} placeholder="Ex: SP-05190/2026" style={INPUT_STYLE} />
              {errors.protocolTse && <span style={{ fontSize: "11px", color: colors.errorPastel }}>{errors.protocolTse.message}</span>}
            </div>
            <div>
              <label style={LABEL_STYLE}>Cargo Pesquisado *</label>
              <select {...register("office")} style={INPUT_STYLE}>
                <option value="Presidente">Presidente</option>
                <option value="Governador">Governador</option>
                <option value="Senador">Senador</option>
                <option value="Prefeito">Prefeito</option>
              </select>
            </div>
          </div>
          <div>
            <label style={LABEL_STYLE}>Título Completo da Pesquisa *</label>
            <input {...register("title", { required: true })} placeholder="Ex: Sondagem Governador SP — Cenários 1º Turno" style={INPUT_STYLE} />
            {errors.title && <span style={{ fontSize: "11px", color: colors.errorPastel }}>{errors.title.message}</span>}
          </div>
        </div>

        <div style={SECTION_STYLE}>
          <h4 style={SECTION_TITLE_STYLE}>2. Abrangência Territorial (FKs Regiões)</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={LABEL_STYLE}>Estado (FK Estados) *</label>
              <select data-testid="select-survey-state" value={watchedStateId} onChange={(e) => handleStateChange(e.target.value)} style={INPUT_STYLE}>
                {states.map((st) => <option key={st.id} value={st.id}>{st.uf} — {st.name} (IBGE {st.ibgeCode})</option>)}
              </select>
            </div>
            <div>
              <label style={LABEL_STYLE}>Município (FK Municípios) *</label>
              <select data-testid="select-survey-municipality" value={watch("municipalityId")} onChange={(e) => handleMunicipalityChange(e.target.value)} style={INPUT_STYLE}>
                {filteredMunicipalities.map((mun) => <option key={mun.id} value={mun.id}>{mun.name} / {mun.uf} ({mun.ibgeCode})</option>)}
              </select>
            </div>
          </div>
        </div>

        <div style={SECTION_STYLE}>
          <h4 style={SECTION_TITLE_STYLE}>3. Responsabilidade Técnica</h4>
          <div>
            <label style={LABEL_STYLE}>Colaborador Responsável (FK Colaboradores) *</label>
            <select data-testid="select-survey-collaborator" value={watch("collaboratorId")} onChange={(e) => handleCollaboratorChange(e.target.value)} style={INPUT_STYLE}>
              {collaborators.map((c) => <option key={c.id} value={c.id}>{c.fullName} ({c.role} • {c.credentialOrDevice})</option>)}
            </select>
          </div>
        </div>

        <div style={SECTION_STYLE}>
          <h4 style={SECTION_TITLE_STYLE}>4. Plano Amostral & Cronograma de Campo</h4>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}>
            <div>
              <label style={LABEL_STYLE}>Plano Amostral (FK Tamanho da Amostra) *</label>
              <select data-testid="select-survey-sample-plan" value={watch("samplePlanId")} onChange={(e) => handleSamplePlanChange(e.target.value)} style={INPUT_STYLE}>
                {dbAmostras.map((a) => (
                  <option key={a.id_amostra} value={String(a.id_amostra)}>
                    #{a.id_amostra} — {a.municipio_nome || "Município"}/{a.uf || ""}: {a.descricao} (N={a.tamanho_amostral})
                  </option>
                ))}
                {dbAmostras.length === 0 && SAMPLE_PLAN_PRESETS.map((plan) => <option key={plan.id} value={plan.id}>{plan.label}</option>)}
              </select>
            </div>
            <div>
              <label style={LABEL_STYLE}>Tamanho da Amostra (N) *</label>
              <input type="number" data-testid="input-survey-sample-target" {...register("sampleTarget", { valueAsNumber: true })} style={INPUT_STYLE} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={LABEL_STYLE}>Início Coleta *</label>
              <input type="date" {...register("fieldStartDate")} style={INPUT_STYLE} />
            </div>
            <div>
              <label style={LABEL_STYLE}>Fim Coleta *</label>
              <input type="date" {...register("fieldEndDate")} style={INPUT_STYLE} />
            </div>
          </div>
        </div>

        <div style={SECTION_STYLE}>
          <h4 style={SECTION_TITLE_STYLE}>5. Comprovante Oficial PesqEle / TSE</h4>
          <div>
            <label style={LABEL_STYLE}>Espelho Oficial PesqEle TSE (Arquivo PDF)</label>
            <input data-testid="input-survey-tse-pdf" {...register("tseReceiptPdf")} placeholder="Ex: Espelho_PesqEle_SP_05190_2026.pdf" style={INPUT_STYLE} />
            <span style={{ fontSize: "11px", color: colors.textMuted, marginTop: "4px", display: "block" }}>
              Anexo oficial do comprovante gerado pelo sistema PesqEle/TSE.
            </span>
          </div>
        </div>
      </form>
    </SlideOverDrawer>
  );
}
