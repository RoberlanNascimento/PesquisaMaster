import React, { useState, useEffect, useMemo, useCallback } from "react";
import { EnterpriseCrudWorkspace } from "../../components/ui/EnterpriseCrudWorkspace";
import { SlideOverDrawer } from "../../components/ui/SlideOverDrawer";
import { SearchableCombobox, type ComboboxOption } from "../../components/ui/SearchableCombobox";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";

const { colors } = NOCTURNE_TOKENS;
const API_BASE = "http://127.0.0.1:8000/api/v1/questionarios-db";

export interface ScenarioCandidateRecord {
  readonly id: string;
  readonly scenarioId: number;
  readonly candidateId: number;
  readonly scenarioLabel: string;
  readonly candidateName: string;
  readonly partyAcronym: string;
  readonly roleCategory: string;
  readonly displayOrder: number;
  readonly photoUrl: string | null;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  if (!first) return "?";
  const last = parts[parts.length - 1];
  if (parts.length === 1 || !last) return first.slice(0, 2).toUpperCase();
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

interface BackendScenario {
  readonly id_cenario: number;
  readonly identificador?: string | null;
  readonly tipo_cenario?: string | null;
  readonly descricao?: string | null;
  readonly pesquisa_nome?: string | null;
}

interface BackendCandidate {
  readonly id_candidato_produto: number;
  readonly nome_urna_comercial?: string | null;
  readonly sigla_partido_marca?: string | null;
  readonly cargo_categoria?: string | null;
}

interface BackendScenarioCandidate {
  readonly id_cenario: number;
  readonly id_candidato_produto: number;
  readonly ordem_apresentacao?: number | null;
  readonly nome_urna_comercial?: string | null;
  readonly sigla_partido_marca?: string | null;
  readonly cargo_categoria?: string | null;
  readonly foto_url?: string | null;
}

interface ResumoResponse {
  readonly cenarios_pesquisa?: readonly BackendScenario[];
  readonly cenarios?: readonly BackendScenario[];
  readonly candidatos?: readonly BackendCandidate[];
  readonly cenario_candidatos?: readonly BackendScenarioCandidate[];
}

const INITIAL_SCENARIO_CANDIDATES: readonly ScenarioCandidateRecord[] = [
  { id: "1-1", scenarioId: 1, candidateId: 1, scenarioLabel: "Cenário #1", candidateName: "Tarcísio de Freitas", partyAcronym: "REPUBLICANOS", roleCategory: "Governador", displayOrder: 1, photoUrl: null },
  { id: "1-2", scenarioId: 1, candidateId: 2, scenarioLabel: "Cenário #1", candidateName: "Guilherme Boulos", partyAcronym: "PSOL", roleCategory: "Prefeito", displayOrder: 2, photoUrl: null },
  { id: "1-3", scenarioId: 1, candidateId: 3, scenarioLabel: "Cenário #1", candidateName: "Tabata Amaral", partyAcronym: "PSB", roleCategory: "Prefeito", displayOrder: 3, photoUrl: null },
  { id: "1-4", scenarioId: 1, candidateId: 4, scenarioLabel: "Cenário #1", candidateName: "Ricardo Nunes", partyAcronym: "MDB", roleCategory: "Prefeito", displayOrder: 4, photoUrl: null },
  { id: "2-2", scenarioId: 2, candidateId: 2, scenarioLabel: "Cenário #2", candidateName: "Guilherme Boulos", partyAcronym: "PSOL", roleCategory: "Prefeito (2º Turno)", displayOrder: 1, photoUrl: null },
  { id: "2-4", scenarioId: 2, candidateId: 4, scenarioLabel: "Cenário #2", candidateName: "Ricardo Nunes", partyAcronym: "MDB", roleCategory: "Prefeito (2º Turno)", displayOrder: 2, photoUrl: null },
];

const LABEL_STYLE: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  fontWeight: 600,
  color: colors.onSurfaceVariant,
  marginBottom: "6px",
};

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 12px",
  borderRadius: "10px",
  border: `1px solid ${colors.borderSubtle}`,
  backgroundColor: colors.surfaceContainerLow,
  color: colors.textPrimary,
  fontSize: "13px",
  outline: "none",
};

