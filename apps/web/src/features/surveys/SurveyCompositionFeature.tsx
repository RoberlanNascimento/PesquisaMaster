import React, { useState, useMemo } from "react";
import { EnterpriseCrudWorkspace } from "../../components/ui/EnterpriseCrudWorkspace";
import { ConfirmDialogModal } from "../../components/ui/ConfirmDialogModal";
import { INITIAL_SURVEYS } from "./surveysData";
import {
  useSurveyCompositionStore,
  type SurveyCompositionRecord,
  type SurveyCompositionFormData,
} from "./surveyCompositionData";
import {
  getCompositionTabs,
  getCompositionKpis,
  getCompositionFilters,
  COMPOSITION_COLUMNS,
} from "./surveyCompositionConfig";
import { SurveyCompositionDrawerForm } from "./SurveyCompositionDrawerForm";

const ROW_BTN_STYLE: React.CSSProperties = {
  padding: "5px 10px",
  fontSize: "11px",
  fontWeight: 600,
  border: "1px solid #353535",
  borderRadius: "8px",
  backgroundColor: "#2a2a2a",
  color: "#e5e2e1",
  cursor: "pointer",
};

export function SurveyCompositionFeature(): React.JSX.Element {
  const compositions = useSurveyCompositionStore((s) => s.compositions);
  const upsertComposition = useSurveyCompositionStore((s) => s.upsertComposition);
  const deleteComposition = useSurveyCompositionStore((s) => s.deleteComposition);

  const [activeTab, setActiveTab] = useState<string>("TODAS");
  const [search, setSearch] = useState<string>("");
  const [filterSurvey, setFilterSurvey] = useState<string>("ALL");
  const [filterOffice, setFilterOffice] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<SurveyCompositionRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SurveyCompositionRecord | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const filteredCompositions = useMemo(() => {
    return compositions.filter((c) => {
      if (activeTab !== "TODAS" && c.status !== activeTab) return false;
      if (filterSurvey !== "ALL" && c.surveyProtocolTse !== filterSurvey) return false;
      if (filterOffice !== "ALL" && c.office !== filterOffice) return false;
      if (filterStatus !== "ALL" && c.status !== filterStatus) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          c.surveyTitle.toLowerCase().includes(q) ||
          c.surveyProtocolTse.toLowerCase().includes(q) ||
          c.compositionVersion.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [compositions, activeTab, filterSurvey, filterOffice, filterStatus, search]);

  const tabs = useMemo(() => getCompositionTabs(compositions), [compositions]);
  const kpis = useMemo(() => getCompositionKpis(compositions), [compositions]);
  const filters = useMemo(
    () =>
      getCompositionFilters(
        filterSurvey,
        setFilterSurvey,
        filterOffice,
        setFilterOffice,
        filterStatus,
        setFilterStatus
      ),
    [filterSurvey, filterOffice, filterStatus]
  );

  const handleSave = (data: SurveyCompositionFormData): void => {
    const survey =
      INITIAL_SURVEYS.find((s) => s.id === data.surveyId) ?? INITIAL_SURVEYS[0]!;
    const newRecord: SurveyCompositionRecord = {
      id: editingItem?.id ?? `comp-surv-${Date.now()}`,
      surveyId: survey.id,
      surveyProtocolTse: survey.protocolTse,
      surveyTitle: survey.title,
      office: survey.office,
      cityUf: survey.cityUf,
      compositionVersion: data.compositionVersion,
      questionnaireIds: data.questionnaireIds,
      status: data.status,
      sha256Signature:
        data.status === "TRAVADA_SHA256"
          ? `sha256-${Date.now().toString(16)}-comp`
          : editingItem?.sha256Signature ?? "sha256-homolog-tse-ready",
      updatedAt: "2026-11-06",
    };
    upsertComposition(newRecord);
    setFeedbackToast(
      `Composição ${newRecord.compositionVersion} da pesquisa ${newRecord.surveyProtocolTse} salva com ${newRecord.questionnaireIds.length} questionário(s)!`
    );
  };

  const handleLockComposition = (item: SurveyCompositionRecord): void => {
    upsertComposition({
      ...item,
      status: "TRAVADA_SHA256",
      sha256Signature: `sha256-${Date.now().toString(16)}-locked`,
      updatedAt: "2026-11-06",
    });
    setFeedbackToast(
      `Caderno ${item.compositionVersion} (${item.surveyProtocolTse}) travado com assinatura SHA-256!`
    );
  };

  return (
    <div data-testid="survey-composition-page">
      {feedbackToast && (
        <div
          data-testid="survey-composition-toast"
          style={{ marginBottom: "12px", padding: "10px 14px", borderRadius: "12px", backgroundColor: "#3b2e08", color: "#fde293", border: "1px solid #fde293", fontSize: "13px", fontWeight: 600 }}
        >
          {feedbackToast}
        </div>
      )}

      <EnterpriseCrudWorkspace<SurveyCompositionRecord>
        title="Composição de Pesquisas e Junção de Questionários TSE"
        subtitle="Associação, ordenação e homologação dos blocos de questionários vinculados a cada pesquisa registrada no PesqEle"
        globalActions={
          <button
            type="button"
            data-testid="btn-new-survey-composition"
            onClick={() => {
              setEditingItem(null);
              setDrawerOpen(true);
            }}
            style={{ padding: "10px 18px", backgroundColor: "#8ab4f8", color: "#003061", fontSize: "13px", fontWeight: 700, borderRadius: "12px", border: "none", cursor: "pointer" }}
          >
            + Nova Composição de Pesquisa
          </button>
        }
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        kpis={kpis}
        searchPlaceholder="Buscar por protocolo TSE, título da pesquisa ou versão do caderno..."
        searchValue={search}
        onSearchChange={setSearch}
        filters={filters}
        onClearFilters={() => {
          setSearch("");
          setFilterSurvey("ALL");
          setFilterOffice("ALL");
          setFilterStatus("ALL");
        }}
        columns={COMPOSITION_COLUMNS}
        data={filteredCompositions}
        keyExtractor={(c) => c.id}
        renderRowActions={(c) => (
          <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
            <button
              type="button"
              data-testid={`btn-edit-composition-${c.id}`}
              onClick={() => {
                setEditingItem(c);
                setDrawerOpen(true);
              }}
              style={{ ...ROW_BTN_STYLE, backgroundColor: "#3b2e08", borderColor: "#fde293", color: "#fde293" }}
            >
              ✏️ Editar Questionários
            </button>
            {c.status !== "TRAVADA_SHA256" && (
              <button
                type="button"
                data-testid={`btn-lock-composition-${c.id}`}
                onClick={() => handleLockComposition(c)}
                style={{ ...ROW_BTN_STYLE, backgroundColor: "#183724", borderColor: "#81c995", color: "#a8dab5" }}
              >
                🔒 Travar Caderno
              </button>
            )}
            <button
              type="button"
              data-testid={`btn-delete-composition-${c.id}`}
              onClick={() => setDeleteTarget(c)}
              style={{ ...ROW_BTN_STYLE, backgroundColor: "#3c1818", borderColor: "#f28b82", color: "#f28b82" }}
            >
              🗑 Excluir
            </button>
          </div>
        )}
      />

      <SurveyCompositionDrawerForm
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        initialData={editingItem}
        onSave={handleSave}
      />

      <ConfirmDialogModal
        isOpen={Boolean(deleteTarget)}
        title="Excluir Composição de Pesquisa"
        message={`Deseja excluir a composição "${deleteTarget?.compositionVersion}" da pesquisa "${deleteTarget?.surveyProtocolTse}"?`}
        confirmLabel="🗑 Confirmar Exclusão"
        variant="danger"
        onConfirm={() => {
          if (deleteTarget) {
            deleteComposition(deleteTarget.id);
            setFeedbackToast(`Composição ${deleteTarget.compositionVersion} removida.`);
            setDeleteTarget(null);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

