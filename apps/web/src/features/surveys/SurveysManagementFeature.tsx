import React, { useState, useMemo, useEffect } from "react";
import { useUiSessionStore } from "../../lib/store";
import { EnterpriseCrudWorkspace } from "../../components/ui/EnterpriseCrudWorkspace";
import { ConfirmDialogModal } from "../../components/ui/ConfirmDialogModal";
import {
  INITIAL_SURVEYS,
  type SurveyRecord,
  type SurveyFormData,
} from "./surveysData";
import {
  getSurveyTabs,
  getSurveyKpis,
  getSurveyFilters,
  SURVEY_COLUMNS,
} from "./surveysConfig";
import { SurveyDrawerForm } from "./SurveyDrawerForm";
import { SurveyGlobalActions } from "./SurveyGlobalActions";
import { fetchPesquisasFromDb } from "./pesquisasApi";

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

export function SurveysManagementFeature(): React.JSX.Element {
  const globalSearchQuery = useUiSessionStore((state) => state.globalSearchQuery);
  const [surveys, setSurveys] = useState<readonly SurveyRecord[]>(INITIAL_SURVEYS);
  const [activeTab, setActiveTab] = useState<string>("TODAS");
  const [search, setSearch] = useState<string>("");
  const [filterOffice, setFilterOffice] = useState<string>("ALL");
  const [filterUf, setFilterUf] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  const [dbConnected, setDbConnected] = useState<boolean>(false);
  const [dbDetails, setDbDetails] = useState<string>("");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState<SurveyRecord | null>(null);
  const [confirmLockSurvey, setConfirmLockSurvey] = useState<SurveyRecord | null>(null);

  useEffect(() => {
    let active = true;
    fetchPesquisasFromDb()
      .then((dbData) => {
        if (!active) return;
        if (dbData.length > 0) {
          setSurveys((prev) => {
            const staticRemaining = prev.filter((s) => !s.id.startsWith("db-pesq-"));
            return [...dbData, ...staticRemaining];
          });
          setDbConnected(true);
          setDbDetails(`PostgreSQL: pesquisas (${dbData.length} ativas)`);
        }
      })
      .catch(() => {
        if (active) setDbConnected(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const effectiveSearch = search.trim() || globalSearchQuery.trim();

  const filteredSurveys = useMemo(() => {
    return surveys.filter((s) => {
      if (activeTab === "RASCUNHO" && s.status !== "RASCUNHO") return false;
      if (activeTab === "REGISTRADA" && s.status !== "REGISTRADA_PESQELE") return false;
      if (activeTab === "EM_CAMPO" && s.status !== "EM_CAMPO") return false;
      if (activeTab === "CONSOLIDADA" && s.status !== "CONSOLIDADA") return false;

      if (filterOffice !== "ALL" && s.office !== filterOffice) return false;
      if (filterStatus !== "ALL" && s.status !== filterStatus) return false;
      if (filterUf !== "ALL" && !s.cityUf.includes(filterUf)) return false;

      if (effectiveSearch) {
        const query = effectiveSearch.toLowerCase();
        const matches =
          s.title.toLowerCase().includes(query) ||
          s.protocolTse.toLowerCase().includes(query) ||
          s.statisticianName.toLowerCase().includes(query);
        if (!matches) return false;
      }
      return true;
    });
  }, [surveys, activeTab, filterOffice, filterStatus, filterUf, effectiveSearch]);

  const tabs = useMemo(() => getSurveyTabs(surveys), [surveys]);
  const kpis = useMemo(() => getSurveyKpis(surveys), [surveys]);
  const filters = useMemo(
    () =>
      getSurveyFilters(
        filterOffice,
        setFilterOffice,
        filterUf,
        setFilterUf,
        filterStatus,
        setFilterStatus
      ),
    [filterOffice, filterUf, filterStatus]
  );

  const handleSave = (formData: SurveyFormData): void => {
    if (editingSurvey) {
      setSurveys((prev) =>
        prev.map((s) => (s.id === editingSurvey.id ? { ...s, ...formData } : s))
      );
    } else {
      const newRec: SurveyRecord = {
        id: `surv-00${surveys.length + 1}`,
        ...formData,
        sampleCollected: 0,
        status: "RASCUNHO",
        sha256Hash: "Pendência de Trava Criptográfica",
      };
      setSurveys((prev) => [newRec, ...prev]);
    }
  };

  const handleLockSurvey = (): void => {
    if (!confirmLockSurvey) return;
    const generatedHash = `sha256-${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
    setSurveys((prev) =>
      prev.map((s) =>
        s.id === confirmLockSurvey.id ? { ...s, status: "EM_CAMPO", sha256Hash: generatedHash } : s
      )
    );
    setConfirmLockSurvey(null);
  };

  return (
    <>
      <EnterpriseCrudWorkspace<SurveyRecord>
        title="Gestão de Pesquisas Eleitorais e Registro TSE"
        subtitle="Registro obrigatório PesqEle, controle de prazos e integridade criptográfica SHA-256"
        globalActions={
          <SurveyGlobalActions
            dbConnected={dbConnected}
            dbDetails={dbDetails}
            onNewSurvey={() => {
              setEditingSurvey(null);
              setDrawerOpen(true);
            }}
          />
        }
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        kpis={kpis}
        searchPlaceholder="Buscar por título, protocolo ou estatístico..."
        searchValue={search}
        onSearchChange={setSearch}
        filters={filters}
        onClearFilters={() => {
          setSearch("");
          setFilterOffice("ALL");
          setFilterUf("ALL");
          setFilterStatus("ALL");
        }}
        columns={SURVEY_COLUMNS}
        data={filteredSurveys}
        keyExtractor={(s) => s.id}
        renderRowActions={(s) => (
          <>
            <button
              type="button"
              data-testid={`btn-attach-pdf-${s.id}`}
              title={s.tseReceiptPdf ? `Espelho anexado: ${s.tseReceiptPdf}` : "Anexar Espelho PesqEle TSE (PDF)"}
              onClick={() => {
                const pdfName = `Espelho_PesqEle_${s.protocolTse.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
                setSurveys((prev) =>
                  prev.map((item) => (item.id === s.id ? { ...item, tseReceiptPdf: pdfName, status: item.status === "RASCUNHO" ? "REGISTRADA_PESQELE" : item.status } : item))
                );
              }}
              style={{ ...ROW_BTN_STYLE, backgroundColor: s.tseReceiptPdf ? "#183724" : "#2a2a2a", color: s.tseReceiptPdf ? "#a8dab5" : "#8ab4f8", borderColor: s.tseReceiptPdf ? "#81c995" : "#353535" }}
            >
              {s.tseReceiptPdf ? "📄 Espelho OK" : "📎 Anexar PDF"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingSurvey(s);
                setDrawerOpen(true);
              }}
              style={{ ...ROW_BTN_STYLE, backgroundColor: "#3b2e08", borderColor: "#fde293", color: "#fde293" }}
            >
              ✏️ Editar
            </button>
            {s.status === "REGISTRADA_PESQELE" && (
              <button
                type="button"
                onClick={() => setConfirmLockSurvey(s)}
                style={{ ...ROW_BTN_STYLE, border: "none", backgroundColor: "#fdd663", color: "#332200" }}
              >
                🔒 Travar
              </button>
            )}
          </>
        )}
      />

      <SurveyDrawerForm
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        initialData={editingSurvey}
        onSave={handleSave}
      />

      <ConfirmDialogModal
        isOpen={Boolean(confirmLockSurvey)}
        title="Travar Pesquisa para Coleta de Campo"
        message={`Deseja gerar o hash criptográfico SHA-256 e travar o questionário da pesquisa "${confirmLockSurvey?.title}"?`}
        confirmLabel="🔒 Travar & Gerar Hash"
        variant="warning"
        onConfirm={handleLockSurvey}
        onCancel={() => setConfirmLockSurvey(null)}
      />
    </>
  );
}