function formatScenarioLabel(scenario: BackendScenario): string {
  const ident = scenario.identificador?.trim() || `Cenário #${scenario.id_cenario}`;
  return scenario.tipo_cenario ? `${ident} (${scenario.tipo_cenario})` : ident;
}

export function ScenarioCandidatesFeature(): React.JSX.Element {
  const [records, setRecords] = useState<readonly ScenarioCandidateRecord[]>(INITIAL_SCENARIO_CANDIDATES);
  const [scenarios, setScenarios] = useState<readonly BackendScenario[]>([]);
  const [candidates, setCandidates] = useState<readonly BackendCandidate[]>([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("TODOS");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("");
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>("");
  const [displayOrder, setDisplayOrder] = useState<string>("1");
  const [submitting, setSubmitting] = useState(false);
  const [removingKey, setRemovingKey] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch(`${API_BASE}/resumo`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as ResumoResponse;
      const loadedScenarios = Array.isArray(data.cenarios_pesquisa)
        ? data.cenarios_pesquisa
        : Array.isArray(data.cenarios)
          ? data.cenarios
          : [];
      const loadedCandidates = Array.isArray(data.candidatos) ? data.candidatos : [];
      const loadedLinks = Array.isArray(data.cenario_candidatos) ? data.cenario_candidatos : [];

      setScenarios(loadedScenarios);
      setCandidates(loadedCandidates);

      const scenarioMap = new Map<number, string>();
      for (const s of loadedScenarios) {
        scenarioMap.set(s.id_cenario, formatScenarioLabel(s));
      }

      setRecords(
        loadedLinks.map((c) => ({
          id: `${c.id_cenario}-${c.id_candidato_produto}`,
          scenarioId: c.id_cenario,
          candidateId: c.id_candidato_produto,
          scenarioLabel: scenarioMap.get(c.id_cenario) ?? `Cenário #${c.id_cenario}`,
          candidateName: c.nome_urna_comercial || `Candidato #${c.id_candidato_produto}`,
          partyAcronym: c.sigla_partido_marca || "Sem Partido",
          roleCategory: c.cargo_categoria || "Geral",
          displayOrder: c.ordem_apresentacao ?? 1,
          photoUrl: c.foto_url ? String(c.foto_url) : null,
        })),
      );
    } catch {
      // Keep graceful fallback when API is offline/unavailable
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const getNextOrderForScenario = useCallback(
    (scenarioIdNum: number): number => {
      const orders = records
        .filter((r) => r.scenarioId === scenarioIdNum)
        .map((r) => r.displayOrder);
      return orders.length > 0 ? Math.max(...orders) + 1 : 1;
    },
    [records],
  );

  const handleOpenDrawer = (): void => {
    setSelectedScenarioId("");
    setSelectedCandidateId("");
    setDisplayOrder("1");
    setFormError(null);
    setDrawerOpen(true);
  };

  const handleScenarioChange = (newScenarioVal: string): void => {
    setSelectedScenarioId(newScenarioVal);
    setSelectedCandidateId("");
    setFormError(null);
    const num = Number(newScenarioVal);
    if (Number.isFinite(num) && num > 0) {
      setDisplayOrder(String(getNextOrderForScenario(num)));
    } else {
      setDisplayOrder("1");
    }
  };

  const scenarioOptions: readonly ComboboxOption[] = useMemo(
    () =>
      scenarios.map((s) => ({
        value: String(s.id_cenario),
        label: formatScenarioLabel(s),
        sublabel: [s.pesquisa_nome, s.descricao].filter(Boolean).join(" • ") || undefined,
      })),
    [scenarios],
  );

  const availableCandidateOptions: readonly ComboboxOption[] = useMemo(() => {
    const scenNum = Number(selectedScenarioId);
    const linkedIds = new Set<number>(
      Number.isFinite(scenNum) && scenNum > 0
        ? records.filter((r) => r.scenarioId === scenNum).map((r) => r.candidateId)
        : [],
    );

    return candidates
      .filter((c) => !linkedIds.has(c.id_candidato_produto))
      .map((c) => ({
        value: String(c.id_candidato_produto),
        label: c.nome_urna_comercial || `Candidato #${c.id_candidato_produto}`,
        sublabel: [c.sigla_partido_marca, c.cargo_categoria].filter(Boolean).join(" • ") || undefined,
      }));
  }, [candidates, records, selectedScenarioId]);

  const handleLinkSubmit = async (e?: React.FormEvent): Promise<void> => {
    if (e) e.preventDefault();
    const idCenario = Number(selectedScenarioId);
    const idCandidato = Number(selectedCandidateId);
    const ordem = Number(displayOrder) || 1;

    if (!Number.isFinite(idCenario) || idCenario <= 0) {
      setFormError("Selecione um cenário.");
      return;
    }
    if (!Number.isFinite(idCandidato) || idCandidato <= 0) {
      setFormError("Selecione um candidato / produto.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch(`${API_BASE}/cenario-candidatos`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          id_cenario: idCenario,
          id_candidato_produto: idCandidato,
          ordem_apresentacao: ordem,
        }),
      });
      if (!res.ok) {
        let detail = `Erro HTTP ${res.status} ao vincular candidato.`;
        try {
          const body = (await res.json()) as { detail?: string };
          if (body?.detail) detail = body.detail;
        } catch {
          // ignore JSON parse failure
        }
        setFormError(detail);
        return;
      }
      await loadData();
      setDrawerOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro de conexão ao vincular candidato.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (record: ScenarioCandidateRecord): Promise<void> => {
    setRemovingKey(record.id);
    try {
      const res = await fetch(
        `${API_BASE}/cenario-candidatos/${record.scenarioId}/${record.candidateId}`,
        { method: "DELETE" },
      );
      if (res.ok) {
        await loadData();
      }
    } finally {
      setRemovingKey(null);
    }
  };

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (activeTab === "CENARIO_1" && r.scenarioId !== 1) return false;
      if (activeTab === "CENARIO_2" && r.scenarioId !== 2) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          r.candidateName.toLowerCase().includes(q) ||
          r.partyAcronym.toLowerCase().includes(q) ||
          r.scenarioLabel.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [records, activeTab, search]);

  return (
    <>
      <EnterpriseCrudWorkspace<ScenarioCandidateRecord>
        title="Cartelas de Candidatos por Cenário"
        subtitle="Associação dos candidatos que compõem cada cartela de teste e ordem de exibição — Tabela cenario_candidatos"
        globalActions={
          <button
            type="button"
            data-testid="btn-link-scenario-candidate"
            onClick={handleOpenDrawer}
            style={{
              padding: "9px 16px",
              borderRadius: "12px",
              border: "none",
              backgroundColor: colors.primaryContainer,
              color: colors.onPrimary,
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            + Vincular Candidato ao Cenário
          </button>
        }
        tabs={[
          { id: "TODOS", label: "Todas as Cartelas", count: records.length },
          { id: "CENARIO_1", label: "Cenário 1 (1º Turno)", count: records.filter((r) => r.scenarioId === 1).length },
          { id: "CENARIO_2", label: "Cenário 2 (2º Turno)", count: records.filter((r) => r.scenarioId === 2).length },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        kpis={[
          { id: "kpi-sc-total", label: "Candidatos em Cartelas", value: records.length, helperText: "Tabela cenario_candidatos", variant: "default" },
          { id: "kpi-sc-scenarios", label: "Cenários Configurados", value: new Set(records.map((r) => r.scenarioId)).size, helperText: "Espontânea / Estimulada", variant: "success" },
          { id: "kpi-sc-rotation", label: "Disco de Rotação", value: "Aleatorizado", helperText: "Equilíbrio de probabilidade", variant: "success" },
        ]}
        searchPlaceholder="Buscar por candidato, partido ou cenário..."
        searchValue={search}
        onSearchChange={setSearch}
        columns={[
          {
            header: "Foto",
            key: "photoUrl",
            width: "60px",
            render: (r) => (
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: "1.5px solid var(--outline-variant, #424750)",
                  backgroundColor: "var(--surface-elevated, #2a2a2a)",
                  color: "var(--text-muted, #9aa0a6)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "12px",
                  flexShrink: 0,
                }}
              >
                {r.photoUrl ? (
                  <img
                    src={r.photoUrl}
                    alt={r.candidateName}
                    style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%", display: "block" }}
                  />
                ) : (
                  getInitials(r.candidateName)
                )}
              </div>
            ),
          },
          { header: "Cenário", key: "scenarioId", render: (r) => <span style={{ fontWeight: 700, color: colors.primary }}>{r.scenarioLabel}</span> },
          { header: "Ordem Base", key: "displayOrder", render: (r) => <span style={{ fontWeight: 700, color: colors.textPrimary }}>Posição #{r.displayOrder}</span> },
          { header: "Nome de Urna", key: "candidateName", render: (r) => <span style={{ fontWeight: 600, color: colors.textPrimary }}>{r.candidateName}</span> },
          { header: "Partido / Legenda", key: "partyAcronym", render: (r) => <span style={{ padding: "2px 8px", borderRadius: "6px", backgroundColor: colors.surfaceContainerHigh, color: colors.warningPastel, fontSize: "11px", fontWeight: 600 }}>{r.partyAcronym}</span> },
          { header: "Cargo / Disputa", key: "roleCategory", render: (r) => <span style={{ color: colors.textMuted }}>{r.roleCategory}</span> },
        ]}
        data={filtered}
        keyExtractor={(r) => r.id}
        renderRowActions={(r) => (
          <button
            type="button"
            data-testid={`btn-remove-scenario-candidate-${r.id}`}
            disabled={removingKey === r.id}
            onClick={() => void handleRemove(r)}
            style={{
              padding: "5px 10px",
              borderRadius: "8px",
              border: `1px solid ${colors.borderSubtle}`,
              backgroundColor: "transparent",
              color: colors.errorPastel,
              fontSize: "12px",
              fontWeight: 600,
              cursor: removingKey === r.id ? "not-allowed" : "pointer",
              opacity: removingKey === r.id ? 0.5 : 1,
            }}
          >
            {removingKey === r.id ? "Removendo..." : "Remover"}
          </button>
        )}
      />

      <SlideOverDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Vincular Candidato ao Cenário"
        subtitle="Associe um candidato ou produto à cartela do cenário e defina sua ordem base de apresentação."
        footerActions={
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              style={{
                padding: "8px 16px",
                borderRadius: "10px",
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
              data-testid="btn-submit-scenario-candidate"
              disabled={submitting}
              onClick={() => void handleLinkSubmit()}
              style={{
                padding: "8px 18px",
                borderRadius: "10px",
                border: "none",
                backgroundColor: colors.primaryContainer,
                color: colors.onPrimary,
                fontSize: "13px",
                fontWeight: 600,
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.5 : 1,
              }}
            >
              {submitting ? "Vinculando..." : "Vincular"}
            </button>
          </div>
        }
      >
        <form
          onSubmit={(e) => void handleLinkSubmit(e)}
          style={{ display: "flex", flexDirection: "column", gap: "16px" }}
        >
          {formError && (
            <div
              role="alert"
              style={{
                padding: "10px 12px",
                borderRadius: "10px",
                backgroundColor: "rgba(242, 139, 130, 0.12)",
                border: `1px solid ${colors.errorPastel}`,
                color: colors.errorPastel,
                fontSize: "12px",
                fontWeight: 500,
              }}
            >
              {formError}
            </div>
          )}

          <div>
            <label style={LABEL_STYLE}>Cenário *</label>
            <SearchableCombobox
              options={scenarioOptions}
              value={selectedScenarioId}
              onChange={handleScenarioChange}
              placeholder="Selecione ou busque o cenário..."
              required
            />
          </div>

          <div>
            <label style={LABEL_STYLE}>Candidato / Produto *</label>
            <SearchableCombobox
              options={availableCandidateOptions}
              value={selectedCandidateId}
              onChange={(val) => {
                setSelectedCandidateId(val);
                setFormError(null);
              }}
              placeholder={
                availableCandidateOptions.length === 0
                  ? "Todos os candidatos já estão vinculados a este cenário"
                  : "Selecione ou busque o candidato..."
              }
              disabled={availableCandidateOptions.length === 0}
              required
            />
          </div>

          <div>
            <label style={LABEL_STYLE}>Ordem de Apresentação *</label>
            <input
              type="number"
              min={1}
              value={displayOrder}
              onChange={(e) => setDisplayOrder(e.target.value)}
              required
              style={INPUT_STYLE}
            />
          </div>
        </form>
      </SlideOverDrawer>
    </>
  );
}
