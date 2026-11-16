import React, { useState, useMemo } from "react";
import { EnterpriseCrudWorkspace } from "../../components/ui/EnterpriseCrudWorkspace";
import { ConfirmDialogModal } from "../../components/ui/ConfirmDialogModal";
import {
  INITIAL_QUESTIONS,
  type QuestionnaireItem,
  type QuestionFormData,
} from "./questionnairesData";
import {
  getQuestionnaireTabs,
  getQuestionnaireKpis,
  getQuestionnaireFilters,
  QUESTIONNAIRE_COLUMNS,
} from "./questionnairesConfig";
import { QuestionDrawerForm } from "./QuestionDrawerForm";
import { QuestionnaireSimulatorSubscreen } from "./QuestionnaireSimulatorSubscreen";
import { QuestionnaireBranchingSubscreen } from "./QuestionnaireBranchingSubscreen";
import { QuestionnaireRowActions } from "./QuestionnaireRowActions";

const BTN_SM: React.CSSProperties = {
  padding: "9px 15px",
  border: "1px solid #353535",
  backgroundColor: "#2a2a2a",
  color: "#e5e2e1",
  borderRadius: "10px",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: 500,
};

export function QuestionnairesBuilderFeature(): React.JSX.Element {
  const [questions, setQuestions] = useState<readonly QuestionnaireItem[]>(INITIAL_QUESTIONS);
  const [activeTab, setActiveTab] = useState<string>("TAB_STRUCTURE");
  const [search, setSearch] = useState<string>("");
  const [filterSurvey, setFilterSurvey] = useState<string>("SP-05190/2026");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterMandatory, setFilterMandatory] = useState<string>("ALL");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionnaireItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<QuestionnaireItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (filterType !== "ALL" && q.type !== filterType) return false;
      if (filterMandatory === "MANDATORY" && !q.isMandatory) return false;
      if (filterMandatory === "OPTIONAL" && q.isMandatory) return false;
      if (search.trim()) {
        const query = search.toLowerCase();
        if (!q.text.toLowerCase().includes(query) && !q.code.toLowerCase().includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [questions, filterType, filterMandatory, search]);

  const tabs = useMemo(() => getQuestionnaireTabs(questions), [questions]);
  const kpis = useMemo(() => getQuestionnaireKpis(questions), [questions]);
  const filters = useMemo(
    () =>
      getQuestionnaireFilters(
        filterSurvey,
        setFilterSurvey,
        filterType,
        setFilterType,
        filterMandatory,
        setFilterMandatory
      ),
    [filterSurvey, filterType, filterMandatory]
  );

  const handleSave = (data: QuestionFormData): void => {
    const opts = data.optionsRaw.split("\n").map((o) => o.trim()).filter(Boolean);
    if (editingQuestion) {
      setQuestions((prev) =>
        prev.map((q) => (q.id === editingQuestion.id ? { ...q, ...data, options: opts } : q))
      );
      setToastMessage(`Pergunta ${editingQuestion.code} atualizada com sucesso!`);
    } else {
      const newQ: QuestionnaireItem = {
        id: `q-${Date.now()}`,
        order: questions.length + 1,
        code: data.code,
        text: data.text,
        type: data.type,
        isMandatory: data.isMandatory,
        rotationRule: data.rotationRule,
        minDurationSeconds: data.minDurationSeconds,
        options: opts,
      };
      setQuestions((prev) => [...prev, newQ]);
      setToastMessage(`Pergunta ${newQ.code} criada com sucesso!`);
    }
  };

  const handleDuplicate = (q: QuestionnaireItem): void => {
    const newQ: QuestionnaireItem = {
      ...q,
      id: `q-${Date.now()}`,
      order: questions.length + 1,
      code: `${q.code}B`,
      text: `${q.text} (Cenário Alternativo)`,
    };
    setQuestions((prev) => [...prev, newQ]);
    setToastMessage(`Pergunta ${q.code} clonada como ${newQ.code}!`);
  };

  const handleReorder = (idx: number, dir: -1 | 1): void => {
    const t = idx + dir;
    if (t < 0 || t >= questions.length || !questions[idx] || !questions[t]) return;
    const next = [...questions];
    next[idx] = { ...questions[t], order: questions[idx].order };
    next[t] = { ...questions[idx], order: questions[t].order };
    setQuestions(next);
  };

  return (
    <>
      {toastMessage && (
        <div data-testid="questionnaire-toast" style={{ marginBottom: "12px", padding: "10px 14px", borderRadius: "12px", backgroundColor: "#183724", color: "#a8dab5", fontSize: "13px", border: "1px solid rgba(129, 201, 149, 0.3)", fontWeight: 500 }}>
          {toastMessage}
        </div>
      )}

      {activeTab === "TAB_SIMULATOR" || activeTab === "TAB_BRANCHING" ? (
        <div>
          <button
            type="button"
            onClick={() => setActiveTab("TAB_STRUCTURE")}
            style={{ ...BTN_SM, marginBottom: "16px", padding: "6px 12px" }}
          >
            ← Voltar para Estrutura de Perguntas
          </button>
          {activeTab === "TAB_SIMULATOR" ? (
            <QuestionnaireSimulatorSubscreen questions={questions} />
          ) : (
            <QuestionnaireBranchingSubscreen questions={questions} />
          )}
        </div>
      ) : (
        <EnterpriseCrudWorkspace<QuestionnaireItem>
          title="Construtor de Questionários Dinâmicos e Rodízio de Disco"
          subtitle="Formulação de blocos de perguntas, regras de rodízio neutro TSE e lógica de ramificação"
          globalActions={
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                data-testid="btn-open-branching"
                onClick={() => setActiveTab("TAB_BRANCHING")}
                style={BTN_SM}
              >
                🔀 Lógica de Salto
              </button>
              <button
                type="button"
                data-testid="btn-open-simulator"
                onClick={() => setActiveTab("TAB_SIMULATOR")}
                style={BTN_SM}
              >
                👁 Abrir Simulador
              </button>
              <button
                type="button"
                data-testid="btn-export-questionnaire"
                onClick={() => {
                  setToastMessage(
                    `Questionário da pesquisa ${filterSurvey} exportado com ${questions.length} perguntas!`
                  );
                  setTimeout(() => setToastMessage(null), 3500);
                }}
                style={BTN_SM}
              >
                📥 Exportar TSE
              </button>
              <button
                type="button"
                data-testid="btn-add-question"
                onClick={() => {
                  setEditingQuestion(null);
                  setDrawerOpen(true);
                }}
                style={{ ...BTN_SM, backgroundColor: "#8ab4f8", color: "#003061", border: "none", fontWeight: 600 }}
              >
                + Nova Pergunta
              </button>
            </div>
          }
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          kpis={kpis}
          searchPlaceholder="Buscar por código ou enunciado..."
          searchValue={search}
          onSearchChange={setSearch}
          filters={filters}
          columns={QUESTIONNAIRE_COLUMNS}
          data={filteredQuestions}
          keyExtractor={(q) => q.id}
          renderRowActions={(q) => {
            const idx = questions.findIndex((item) => item.id === q.id);
            return (
              <QuestionnaireRowActions
                question={q}
                index={idx}
                total={questions.length}
                isLocked={filterSurvey === "BR-08421/2026"}
                onReorder={handleReorder}
                onEdit={(target) => {
                  setEditingQuestion(target);
                  setDrawerOpen(true);
                }}
                onDuplicate={handleDuplicate}
                onDelete={(target) => setDeleteTarget(target)}
              />
            );
          }}
        />
      )}

      <QuestionDrawerForm
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        initialData={editingQuestion}
        onSave={handleSave}
      />

      <ConfirmDialogModal
        isOpen={Boolean(deleteTarget)}
        title="Remover Pergunta do Questionário"
        message={`Deseja realmente remover a pergunta "${deleteTarget?.code} — ${deleteTarget?.text}"?`}
        confirmLabel="🚫 Remover Pergunta"
        variant="danger"
        onConfirm={() => {
          if (deleteTarget) {
            setQuestions((prev) => prev.filter((q) => q.id !== deleteTarget.id));
            setDeleteTarget(null);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
