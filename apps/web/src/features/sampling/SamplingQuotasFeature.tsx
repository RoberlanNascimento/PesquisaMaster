import React, { useEffect, useState } from "react";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";

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
  const [selectedAmostraId, setSelectedAmostraId] = useState<number | null>(null);
  const [cotas, setCotas] = useState<any[]>([]);

  const [idMunicipio, setIdMunicipio] = useState("");
  const [descricao, setDescricao] = useState("Amostra Municipal TSE 2026");
  const [nivelConfianca, setNivelConfianca] = useState("95");
  const [margemErro, setMargemErro] = useState("4.9");
  const [populacao, setPopulacao] = useState("100000");
  const [tamanhoManual, setTamanhoManual] = useState("");
  const [idEleitoradoTse, setIdEleitoradoTse] = useState<number | null>(null);
  const [syncStatus, setSyncStatus] = useState<string>("");
  const [previewSample, setPreviewSample] = useState<{ n: number; z: number; cotas: { dim: string; cat: string; pct: number; qtd: number }[] } | null>(null);
  const [lastSavedAmostraId, setLastSavedAmostraId] = useState<number | null>(null);
  const [selectedCotaId, setSelectedCotaId] = useState<number | null>(null);
  const [editingAmostraId, setEditingAmostraId] = useState<number | null>(null);

  const [novaDimensao, setNovaDimensao] = useState("Bairro / Zona");
  const [novaCategoria, setNovaCategoria] = useState("");
  const [novoBairroId, setNovoBairroId] = useState("");
  const [novoPct, setNovoPct] = useState("10");
  const [novaQtd, setNovaQtd] = useState("40");

  const loadOpcoes = async (): Promise<void> => {
    const res = await fetch(`${API_BASE}/opcoes`, { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    const muns = Array.isArray(data?.municipios) ? data.municipios : [];
    const ams = Array.isArray(data?.amostras) ? data.amostras : [];
    const brs = Array.isArray(data?.bairros) ? data.bairros : [];
    setMunicipios(muns);
    setAmostras(ams);
    setBairros(brs);
    if (muns.length > 0 && !idMunicipio) {
      setIdMunicipio(String(muns[0].id_municipio));
      if (muns[0].eleitorado_total > 0) setPopulacao(String(muns[0].eleitorado_total));
    }
    if (ams.length > 0 && selectedAmostraId === null) {
      setSelectedAmostraId(ams[0].id_amostra);
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

  const conferirMunicipioTseIbge = async (munId: string): Promise<void> => {
    if (!munId) return;
    setSyncStatus("Sincronizando TSE/IBGE...");
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/v1/integracoes/conferir-municipio/${munId}`, {
        method: "POST",
      });
      if (res.ok) {
        const d = await res.json();
        setPopulacao(String(d.eleitorado_tse_oficial));
        setIdEleitoradoTse(d.id_eleitorado_tse_gravado);
        setSyncStatus(
          `TSE: ${d.eleitorado_tse_oficial.toLocaleString("pt-BR")} eleitores | IBGE: ${d.populacao_ibge_oficial.toLocaleString("pt-BR")} hab. (${d.status_conferencia})`
        );
      } else {
        setSyncStatus("Conferência TSE/IBGE indisponível no momento.");
      }
    } catch {
      setSyncStatus("Erro ao conectar com TSE/IBGE.");
    }
  };

  const handleCalculatePreview = (): void => {
    const conf = Number(nivelConfianca) || 95;
    const z = conf >= 99 ? 2.576 : conf >= 95 ? 1.96 : 1.645;
    const e = Math.max((Number(margemErro) || 4.9) / 100, 0.005);
    const nPop = Number(populacao) || 0;
    const n0 = (z * z * 0.25) / (e * e);
    const calcN = nPop > 0 ? Math.ceil((n0 * nPop) / (n0 + nPop - 1)) : Math.ceil(n0);
    const finalN = tamanhoManual && Number(tamanhoManual) > 0 ? Number(tamanhoManual) : Math.max(calcN, 1);

    const hare = (total: number, items: [string, number][]): number[] => {
      const s = items.reduce((a, b) => a + b[1], 0);
      const exact = items.map((x) => (x[1] / s) * total);
      const floors = exact.map((x) => Math.floor(x));
      let rem = total - floors.reduce((a, b) => a + b, 0);
      const order = exact.map((x, i) => ({ i, frac: x - (floors[i] ?? 0) })).sort((a, b) => b.frac - a.frac);
      for (let k = 0; k < rem; k++) {
        const idx = order[k]?.i;
        if (idx !== undefined) floors[idx] = (floors[idx] ?? 0) + 1;
      }
      return floors;
    };

    const sexoCats: [string, number][] = [["Feminino", 52.8], ["Masculino", 47.2]];
    const faixaCats: [string, number][] = [
      ["16 a 24 anos", 14.5], ["25 a 34 anos", 21.2], ["35 a 44 anos", 21.0],
      ["45 a 59 anos", 24.8], ["60 anos ou mais", 18.5],
    ];
    const sexoQtds = hare(finalN, sexoCats);
    const faixaQtds = hare(finalN, faixaCats);

    const cotasPreview = [
      ...sexoCats.map(([cat, pct], i) => ({ dim: "Sexo", cat, pct, qtd: sexoQtds[i] ?? 0 })),
      ...faixaCats.map(([cat, pct], i) => ({ dim: "Faixa Etária", cat, pct, qtd: faixaQtds[i] ?? 0 })),
    ];
    setPreviewSample({ n: finalN, z, cotas: cotasPreview });
  };

  const handleCreateAmostra = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!idMunicipio) return;
    const url = editingAmostraId ? `${API_BASE}/amostras/${editingAmostraId}` : `${API_BASE}/amostras`;
    const method = editingAmostraId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_municipio: Number(idMunicipio),
        descricao,
        nivel_confianca: Number(nivelConfianca),
        margem_erro: Number(margemErro),
        populacao_universo: Number(populacao),
        tamanho_amostral: previewSample ? previewSample.n : (tamanhoManual ? Number(tamanhoManual) : null),
        gerar_cotas_automaticas: !editingAmostraId,
        id_eleitorado_tse: idEleitoradoTse,
      }),
    });
    if (res.ok) {
      const created = await res.json();
      setPreviewSample(null);
      setEditingAmostraId(null);
      await loadOpcoes();
      if (created?.id_amostra) {
        setSelectedAmostraId(created.id_amostra);
        if (!editingAmostraId) setLastSavedAmostraId(created.id_amostra);
      }
    }
  };

  const handleRevertLastSave = async (): Promise<void> => {
    if (!lastSavedAmostraId) return;
    const res = await fetch(`${API_BASE}/amostras/${lastSavedAmostraId}`, { method: "DELETE" });
    if (res.ok) {
      setLastSavedAmostraId(null);
      setSelectedAmostraId(null);
      setCotas([]);
      await loadOpcoes();
    }
  };

  const handleAddCota = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!selectedAmostraId) return;
    const res = await fetch(`${API_BASE}/amostras/${selectedAmostraId}/cotas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome_dimensao: novaDimensao,
        categoria: novaCategoria || "Setor",
        id_bairro: novoBairroId ? Number(novoBairroId) : null,
        percentual_meta: Number(novoPct),
        quantidade_meta: Number(novaQtd),
      }),
    });
    if (res.ok) {
      setNovaCategoria("");
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
  const amostrasDoMunicipio = amostras.filter((a) => String(a.id_municipio) === idMunicipio);
  const filteredBairros = selectedAmostra
    ? bairros.filter((b) => b.id_municipio === selectedAmostra.id_municipio)
    : bairros;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", color: colors.textPrimary }}>
      <div>
        <h2 style={{ margin: 0, fontSize: "20px" }}>Planejamento Amostral & Cotas Hare-Niemeyer (TSE)</h2>
        <p style={{ margin: "4px 0 0", fontSize: "13px", color: colors.onSurfaceVariant }}>
          Defina a amostragem por município (automática via parâmetros TSE ou manual) e ajuste cotas por dimensão e bairro/zona.
        </p>
      </div>

      <form onSubmit={handleCreateAmostra} style={{ backgroundColor: colors.surfaceContainerLow, border: `1px solid ${colors.borderSubtle}`, borderRadius: "14px", padding: "16px", display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "flex-end" }}>
        <div style={{ width: "100%", fontSize: "12.5px", color: colors.onSurfaceVariant, marginBottom: "4px" }}>
          Adicione a população do município para calcularmos a amostra adequada.
        </div>
        <div>
          <div style={{ fontSize: "11px", color: colors.onSurfaceVariant, marginBottom: "4px" }}>Município</div>
          <select style={INPUT_STYLE} value={idMunicipio} onChange={(e) => {
            const val = e.target.value;
            setIdMunicipio(val);
            const m = municipios.find((x) => String(x.id_municipio) === val);
            if (m?.eleitorado_total > 0) setPopulacao(String(m.eleitorado_total));
          }}>
            {municipios.map((m) => (
              <option key={m.id_municipio} value={m.id_municipio}>{m.nome} / {m.uf}</option>
            ))}
          </select>
        </div>
        <div>
          <div style={{ fontSize: "11px", color: colors.onSurfaceVariant, marginBottom: "4px" }}>Descrição da Amostra</div>
          <input style={{ ...INPUT_STYLE, width: "220px" }} value={descricao} onChange={(e) => setDescricao(e.target.value)} required />
        </div>
        <div>
          <div style={{ fontSize: "11px", color: colors.onSurfaceVariant, marginBottom: "4px" }}>Confiança (%)</div>
          <input style={{ ...INPUT_STYLE, width: "80px" }} type="number" step="0.1" value={nivelConfianca} onChange={(e) => setNivelConfianca(e.target.value)} />
        </div>
        <div>
          <div style={{ fontSize: "11px", color: colors.onSurfaceVariant, marginBottom: "4px" }}>Margem Erro (%)</div>
          <input style={{ ...INPUT_STYLE, width: "80px" }} type="number" step="0.1" value={margemErro} onChange={(e) => setMargemErro(e.target.value)} />
        </div>
        <div>
          <div style={{ fontSize: "11px", color: colors.onSurfaceVariant, marginBottom: "4px" }}>Universo (Eleitores)</div>
          <input style={{ ...INPUT_STYLE, width: "110px" }} type="number" value={populacao} onChange={(e) => setPopulacao(e.target.value)} />
        </div>
        <div>
          <div style={{ fontSize: "11px", color: colors.onSurfaceVariant, marginBottom: "4px" }}>N Manual (opcional)</div>
          <input style={{ ...INPUT_STYLE, width: "100px" }} type="number" placeholder="Auto" value={tamanhoManual} onChange={(e) => setTamanhoManual(e.target.value)} />
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingAmostraId(null);
            setPreviewSample(null);
            setDescricao("Amostra Municipal TSE 2026");
            setNivelConfianca("95");
            setMargemErro("4.9");
            setTamanhoManual("");
          }}
          style={{ padding: "8px 14px", borderRadius: "8px", border: `1px solid ${colors.borderSubtle}`, backgroundColor: colors.surfaceContainer, color: colors.textPrimary, fontWeight: 600, fontSize: "12px", cursor: "pointer" }}
        >
          + Nova Amostragem
        </button>
        <button
          type="button"
          onClick={handleCalculatePreview}
          style={{ padding: "8px 16px", borderRadius: "8px", border: "none", backgroundColor: "#fbbc04", color: "#3f2e00", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}
        >
          Calcular
        </button>
        <button type="submit" style={{ padding: "8px 16px", borderRadius: "8px", border: "none", backgroundColor: "#8ab4f8", color: "#003061", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}>
          {editingAmostraId ? "Atualizar Amostra" : "Salvar no Banco"}
        </button>
        {editingAmostraId && (
          <button
            type="button"
            onClick={() => setEditingAmostraId(null)}
            style={{ padding: "8px 14px", borderRadius: "8px", border: `1px solid ${colors.borderSubtle}`, backgroundColor: colors.surfaceContainer, color: colors.textPrimary, fontWeight: 600, fontSize: "12px", cursor: "pointer" }}
          >
            Cancelar Edição
          </button>
        )}
        <button
          type="button"
          disabled={!lastSavedAmostraId}
          onClick={() => void handleRevertLastSave()}
          style={{ padding: "8px 14px", borderRadius: "8px", border: "none", backgroundColor: lastSavedAmostraId ? "#f28b82" : "#353535", color: lastSavedAmostraId ? "#690005" : "#888", fontWeight: 600, fontSize: "12px", cursor: lastSavedAmostraId ? "pointer" : "not-allowed" }}
        >
          Reverter Último Salvamento
        </button>
        <button
          type="button"
          onClick={() => void conferirMunicipioTseIbge(idMunicipio)}
          style={{ padding: "8px 14px", borderRadius: "8px", border: `1px solid ${colors.borderSubtle}`, backgroundColor: colors.surfaceContainer, color: "#81c995", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}
        >
          Sincronizar TSE/IBGE
        </button>
        {syncStatus && (
          <div style={{ width: "100%", fontSize: "11px", color: "#81c995", marginTop: "4px" }}>
            {syncStatus}
          </div>
        )}
      </form>

      {previewSample && (
        <div style={{ backgroundColor: "#1e293b", border: "1px solid #8ab4f8", borderRadius: "14px", padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <strong style={{ fontSize: "14px", color: "#8ab4f8" }}>
              Prévia Calculada (Não Salva no Banco) — N = {previewSample.n} entrevistas (Z = {previewSample.z})
            </strong>
            <span style={{ fontSize: "11px", color: colors.onSurfaceVariant }}>Clique em "Salvar no Banco" para persistir</span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.borderSubtle}`, textAlign: "left", color: colors.onSurfaceVariant }}>
                <th style={{ padding: "6px" }}>Dimensão</th>
                <th style={{ padding: "6px" }}>Estrato / Categoria</th>
                <th style={{ padding: "6px" }}>% Meta</th>
                <th style={{ padding: "6px" }}>Qtd Calculada (Hare-Niemeyer)</th>
              </tr>
            </thead>
            <tbody>
              {previewSample.cotas.map((c, idx) => (
                <tr key={idx} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                  <td style={{ padding: "6px" }}>{c.dim}</td>
                  <td style={{ padding: "6px", fontWeight: 600 }}>{c.cat}</td>
                  <td style={{ padding: "6px" }}>{c.pct.toFixed(1)}%</td>
                  <td style={{ padding: "6px", color: "#fbbc04", fontWeight: 600 }}>{c.qtd}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ backgroundColor: colors.surfaceContainerLow, border: `1px solid ${colors.borderSubtle}`, borderRadius: "14px", padding: "16px" }}>
        <h3 style={{ margin: "0 0 10px", fontSize: "14px" }}>
          Amostragens Salvas para o Município ({amostrasDoMunicipio.length})
        </h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.borderSubtle}`, textAlign: "left", color: colors.onSurfaceVariant }}>
                <th style={{ padding: "6px" }}>ID</th>
                <th style={{ padding: "6px" }}>Descrição</th>
                <th style={{ padding: "6px" }}>N Amostral</th>
                <th style={{ padding: "6px" }}>Confiança / Margem</th>
                <th style={{ padding: "6px" }}>Universo</th>
                <th style={{ padding: "6px", textAlign: "right" }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {amostrasDoMunicipio.map((a) => (
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
                  <td style={{ padding: "6px", fontWeight: 600 }}>{a.descricao}</td>
                  <td style={{ padding: "6px", color: "#8ab4f8", fontWeight: 600 }}>{a.tamanho_amostral}</td>
                  <td style={{ padding: "6px" }}>{a.nivel_confianca}% / {a.margem_erro}%</td>
                  <td style={{ padding: "6px" }}>{Number(a.populacao_universo).toLocaleString("pt-BR")}</td>
                  <td style={{ padding: "6px", textAlign: "right", display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingAmostraId(a.id_amostra);
                        setIdMunicipio(String(a.id_municipio));
                        setDescricao(a.descricao);
                        setNivelConfianca(String(a.nivel_confianca));
                        setMargemErro(String(a.margem_erro));
                        setPopulacao(String(a.populacao_universo));
                        setTamanhoManual(String(a.tamanho_amostral));
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
              {amostrasDoMunicipio.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: "10px 6px", color: colors.onSurfaceVariant }}>
                    Nenhuma amostragem salva para este município.
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
          {selectedAmostra && (
            <span style={{ fontSize: "12px", color: "#81c995" }}>
              Meta Total: <strong>{selectedAmostra.tamanho_amostral}</strong> entrevistas • Margem: {selectedAmostra.margem_erro}%
            </span>
          )}
        </div>

        <form onSubmit={handleAddCota} style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          <input style={INPUT_STYLE} placeholder="Dimensão (ex: Bairro)" value={novaDimensao} onChange={(e) => setNovaDimensao(e.target.value)} required />
          <input style={INPUT_STYLE} placeholder="Categoria / Estrato" value={novaCategoria} onChange={(e) => setNovaCategoria(e.target.value)} required />
          <select style={INPUT_STYLE} value={novoBairroId} onChange={(e) => setNovoBairroId(e.target.value)}>
            <option value="">Sem bairro específico</option>
            {filteredBairros.map((b) => (
              <option key={b.id_bairro} value={b.id_bairro}>{b.nome_bairro}</option>
            ))}
          </select>
          <input style={{ ...INPUT_STYLE, width: "75px" }} type="number" step="0.1" placeholder="% Meta" value={novoPct} onChange={(e) => setNovoPct(e.target.value)} required />
          <input style={{ ...INPUT_STYLE, width: "75px" }} type="number" placeholder="Qtd Meta" value={novaQtd} onChange={(e) => setNovaQtd(e.target.value)} required />
          <button type="submit" style={{ padding: "7px 14px", borderRadius: "8px", border: "none", backgroundColor: "#81c995", color: "#00391b", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}>
            + Adicionar Cota
          </button>
        </form>

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
    </div>
  );
}
