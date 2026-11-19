import React, { useCallback, useEffect, useMemo, useState } from "react";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";
import { EleitoradoTseDialogModal, type EleitoradoTseFormPayload } from "./EleitoradoTseDialogModal";

const { colors } = NOCTURNE_TOKENS;
const API_INTEGRACOES = "http://127.0.0.1:8000/api/v1/integracoes";
const API_AMOSTRAGEM = "http://127.0.0.1:8000/api/v1/amostragem";

const INPUT_STYLE: React.CSSProperties = {
  padding: "7px 10px",
  borderRadius: "8px",
  border: `1px solid ${colors.borderSubtle}`,
  backgroundColor: colors.surfaceContainer,
  color: colors.textPrimary,
  fontSize: "12px",
};

const KPI_CARD: React.CSSProperties = {
  backgroundColor: colors.surfaceContainerLow,
  border: `1px solid ${colors.borderSubtle}`,
  borderRadius: "12px",
  padding: "14px 16px",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

export function TseIbgeCapturesFeature(): React.JSX.Element {
  const [registros, setRegistros] = useState<any[]>([]);
  const [municipios, setMunicipios] = useState<any[]>([]);
  const [bairros, setBairros] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [eleitoradosTse, setEleitoradosTse] = useState<any[]>([]);

  const [filterMunicipioId, setFilterMunicipioId] = useState<string>("");
  const [filterTipoCaptura, setFilterTipoCaptura] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const [eleitoradoModalOpen, setEleitoradoModalOpen] = useState(false);
  const [editingEleitoradoRecord, setEditingEleitoradoRecord] = useState<any | null>(null);

  const loadOpcoes = useCallback(async (): Promise<void> => {
    const res = await fetch(`${API_AMOSTRAGEM}/opcoes`, { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setMunicipios(Array.isArray(data?.municipios) ? data.municipios : []);
    setBairros(Array.isArray(data?.bairros) ? data.bairros : []);
    setUsuarios(Array.isArray(data?.usuarios) ? data.usuarios : []);
    setEleitoradosTse(Array.isArray(data?.eleitorados_tse) ? data.eleitorados_tse : []);
  }, []);

  const loadHistorico = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterMunicipioId) params.set("id_municipio", filterMunicipioId);
      if (filterTipoCaptura) params.set("tipo_captura", filterTipoCaptura);
      const qs = params.toString() ? `?${params.toString()}` : "";
      const res = await fetch(`${API_INTEGRACOES}/historico-tse-ibge${qs}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setRegistros(Array.isArray(data?.registros) ? data.registros : []);
    } finally {
      setLoading(false);
    }
  }, [filterMunicipioId, filterTipoCaptura]);

  const refreshAll = useCallback(async (): Promise<void> => {
    await Promise.all([loadOpcoes(), loadHistorico()]);
  }, [loadOpcoes, loadHistorico]);

  useEffect(() => {
    void loadOpcoes();
  }, [loadOpcoes]);

  useEffect(() => {
    void loadHistorico();
  }, [loadHistorico]);

  const handleSaveEleitoradoTse = async (payload: EleitoradoTseFormPayload, editingId: number | null): Promise<void> => {
    const url = editingId ? `${API_AMOSTRAGEM}/eleitorado-tse/${editingId}` : `${API_AMOSTRAGEM}/eleitorado-tse`;
    const method = editingId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody?.detail || "Erro ao salvar registro de eleitorado TSE.");
    }
    await refreshAll();
  };

  const handleDeleteEleitoradoTse = async (idEleitoradoTse: number): Promise<void> => {
    const res = await fetch(`${API_AMOSTRAGEM}/eleitorado-tse/${idEleitoradoTse}`, { method: "DELETE" });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody?.detail || "Não foi possível excluir o registro.");
    }
    await refreshAll();
  };

  const kpis = useMemo(() => {
    const sortedByLatestQuery = [...registros].sort((a, b) => {
      const dateA = a.data_captura ? new Date(a.data_captura).getTime() : 0;
      const dateB = b.data_captura ? new Date(b.data_captura).getTime() : 0;
      if (dateB !== dateA) return dateB - dateA;
      if ((b.ano_referencia ?? 0) !== (a.ano_referencia ?? 0)) {
        return (b.ano_referencia ?? 0) - (a.ano_referencia ?? 0);
      }
      if ((b.mes_referencia ?? 0) !== (a.mes_referencia ?? 0)) {
        return (b.mes_referencia ?? 0) - (a.mes_referencia ?? 0);
      }
      return (b.id_eleitorado_tse ?? 0) - (a.id_eleitorado_tse ?? 0);
    });

    const munSet = new Set<number>();
    let totalPopulacaoMaisRecente = 0;
    let automaticas = 0;
    for (const r of sortedByLatestQuery) {
      if (r.tipo_captura === "automatica") automaticas += 1;
      if (!munSet.has(r.id_municipio)) {
        munSet.add(r.id_municipio);
        const pop = Number(r.populacao_ibge || 0);
        totalPopulacaoMaisRecente += pop > 0 ? pop : Number(r.quantidade_eleitores || 0);
      }
    }
    return {
      totalRegistros: registros.length,
      municipiosCount: munSet.size,
      totalPopulacaoMaisRecente,
      automaticas,
    };
  }, [registros]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px", color: colors.textPrimary }}>
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "20px" }}>Registros TSE / IBGE</h2>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: colors.onSurfaceVariant }}>
            Histórico auditado das gravações oficiais adquiridas dos servidores do TSE e IBGE.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => void refreshAll()}
            style={{
              padding: "9px 14px",
              borderRadius: "8px",
              border: `1px solid ${colors.borderSubtle}`,
              backgroundColor: colors.surfaceContainer,
              color: colors.textPrimary,
              fontWeight: 600,
              fontSize: "12.5px",
              cursor: "pointer",
            }}
          >
            {loading ? "Atualizando..." : "Atualizar"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingEleitoradoRecord(null);
              setEleitoradoModalOpen(true);
            }}
            style={{
              padding: "9px 14px",
              borderRadius: "8px",
              border: `1px solid ${colors.borderSubtle}`,
              backgroundColor: colors.surfaceContainer,
              color: "#81c995",
              fontWeight: 700,
              fontSize: "12.5px",
              cursor: "pointer",
            }}
          >
            + Eleitorado TSE
          </button>
        </div>
      </div>

      {/* KPI STRIP */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
        <div style={KPI_CARD}>
          <span style={{ fontSize: "11px", color: colors.onSurfaceVariant }}>Total de Gravações</span>
          <strong style={{ fontSize: "20px", color: colors.textPrimary }}>{kpis.totalRegistros}</strong>
        </div>
        <div style={KPI_CARD}>
          <span style={{ fontSize: "11px", color: colors.onSurfaceVariant }}>Municípios Registrados</span>
          <strong style={{ fontSize: "20px", color: "#8ab4f8" }}>{kpis.municipiosCount}</strong>
        </div>
        <div style={KPI_CARD}>
          <span style={{ fontSize: "11px", color: colors.onSurfaceVariant }}>Eleitorado (Ref. mais recente)</span>
          <strong style={{ fontSize: "20px", color: "#81c995" }}>
            {kpis.totalPopulacaoMaisRecente.toLocaleString("pt-BR")}
          </strong>
        </div>
        <div style={KPI_CARD}>
          <span style={{ fontSize: "11px", color: colors.onSurfaceVariant }}>Capturas Automáticas (TSE/IBGE)</span>
          <strong style={{ fontSize: "20px", color: "#fbbc04" }}>{kpis.automaticas}</strong>
        </div>
      </div>

      {/* TABELA DE RESULTADOS */}
      <div style={{ backgroundColor: colors.surfaceContainerLow, border: `1px solid ${colors.borderSubtle}`, borderRadius: "14px", padding: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "12px" }}>
          <h3 style={{ margin: 0, fontSize: "14px" }}>
            Gravações Adquiridas ({registros.length})
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "12px", color: colors.onSurfaceVariant }}>Município:</span>
              <select
                style={INPUT_STYLE}
                value={filterMunicipioId}
                onChange={(e) => setFilterMunicipioId(e.target.value)}
              >
                <option value="">Todos os Municípios</option>
                {municipios.map((m) => (
                  <option key={m.id_municipio} value={m.id_municipio}>
                    {m.nome} / {m.uf}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "12px", color: colors.onSurfaceVariant }}>Captura:</span>
              <select
                style={INPUT_STYLE}
                value={filterTipoCaptura}
                onChange={(e) => setFilterTipoCaptura(e.target.value)}
              >
                <option value="">Todas</option>
                <option value="automatica">Automática</option>
                <option value="manual">Manual</option>
              </select>
            </div>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.borderSubtle}`, textAlign: "left", color: colors.onSurfaceVariant }}>
                <th style={{ padding: "8px 6px" }}>ID</th>
                <th style={{ padding: "8px 6px" }}>Município / UF</th>
                <th style={{ padding: "8px 6px" }}>Mês</th>
                <th style={{ padding: "8px 6px" }}>Ano</th>
                <th style={{ padding: "8px 6px" }}>Eleitores TSE</th>
                <th style={{ padding: "8px 6px" }}>Biometria</th>
                <th style={{ padding: "8px 6px" }}>Pop. IBGE</th>
                <th style={{ padding: "8px 6px" }}>Captura</th>
                <th style={{ padding: "8px 6px" }}>Usuário</th>
                <th style={{ padding: "8px 6px" }}>Organização</th>
                <th style={{ padding: "8px 6px" }}>Data / Hora</th>
                <th style={{ padding: "8px 6px" }}>Amostras</th>
                <th style={{ padding: "8px 6px", textAlign: "right" }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => {
                const bioPct =
                  r.quantidade_eleitores > 0
                    ? ((Number(r.eleitores_biometria || 0) / Number(r.quantidade_eleitores)) * 100).toFixed(1)
                    : "0.0";
                return (
                  <tr
                    key={r.id_eleitorado_tse}
                    onClick={() => {
                      setEditingEleitoradoRecord(r);
                      setEleitoradoModalOpen(true);
                    }}
                    style={{ borderBottom: `1px solid ${colors.borderSubtle}`, cursor: "pointer" }}
                  >
                    <td style={{ padding: "8px 6px" }}>#{r.id_eleitorado_tse}</td>
                    <td style={{ padding: "8px 6px", fontWeight: 600 }}>
                      {r.municipio_nome} / {r.uf}
                      {r.nome_bairro && (
                        <div style={{ fontSize: "10.5px", color: colors.onSurfaceVariant, fontWeight: 400 }}>
                          Bairro: {r.nome_bairro}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "8px 6px", fontWeight: 600 }}>
                      {String(r.mes_referencia).padStart(2, "0")}
                    </td>
                    <td style={{ padding: "8px 6px", fontWeight: 600 }}>
                      {r.ano_referencia}
                    </td>
                    <td style={{ padding: "8px 6px", color: "#8ab4f8", fontWeight: 700 }}>
                      {Number(r.quantidade_eleitores).toLocaleString("pt-BR")}
                    </td>
                    <td style={{ padding: "8px 6px" }}>
                      {Number(r.eleitores_biometria).toLocaleString("pt-BR")}{" "}
                      <span style={{ color: colors.onSurfaceVariant, fontSize: "11px" }}>({bioPct}%)</span>
                    </td>
                    <td style={{ padding: "8px 6px", color: "#81c995", fontWeight: 600 }}>
                      {r.populacao_ibge != null ? Number(r.populacao_ibge).toLocaleString("pt-BR") : "—"}
                    </td>
                    <td style={{ padding: "8px 6px" }}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: "999px",
                          fontSize: "11px",
                          fontWeight: 600,
                          backgroundColor:
                            r.tipo_captura === "automatica"
                              ? "rgba(129, 201, 149, 0.16)"
                              : "rgba(251, 188, 4, 0.16)",
                          color: r.tipo_captura === "automatica" ? "#81c995" : "#fbbc04",
                        }}
                      >
                        {r.tipo_captura}
                      </span>
                    </td>
                    <td style={{ padding: "8px 6px", fontSize: "11.5px" }}>
                      {r.usuario_nome ? `${r.usuario_nome} (#${r.id_usuario_captura})` : r.id_usuario_captura ? `#${r.id_usuario_captura}` : "—"}
                    </td>
                    <td style={{ padding: "8px 6px", fontSize: "11.5px" }}>
                      {r.organizacao_nome ? `${r.organizacao_nome} (#${r.id_organizacao})` : r.id_organizacao ? `#${r.id_organizacao}` : "—"}
                    </td>
                    <td style={{ padding: "8px 6px", fontSize: "11px", color: colors.onSurfaceVariant }}>
                      {r.data_captura ? new Date(r.data_captura).toLocaleString("pt-BR") : "—"}
                    </td>
                    <td style={{ padding: "8px 6px", fontWeight: 600 }}>
                      {Number(r.amostras_vinculadas || 0)}
                    </td>
                    <td style={{ padding: "8px 6px", textAlign: "right", display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingEleitoradoRecord(r);
                          setEleitoradoModalOpen(true);
                        }}
                        style={{
                          padding: "5px 10px",
                          borderRadius: "6px",
                          border: "1px solid #353535",
                          backgroundColor: "#2a2a2a",
                          color: "#81c995",
                          fontSize: "11px",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Ver / Editar
                      </button>
                    </td>
                  </tr>
                );
              })}
              {registros.length === 0 && (
                <tr>
                  <td colSpan={13} style={{ padding: "14px 6px", color: colors.onSurfaceVariant }}>
                    Nenhum registro encontrado na tabela <code>eleitorado_tse</code>.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <EleitoradoTseDialogModal
        isOpen={eleitoradoModalOpen}
        onClose={() => {
          setEleitoradoModalOpen(false);
          setEditingEleitoradoRecord(null);
        }}
        onSave={handleSaveEleitoradoTse}
        onDelete={handleDeleteEleitoradoTse}
        onRefreshOpcoes={refreshAll}
        municipios={municipios}
        bairros={bairros}
        usuarios={usuarios}
        eleitoradosTse={eleitoradosTse}
        initialRecord={editingEleitoradoRecord}
        defaultMunicipioId={filterMunicipioId}
      />
    </div>
  );
}
