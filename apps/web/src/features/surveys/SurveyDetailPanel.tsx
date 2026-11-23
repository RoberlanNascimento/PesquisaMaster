import React, { useState, useEffect, useCallback } from "react";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";
import type { SurveyRecord } from "./surveysData";
import {
  type AtribuicaoOut,
  type BackendAmostraOut,
  type BackendBairroOut,
  type BackendMunicipioOut,
  type BackendProfissionalOut,
  createAmostraInDb,
  createAtribuicaoInDb,
  deleteAtribuicaoInDb,
  fetchAtribuicoesFromDb,
  fetchCampoOpcoesFromDb,
  fetchPesquisasAuxOptions,
  updatePesquisaInDb,
} from "./pesquisasApi";

const { colors } = NOCTURNE_TOKENS;

type DetailTab = "amostras" | "pesquisadores";

export interface SurveyDetailPanelProps {
  readonly survey: SurveyRecord;
  readonly onClose: () => void;
  readonly onSurveyUpdated: (updated: SurveyRecord) => void;
  readonly onNotify: (message: string, kind?: "success" | "error") => void;
}

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 11px",
  borderRadius: "10px",
  border: `1px solid ${colors.borderSubtle}`,
  backgroundColor: colors.surfaceContainerLow,
  color: colors.textPrimary,
  fontSize: "13px",
  outline: "none",
};

const LABEL_STYLE: React.CSSProperties = {
  display: "block",
  fontSize: "11px",
  fontWeight: 600,
  color: colors.textMuted,
  marginBottom: "4px",
};

