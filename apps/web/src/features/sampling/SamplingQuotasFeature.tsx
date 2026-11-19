import React, { useEffect, useState } from "react";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";
import { AddCotaDialogModal, type ManualCotaPayload } from "./AddCotaDialogModal";
import { AmostraDialogModal, type AmostraFormPayload } from "./AmostraDialogModal";
import { EleitoradoTseDialogModal, type EleitoradoTseFormPayload } from "./EleitoradoTseDialogModal";

const { colors } = NOCTURNE_TOKENS;
const API_BASE = "http://127.0.0.1:8000/api/v1/amostragem";

const INPUT_STYLE: React.CSSProperties = {
  padding: "7px 10px",
  borderRadius: "8px",
  border: `1px solid ${colors.borderSubtle}`,
  backgroundColor: colors.surfaceContainer,
  color: colors.textPrimary,
  fontSize: "12px",
};

export function SamplingQuotasFeature(): React.JSX.Element {
  const [municipios, setMunicipios] = useState<any[]>([]);
  const [amostras, setAmostras] = useState<any[]>([]);
  const [bairros, setBairros] = useState<any[]>([]);
  const [eleitoradosTse, setEleitoradosTse] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [filterMunicipioId, setFilterMunicipioId] = useState<string>("");
  const [selectedAmostraId, setSelectedAmostraId] = useState<number | null>(null);
  const [cotas, setCotas] = useState<any[]>([]);
  const [selectedCotaId, setSelectedCotaId] = useState<number | null>(null);

  const [amostraModalOpen, setAmostraModalOpen] = useState(false);
  const [editingAmostra, setEditingAmostra] = useState<any | null>(null);
  const [eleitoradoModalOpen, setEleitoradoModalOpen] = useState(false);
  const [addCotaModalOpen, setAddCotaModalOpen] = useState(false);

  const loadOpcoes = async (): Promise<void> => {
    const res = await fetch(`${API_BASE}/opcoes`, { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    const muns = Array.isArray(data?.municipios) ? data.municipios : [];
    const ams = Array.isArray(data?.amostras) ? data.amostras : [];
    const brs = Array.isArray(data?.bairros) ? data.bairros : [];
    const tse = Array.isArray(data?.eleitorados_tse) ? data.eleitorados_tse : [];
    const usrs = Array.isArray(data?.usuarios) ? data.usuarios : [];
    setMunicipios(muns);
    setAmostras(ams);
    setBairros(brs);
    setEleitoradosTse(tse);
    setUsuarios(usrs);
    if (ams.length > 0 && (selectedAmostraId === null || !ams.some((a: any) => a.id_amostra === selectedAmostraId))) {
      setSelectedAmostraId(ams[0].id_amostra);
    } else if (ams.length === 0) {
      setSelectedAmostraId(null);
      setCotas([]);
    }
  };

  const loadDetalhes = async (idAmostra: number): Promise<void> => {
    const res = await fetch(`${API_BASE}/amostras/${idAmostra}/detalhes`, { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setCotas(Array.isArray(data?.cotas) ? data.cotas : []);
  };

  useEffect(() => {
    void loadOpcoes();
  }, []);

  useEffect(() => {
    if (selectedAmostraId !== null) void loadDetalhes(selectedAmostraId);
  }, [selectedAmostraId]);

  const handleSaveAmostra = async (payload: AmostraFormPayload, editingId: number | null): Promise<void> => {
    const url = editingId ? `${API_BASE}/amostras/${editingId}` : `${API_BASE}/amostras`;
    const method = editingId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody?.detail || "Erro ao salvar amostra no banco de dados.");
    }
    const saved = await res.json();
    await loadOpcoes();
    if (saved?.id_amostra) {
      setSelectedAmostraId(saved.id_amostra);
      await loadDetalhes(saved.id_amostra);
    }
  };

  const handleDeleteAmostra = async (idAmostra: number): Promise<void> => {
    const res = await fetch(`${API_BASE}/amostras/${idAmostra}`, { method: "DELETE" });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody?.detail || "Não foi possível excluir a amostra.");
    }
    if (selectedAmostraId === idAmostra) {
      setSelectedAmostraId(null);
      setCotas([]);
    }
    await loadOpcoes();
  };

  const handleSaveEleitoradoTse = async (payload: EleitoradoTseFormPayload, editingId: number | null): Promise<void> => {
    const url = editingId ? `${API_BASE}/eleitorado-tse/${editingId}` : `${API_BASE}/eleitorado-tse`;
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
    await loadOpcoes();
  };

  const handleDeleteEleitoradoTse = async (idEleitoradoTse: number): Promise<void> => {
    const res = await fetch(`${API_BASE}/eleitorado-tse/${idEleitoradoTse}`, { method: "DELETE" });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody?.detail || "Não foi possível excluir o registro de eleitorado TSE.");
    }
    await loadOpcoes();
  };

  const handleSaveManualCota = async (payload: ManualCotaPayload): Promise<void> => {
    if (!selectedAmostraId) return;
    const res = await fetch(`${API_BASE}/amostras/${selectedAmostraId}/cotas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      await loadDetalhes(selectedAmostraId);
    }
  };

  const handleUpdateCota = async (idCota: number, pct: number, qtd: number): Promise<void> => {
    const res = await fetch(`${API_BASE}/cotas/${idCota}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ percentual_meta: pct, quantidade_meta: qtd }),
    });
    if (res.ok && selectedAmostraId) await loadDetalhes(selectedAmostraId);
  };

  const handleDeleteCota = async (idCota: number): Promise<void> => {
    const res = await fetch(`${API_BASE}/cotas/${idCota}`, { method: "DELETE" });
    if (res.ok && selectedAmostraId) await loadDetalhes(selectedAmostraId);
  };

  const selectedAmostra = amostras.find((a) => a.id_amostra === selectedAmostraId);
  const amostrasVisiveis = filterMunicipioId
    ? amostras.filter((a) => String(a.id_municipio) === filterMunicipioId)
    : amostras;
  const filteredBairros = selectedAmostra
    ? bairros.filter((b) => b.id_municipio === selectedAmostra.id_municipio)
    : bairros;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", color: colors.textPrimary }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "20px" }}>Planejamento Amostral & Cotas Hare-Niemeyer (TSE)</h2>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: colors.onSurfaceVariant }}>
            Defina a amostragem por município (automática via parâmetros TSE ou manual) e ajuste cotas por dimensão e bairro/zona.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setEleitoradoModalOpen(true)}
            style={{
              padding: "9px 16px",
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
          <button
            type="button"
            onClick={() => {
              setEditingAmostra(null);
              setAmostraModalOpen(true);
            }}
            style={{
              padding: "9px 16px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "#8ab4f8",
              color: "#003061",
              fontWeight: 700,
              fontSize: "12.5px",
              cursor: "pointer",
            }}
          >
            + Adicionar Amostra
          </button>
        </div>
      </div>

      <div style={{ backgroundColor: colors.surfaceContainerLow, border: `1px solid ${colors.borderSubtle}`, borderRadius: "14px", padding: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "10px" }}>
          <h3 style={{ margin: 0, fontSize: "14px" }}>
            Amostragens Salvas ({amostrasVisiveis.length})
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", color: colors.onSurfaceVariant }}>Filtrar Município:</span>
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
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.borderSubtle}`, textAlign: "left", color: colors.onSurfaceVariant }}>
                <th style={{ padding: "6px" }}>ID</th>
                <th style={{ padding: "6px" }}>Município</th>
                <th style={{ padding: "6px" }}>Descrição</th>
                <th style={{ padding: "6px" }}>Data</th>
                <th style={{ padding: "6px" }}>N Amostral</th>
                <th style={{ padding: "6px" }}>Confiança / Margem</th>
                <th style={{ padding: "6px" }}>Universo</th>
                <th style={{ padding: "6px", textAlign: "right" }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {amostrasVisiveis.map((a) => (
                <tr
                  key={a.id_amostra}
                  onClick={() => setSelectedAmostraId(a.id_amostra)}
                  style={{
                    borderBottom: `1px solid ${colors.borderSubtle}`,
                    backgroundColor: a.id_amostra === selectedAmostraId ? "#1e293b" : "transparent",
                    cursor: "pointer",
                  }}
                >
                  <td style={{ padding: "6px" }}>#{a.id_amostra}</td>
                  <td style={{ padding: "6px" }}>{a.municipio_nome ? `${a.municipio_nome} / ${a.uf || ""}` : "—"}</td>
                  <td style={{ padding: "6px", fontWeight: 600 }}>{a.descricao}</td>
                  <td style={{ padding: "6px", color: colors.onSurfaceVariant, fontSize: "11.5px" }}>
                    {a.calculado_em ? new Date(a.calculado_em).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td style={{ padding: "6px", color: "#8ab4f8", fontWeight: 600 }}>{a.tamanho_amostral}</td>
                  <td style={{ padding: "6px" }}>{a.nivel_confianca}% / {a.margem_erro}%</td>
                  <td style={{ padding: "6px" }}>{Number(a.populacao_universo).toLocaleString("pt-BR")}</td>
                  <td style={{ padding: "6px", textAlign: "right", display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingAmostra(a);
                        setAmostraModalOpen(true);
                      }}
                      style={{ padding: "4px 10px", borderRadius: "6px", border: "1px solid #353535", backgroundColor: "#2a2a2a", color: "#fbbc04", fontSize: "11px", cursor: "pointer" }}
                    >
                      ✏️ Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedAmostraId(a.id_amostra)}
                      style={{ padding: "4px 10px", borderRadius: "6px", border: "1px solid #353535", backgroundColor: "#2a2a2a", color: "#8ab4f8", fontSize: "11px", cursor: "pointer" }}
                    >
                      Ver Cotas
                    </button>
                  </td>
                </tr>
              ))}
              {amostrasVisiveis.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: "10px 6px", color: colors.onSurfaceVariant }}>
                    Nenhuma amostragem salva encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ backgroundColor: colors.surfaceContainerLow, border: `1px solid ${colors.borderSubtle}`, borderRadius: "14px", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <strong style={{ fontSize: "14px" }}>Amostra Selecionada:</strong>
            <select style={INPUT_STYLE} value={selectedAmostraId ?? ""} onChange={(e) => setSelectedAmostraId(Number(e.target.value))}>
              {amostras.map((a) => (
                <option key={a.id_amostra} value={a.id_amostra}>
                  #{a.id_amostra} — {a.municipio_nome || "Município"}: {a.descricao} (N={a.tamanho_amostral})
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            {selectedAmostra && (
              <span style={{ fontSize: "12px", color: "#81c995" }}>
                Meta Total: <strong>{selectedAmostra.tamanho_amostral}</strong> entrevistas • Margem: {selectedAmostra.margem_erro}%
              </span>
            )}
            <button
              type="button"
              disabled={!selectedAmostraId}
              onClick={() => setAddCotaModalOpen(true)}
              style={{
                padding: "7px 14px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: "#81c995",
                color: "#00391b",
                fontWeight: 600,
                fontSize: "12px",
                cursor: selectedAmostraId ? "pointer" : "not-allowed",
              }}
            >
              + Adicionar Cota Manualmente
            </button>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.borderSubtle}`, textAlign: "left", color: colors.onSurfaceVariant }}>
                <th style={{ padding: "8px" }}>Dimensão</th>
                <th style={{ padding: "8px" }}>Estrato / Categoria</th>
                <th style={{ padding: "8px" }}>Bairro</th>
                <th style={{ padding: "8px" }}>% Meta</th>
                <th style={{ padding: "8px" }}>Qtd Meta</th>
                <th style={{ padding: "8px" }}>Coletadas</th>
                <th style={{ padding: "8px", textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {cotas.map((c) => (
                <tr
                  key={c.id_cota}
                  onClick={() => setSelectedCotaId(c.id_cota)}
                  style={{
                    borderBottom: `1px solid ${colors.borderSubtle}`,
                    backgroundColor: c.id_cota === selectedCotaId ? "#1e293b" : "transparent",
                    cursor: "pointer",
                  }}
                >
                  <td style={{ padding: "8px" }}>{c.nome_dimensao}</td>
                  <td style={{ padding: "8px", fontWeight: 600 }}>{c.categoria}</td>
                  <td style={{ padding: "8px" }}>{c.nome_bairro || "—"}</td>
                  <td style={{ padding: "8px" }}>{Number(c.percentual_meta).toFixed(1)}%</td>
                  <td style={{ padding: "8px", color: "#8ab4f8", fontWeight: 600 }}>{c.quantidade_meta}</td>
                  <td style={{ padding: "8px" }}>{c.quantidade_coletada}</td>
                  <td style={{ padding: "8px", textAlign: "right", display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      onClick={() => {
                        const nova = window.prompt("Nova quantidade meta:", String(c.quantidade_meta));
                        if (nova !== null && !Number.isNaN(Number(nova))) {
                          void handleUpdateCota(c.id_cota, Number(c.percentual_meta), Number(nova));
                        }
                      }}
                      style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #353535", backgroundColor: "#2a2a2a", color: "#8ab4f8", fontSize: "11px", cursor: "pointer" }}
                    >
                      Editar Qtd
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteCota(c.id_cota)}
                      style={{ padding: "4px 8px", borderRadius: "6px", border: "none", backgroundColor: "#f28b82", color: "#690005", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
              {cotas.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: "12px 8px", color: colors.onSurfaceVariant }}>
                    Nenhuma cota cadastrada para esta amostra.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AmostraDialogModal
        isOpen={amostraModalOpen}
        onClose={() => {
          setAmostraModalOpen(false);
          setEditingAmostra(null);
        }}
        onSave={handleSaveAmostra}
        onDelete={handleDeleteAmostra}
        onRefreshOpcoes={loadOpcoes}
        municipios={municipios}
        eleitoradosTse={eleitoradosTse}
        initialAmostra={editingAmostra}
        defaultMunicipioId={filterMunicipioId}
      />

      <EleitoradoTseDialogModal
        isOpen={eleitoradoModalOpen}
        onClose={() => setEleitoradoModalOpen(false)}
        onSave={handleSaveEleitoradoTse}
        onDelete={handleDeleteEleitoradoTse}
        onRefreshOpcoes={loadOpcoes}
        municipios={municipios}
        bairros={bairros}
        usuarios={usuarios}
        eleitoradosTse={eleitoradosTse}
        defaultMunicipioId={filterMunicipioId}
      />

      <AddCotaDialogModal
        isOpen={addCotaModalOpen}
        onClose={() => setAddCotaModalOpen(false)}
        onSave={handleSaveManualCota}
        bairros={filteredBairros}
        sampleSize={Number(selectedAmostra?.tamanho_amostral) || 400}
        amostraLabel={
          selectedAmostra
            ? `Amostra #${selectedAmostra.id_amostra} — ${selectedAmostra.municipio_nome || "Município"}: ${selectedAmostra.descricao} (N=${selectedAmostra.tamanho_amostral})`
            : ""
        }
      />
    </div>
  );
}