export function SurveyDetailPanel({
  survey,
  onClose,
  onSurveyUpdated,
  onNotify,
}: SurveyDetailPanelProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<DetailTab>("amostras");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [amostras, setAmostras] = useState<readonly BackendAmostraOut[]>([]);
  const [municipios, setMunicipios] = useState<readonly BackendMunicipioOut[]>([]);
  const [profissionais, setProfissionais] = useState<readonly BackendProfissionalOut[]>([]);
  const [bairros, setBairros] = useState<readonly BackendBairroOut[]>([]);
  const [atribuicoes, setAtribuicoes] = useState<readonly AtribuicaoOut[]>([]);

  // Amostra inline form state
  const [selectedAmostraId, setSelectedAmostraId] = useState<string>(
    survey.dbAmostraId ? String(survey.dbAmostraId) : "",
  );
  const [showNewAmostraForm, setShowNewAmostraForm] = useState<boolean>(false);
  const [newAmostraDesc, setNewAmostraDesc] = useState<string>("");
  const [newAmostraMunId, setNewAmostraMunId] = useState<string>(
    survey.dbMunicipioId ? String(survey.dbMunicipioId) : "",
  );
  const [newAmostraN, setNewAmostraN] = useState<string>("600");
  const [newAmostraErro, setNewAmostraErro] = useState<string>("4.0");
  const [newAmostraConf, setNewAmostraConf] = useState<string>("95");
  const [submittingAmostra, setSubmittingAmostra] = useState<boolean>(false);

  // Atribuição inline form state
  const [showNewAtribForm, setShowNewAtribForm] = useState<boolean>(false);
  const [atribProfId, setAtribProfId] = useState<string>("");
  const [atribBairroId, setAtribBairroId] = useState<string>("");
  const [atribLote, setAtribLote] = useState<string>("Setor Centro");
  const [atribMeta, setAtribMeta] = useState<string>("50");
  const [submittingAtrib, setSubmittingAtrib] = useState<boolean>(false);
  const [deletingAtribId, setDeletingAtribId] = useState<number | null>(null);

  const loadChildData = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const [aux, campoOpcoes, allAtribs] = await Promise.all([
        fetchPesquisasAuxOptions(),
        fetchCampoOpcoesFromDb(),
        fetchAtribuicoesFromDb(),
      ]);
      setAmostras(aux.amostras);
      setMunicipios(aux.municipios);
      setProfissionais(
        campoOpcoes.profissionais.length > 0 ? campoOpcoes.profissionais : aux.profissionais,
      );
      setBairros(campoOpcoes.bairros);
      setAtribuicoes(allAtribs);

      if (!newAmostraMunId && (survey.dbMunicipioId || aux.municipios[0])) {
        setNewAmostraMunId(String(survey.dbMunicipioId ?? aux.municipios[0]?.id_municipio ?? ""));
      }
      if (!atribProfId && (campoOpcoes.profissionais[0] || aux.profissionais[0])) {
        setAtribProfId(
          String(
            campoOpcoes.profissionais[0]?.id_profissional ??
              aux.profissionais[0]?.id_profissional ??
              "",
          ),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar detalhes da pesquisa.");
    } finally {
      setLoading(false);
    }
  }, [survey.dbMunicipioId, newAmostraMunId, atribProfId]);

  useEffect(() => {
    setSelectedAmostraId(survey.dbAmostraId ? String(survey.dbAmostraId) : "");
    setNewAmostraMunId(survey.dbMunicipioId ? String(survey.dbMunicipioId) : "");
    void loadChildData();
  }, [survey.id, survey.dbAmostraId, survey.dbMunicipioId, loadChildData]);

  const surveyAtribuicoes = survey.dbId
    ? atribuicoes.filter((a) => a.id_pesquisa === survey.dbId)
    : [];

  const filteredBairros = survey.dbMunicipioId
    ? bairros.filter((b) => b.id_municipio === survey.dbMunicipioId)
    : bairros;

  const handleLinkAmostra = async (): Promise<void> => {
    if (!survey.dbId || !selectedAmostraId) return;
    setSubmittingAmostra(true);
    try {
      const updated = await updatePesquisaInDb(survey.dbId, {
        id_amostra: Number(selectedAmostraId),
      });
      onSurveyUpdated(updated);
      onNotify("Amostra vinculada à pesquisa.", "success");
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "Erro ao vincular amostra.", "error");
    } finally {
      setSubmittingAmostra(false);
    }
  };

  const handleCreateAmostra = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!newAmostraDesc.trim() || !newAmostraMunId) return;
    setSubmittingAmostra(true);
    try {
      const created = await createAmostraInDb({
        id_municipio: Number(newAmostraMunId),
        descricao: newAmostraDesc.trim(),
        nivel_confianca: Number(newAmostraConf) || 95,
        margem_erro: Number(newAmostraErro) || 4.0,
        populacao_universo: 100000,
        tamanho_amostral: Number(newAmostraN) || 600,
        gerar_cotas_automaticas: true,
      });

      if (survey.dbId) {
        const updated = await updatePesquisaInDb(survey.dbId, {
          id_amostra: created.id_amostra,
        });
        onSurveyUpdated(updated);
      }
      setNewAmostraDesc("");
      setShowNewAmostraForm(false);
      await loadChildData();
      onNotify("Nova amostra criada e vinculada.", "success");
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "Erro ao criar amostra.", "error");
    } finally {
      setSubmittingAmostra(false);
    }
  };

  const handleCreateAtribuicao = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!survey.dbId || !atribProfId || !atribLote.trim()) return;
    setSubmittingAtrib(true);
    try {
      await createAtribuicaoInDb({
        id_pesquisa: survey.dbId,
        id_profissional: Number(atribProfId),
        id_bairro: atribBairroId ? Number(atribBairroId) : null,
        lote_setor: atribLote.trim(),
        meta_entrevistas: Number(atribMeta) || 50,
        status_atribuicao: "ativa",
      });
      setShowNewAtribForm(false);
      await loadChildData();
      onNotify("Pesquisador atribuído com sucesso.", "success");
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "Erro ao atribuir pesquisador.", "error");
    } finally {
      setSubmittingAtrib(false);
    }
  };

  const handleDeleteAtribuicao = async (idAtribuicao: number): Promise<void> => {
    setDeletingAtribId(idAtribuicao);
    try {
      await deleteAtribuicaoInDb(idAtribuicao);
      setAtribuicoes((prev) => prev.filter((a) => a.id_atribuicao !== idAtribuicao));
      onNotify("Atribuição removida.", "success");
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "Erro ao remover atribuição.", "error");
    } finally {
      setDeletingAtribId(null);
    }
  };

  return (
    <section
      data-testid="survey-detail-panel"
      style={{
        backgroundColor: colors.surfaceCard,
        border: `1px solid ${colors.borderSubtle}`,
        borderRadius: "16px",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "12px",
          borderBottom: `1px solid ${colors.borderSubtle}`,
          paddingBottom: "14px",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: "11px", fontWeight: 600, color: colors.textMuted, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            {survey.protocolTse} • {survey.cityUf}
          </div>
          <h2
            style={{
              margin: "4px 0 0",
              fontSize: "17px",
              fontWeight: 600,
              color: colors.textPrimary,
              lineHeight: "22px",
            }}
          >
            {survey.title}
          </h2>
          <div style={{ fontSize: "12px", color: colors.textMuted, marginTop: "4px" }}>
            Período: {survey.fieldStartDate} a {survey.fieldEndDate} • {survey.statisticianName}
            {survey.createdByName ? ` • Criado por ${survey.createdByName}` : ""}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar painel de detalhes"
          style={{
            padding: "6px 10px",
            borderRadius: "10px",
            border: `1px solid ${colors.borderSubtle}`,
            backgroundColor: "transparent",
            color: colors.textMuted,
            fontSize: "13px",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          ✕
        </button>
      </div>

      {/* Child Tabs */}
      <div style={{ display: "flex", gap: "8px", borderBottom: `1px solid ${colors.borderSubtle}`, paddingBottom: "12px" }}>
        <button
          type="button"
          data-testid="tab-amostras-vinculadas"
          onClick={() => setActiveTab("amostras")}
          style={{
            padding: "7px 14px",
            borderRadius: "9999px",
            border: `1px solid ${activeTab === "amostras" ? colors.primaryContainer : colors.borderSubtle}`,
            backgroundColor: activeTab === "amostras" ? "rgba(138, 180, 248, 0.14)" : "transparent",
            color: activeTab === "amostras" ? colors.primary : colors.textMuted,
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Amostras Vinculadas ({survey.amostraResumo ? 1 : 0})
        </button>
        <button
          type="button"
          data-testid="tab-pesquisadores-atribuidos"
          onClick={() => setActiveTab("pesquisadores")}
          style={{
            padding: "7px 14px",
            borderRadius: "9999px",
            border: `1px solid ${activeTab === "pesquisadores" ? colors.primaryContainer : colors.borderSubtle}`,
            backgroundColor: activeTab === "pesquisadores" ? "rgba(138, 180, 248, 0.14)" : "transparent",
            color: activeTab === "pesquisadores" ? colors.primary : colors.textMuted,
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Pesquisadores Atribuídos ({surveyAtribuicoes.length})
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: "10px",
            backgroundColor: "rgba(242, 139, 130, 0.12)",
            border: `1px solid ${colors.errorPastel}`,
            color: colors.errorPastel,
            fontSize: "12px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadChildData()}
            style={{
              padding: "4px 10px",
              borderRadius: "8px",
              border: `1px solid ${colors.errorPastel}`,
              backgroundColor: "transparent",
              color: colors.errorPastel,
              fontSize: "11px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ height: "42px", borderRadius: "10px", backgroundColor: colors.surfaceContainerHigh, opacity: 0.6 }} />
          <div style={{ height: "42px", borderRadius: "10px", backgroundColor: colors.surfaceContainerHigh, opacity: 0.4 }} />
        </div>
      )}

      {/* TAB 1: Amostras Vinculadas */}
      {!loading && activeTab === "amostras" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {survey.amostraResumo ? (
            <div
              style={{
                padding: "14px 16px",
                borderRadius: "12px",
                backgroundColor: colors.surfaceContainerLow,
                border: `1px solid ${colors.borderSubtle}`,
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: "8px",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: colors.textPrimary }}>
                  {survey.amostraResumo.descricao}
                </div>
                <div style={{ fontSize: "12px", color: colors.textMuted, marginTop: "3px" }}>
                  N = {survey.amostraResumo.tamanhoAmostral.toLocaleString("pt-BR")} • IC {survey.amostraResumo.nivelConfianca}% • Margem ±{survey.amostraResumo.margemErro}%
                </div>
              </div>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "4px 10px",
                  borderRadius: "9999px",
                  backgroundColor: colors.successContainer,
                  color: colors.onSuccessContainer,
                }}
              >
                Vinculada
              </span>
            </div>
          ) : (
            <div
              style={{
                padding: "18px",
                borderRadius: "12px",
                border: `1px dashed ${colors.borderSubtle}`,
                textAlign: "center",
                color: colors.textMuted,
                fontSize: "13px",
              }}
            >
              Nenhuma amostra vinculada no banco para esta pesquisa.
            </div>
          )}

          {survey.dbId ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "flex-end", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: "220px" }}>
                  <label style={LABEL_STYLE}>Alterar / Vincular Amostra Existente</label>
                  <select
                    value={selectedAmostraId}
                    onChange={(e) => setSelectedAmostraId(e.target.value)}
                    style={INPUT_STYLE}
                  >
                    <option value="">Selecione uma amostra...</option>
                    {amostras.map((a) => (
                      <option key={a.id_amostra} value={String(a.id_amostra)}>
                        #{a.id_amostra} — {a.descricao} (N={a.tamanho_amostral})
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  disabled={submittingAmostra || !selectedAmostraId}
                  onClick={() => void handleLinkAmostra()}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "10px",
                    border: "none",
                    backgroundColor: colors.primaryContainer,
                    color: colors.onPrimary,
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: submittingAmostra ? "not-allowed" : "pointer",
                    opacity: submittingAmostra || !selectedAmostraId ? 0.5 : 1,
                  }}
                >
                  {submittingAmostra ? "Salvando..." : "Vincular"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewAmostraForm((prev) => !prev)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "10px",
                    border: `1px solid ${colors.borderSubtle}`,
                    backgroundColor: "transparent",
                    color: colors.textPrimary,
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {showNewAmostraForm ? "Cancelar" : "+ Nova Amostra"}
                </button>
              </div>

              {showNewAmostraForm && (
                <form
                  onSubmit={(e) => void handleCreateAmostra(e)}
                  style={{
                    padding: "14px",
                    borderRadius: "12px",
                    backgroundColor: colors.surfaceContainerLow,
                    border: `1px solid ${colors.borderSubtle}`,
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                    gap: "10px",
                  }}
                >
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={LABEL_STYLE}>Descrição da Amostra *</label>
                    <input
                      value={newAmostraDesc}
                      onChange={(e) => setNewAmostraDesc(e.target.value)}
                      placeholder="Ex: Plano Municipal 2026 — 600 entrevistas"
                      required
                      style={INPUT_STYLE}
                    />
                  </div>
                  <div>
                    <label style={LABEL_STYLE}>Município *</label>
                    <select
                      value={newAmostraMunId}
                      onChange={(e) => setNewAmostraMunId(e.target.value)}
                      required
                      style={INPUT_STYLE}
                    >
                      <option value="">Selecione...</option>
                      {municipios.map((m) => (
                        <option key={m.id_municipio} value={String(m.id_municipio)}>
                          {m.nome} / {m.estado}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={LABEL_STYLE}>Tamanho (N) *</label>
                    <input
                      type="number"
                      min={50}
                      value={newAmostraN}
                      onChange={(e) => setNewAmostraN(e.target.value)}
                      required
                      style={INPUT_STYLE}
                    />
                  </div>
                  <div>
                    <label style={LABEL_STYLE}>Margem de Erro (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newAmostraErro}
                      onChange={(e) => setNewAmostraErro(e.target.value)}
                      style={INPUT_STYLE}
                    />
                  </div>
                  <div>
                    <label style={LABEL_STYLE}>Confiança (%)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={newAmostraConf}
                      onChange={(e) => setNewAmostraConf(e.target.value)}
                      style={INPUT_STYLE}
                    />
                  </div>
                  <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
                    <button
                      type="submit"
                      disabled={submittingAmostra}
                      style={{
                        padding: "8px 16px",
                        borderRadius: "10px",
                        border: "none",
                        backgroundColor: colors.primaryContainer,
                        color: colors.onPrimary,
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: submittingAmostra ? "not-allowed" : "pointer",
                        opacity: submittingAmostra ? 0.5 : 1,
                      }}
                    >
                      {submittingAmostra ? "Criando..." : "Criar e Vincular Amostra"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div style={{ fontSize: "12px", color: colors.textMuted }}>
              Registro local (não persistido no PostgreSQL). Salve a pesquisa no banco para vincular amostras.
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Pesquisadores Atribuídos */}
      {!loading && activeTab === "pesquisadores" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: colors.textMuted }}>
              Equipe de campo alocada nesta pesquisa
            </span>
            {survey.dbId && (
              <button
                type="button"
                data-testid="btn-toggle-new-atribuicao"
                onClick={() => setShowNewAtribForm((prev) => !prev)}
                style={{
                  padding: "7px 13px",
                  borderRadius: "10px",
                  border: "none",
                  backgroundColor: colors.primaryContainer,
                  color: colors.onPrimary,
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {showNewAtribForm ? "Cancelar" : "+ Atribuir Pesquisador"}
              </button>
            )}
          </div>

          {showNewAtribForm && survey.dbId && (
            <form
              onSubmit={(e) => void handleCreateAtribuicao(e)}
              style={{
                padding: "14px",
                borderRadius: "12px",
                backgroundColor: colors.surfaceContainerLow,
                border: `1px solid ${colors.borderSubtle}`,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: "10px",
              }}
            >
              <div>
                <label style={LABEL_STYLE}>Pesquisador *</label>
                <select
                  value={atribProfId}
                  onChange={(e) => setAtribProfId(e.target.value)}
                  required
                  style={INPUT_STYLE}
                >
                  <option value="">Selecione...</option>
                  {profissionais.map((p) => (
                    <option key={p.id_profissional} value={String(p.id_profissional)}>
                      {p.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={LABEL_STYLE}>Bairro (Opcional)</label>
                <select
                  value={atribBairroId}
                  onChange={(e) => setAtribBairroId(e.target.value)}
                  style={INPUT_STYLE}
                >
                  <option value="">Todos / Geral</option>
                  {filteredBairros.map((b) => (
                    <option key={b.id_bairro} value={String(b.id_bairro)}>
                      {b.nome_bairro}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={LABEL_STYLE}>Lote / Setor *</label>
                <input
                  value={atribLote}
                  onChange={(e) => setAtribLote(e.target.value)}
                  placeholder="Ex: Setor Norte"
                  required
                  style={INPUT_STYLE}
                />
              </div>
              <div>
                <label style={LABEL_STYLE}>Meta de Entrevistas *</label>
                <input
                  type="number"
                  min={1}
                  value={atribMeta}
                  onChange={(e) => setAtribMeta(e.target.value)}
                  required
                  style={INPUT_STYLE}
                />
              </div>
              <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="submit"
                  disabled={submittingAtrib}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "10px",
                    border: "none",
                    backgroundColor: colors.primaryContainer,
                    color: colors.onPrimary,
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: submittingAtrib ? "not-allowed" : "pointer",
                    opacity: submittingAtrib ? 0.5 : 1,
                  }}
                >
                  {submittingAtrib ? "Atribuindo..." : "Confirmar Atribuição"}
                </button>
              </div>
            </form>
          )}

          {surveyAtribuicoes.length === 0 ? (
            <div
              style={{
                padding: "18px",
                borderRadius: "12px",
                border: `1px dashed ${colors.borderSubtle}`,
                textAlign: "center",
                color: colors.textMuted,
                fontSize: "13px",
              }}
            >
              Nenhum pesquisador atribuído a esta pesquisa ainda.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${colors.borderSubtle}`, textAlign: "left" }}>
                    <th style={{ padding: "8px 10px", fontSize: "11px", color: colors.textMuted, fontWeight: 600, textTransform: "uppercase" }}>Pesquisador</th>
                    <th style={{ padding: "8px 10px", fontSize: "11px", color: colors.textMuted, fontWeight: 600, textTransform: "uppercase" }}>Lote / Setor</th>
                    <th style={{ padding: "8px 10px", fontSize: "11px", color: colors.textMuted, fontWeight: 600, textTransform: "uppercase" }}>Meta</th>
                    <th style={{ padding: "8px 10px", fontSize: "11px", color: colors.textMuted, fontWeight: 600, textTransform: "uppercase" }}>Status</th>
                    <th style={{ padding: "8px 10px", textAlign: "right", fontSize: "11px", color: colors.textMuted, fontWeight: 600, textTransform: "uppercase" }}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {surveyAtribuicoes.map((a) => (
                    <tr key={a.id_atribuicao} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                      <td style={{ padding: "10px", color: colors.textPrimary, fontWeight: 500 }}>
                        {a.profissional_nome || `Profissional #${a.id_profissional}`}
                      </td>
                      <td style={{ padding: "10px", color: colors.textMuted }}>{a.lote_setor}</td>
                      <td style={{ padding: "10px", color: colors.textPrimary }}>{a.meta_entrevistas}</td>
                      <td style={{ padding: "10px" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: "9999px",
                            backgroundColor: colors.surfaceContainerHigh,
                            color: colors.textPrimary,
                          }}
                        >
                          {a.status_atribuicao}
                        </span>
                      </td>
                      <td style={{ padding: "10px", textAlign: "right" }}>
                        <button
                          type="button"
                          disabled={deletingAtribId === a.id_atribuicao}
                          onClick={() => void handleDeleteAtribuicao(a.id_atribuicao)}
                          style={{
                            padding: "4px 10px",
                            borderRadius: "8px",
                            border: `1px solid ${colors.borderSubtle}`,
                            backgroundColor: "transparent",
                            color: colors.errorPastel,
                            fontSize: "11px",
                            fontWeight: 600,
                            cursor: deletingAtribId === a.id_atribuicao ? "not-allowed" : "pointer",
                            opacity: deletingAtribId === a.id_atribuicao ? 0.5 : 1,
                          }}
                        >
                          {deletingAtribId === a.id_atribuicao ? "..." : "Remover"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
