import React, { useEffect, useMemo, useState } from "react";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";

const { colors } = NOCTURNE_TOKENS;
const API_BASE = "http://127.0.0.1:8000/api/v1/campo-operacoes";

export function DistribuicaoPesquisasFeature(): React.JSX.Element {
  const [pesquisas, setPesquisas] = useState<any[]>([]);
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [atribuicoes, setAtribuicoes] = useState<any[]>([]);
  const [bairros, setBairros] = useState<any[]>([]);
  const [selectedPesquisaId, setSelectedPesquisaId] = useState<number | null>(null);
  const [selectedProfIds, setSelectedProfIds] = useState<number[]>([]);
  const [selectedBairroId, setSelectedBairroId] = useState<string>("");
  const [loteSetor, setLoteSetor] = useState("Setor Geral");
  const [metaEntrevistas, setMetaEntrevistas] = useState("150");
  const [saving, setSaving] = useState(false);

  const loadData = async (): Promise<void> => {
    try {
      const [op, atr] = await Promise.all([
        fetch(`${API_BASE}/resumo-opcoes`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : ({} as any))),
        fetch(`${API_BASE}/atribuicoes`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : [])),
      ]);
      const pesqList = Array.isArray(op?.pesquisas) ? op.pesquisas : [];
      const profList = Array.isArray(op?.profissionais) ? op.profissionais : [];
      const bairrosList = Array.isArray(op?.bairros) ? op.bairros : [];
      setPesquisas(pesqList);
      setProfissionais(profList);
      setBairros(bairrosList);
      if (bairrosList.length > 0 && !selectedBairroId) {
        setSelectedBairroId(String(bairrosList[0].id_bairro));
        setLoteSetor(bairrosList[0].nome_bairro);
      }
      setAtribuicoes(Array.isArray(atr) ? atr : []);
      if (pesqList.length > 0 && selectedPesquisaId === null) {
        setSelectedPesquisaId(pesqList[0].id_pesquisa);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const assignedForSelected = useMemo(() => {
    const seen = new Set<number>();
    return atribuicoes.filter((a) => {
      if (a.id_pesquisa !== selectedPesquisaId) return false;
      if (seen.has(a.id_profissional)) return false;
      seen.add(a.id_profissional);
      return true;
    });
  }, [atribuicoes, selectedPesquisaId]);

  const assignedProfIds = useMemo(
    () => new Set(assignedForSelected.map((a) => a.id_profissional)),
    [assignedForSelected]
  );

  const selectedPesquisa = useMemo(
    () => pesquisas.find((p) => p.id_pesquisa === selectedPesquisaId) || null,
    [pesquisas, selectedPesquisaId]
  );

  const filteredBairros = useMemo(() => {
    if (!selectedPesquisa?.id_municipio) return bairros;
    return bairros.filter((b) => b.id_municipio === selectedPesquisa.id_municipio);
  }, [bairros, selectedPesquisa]);

  const availableProfissionais = useMemo(
    () => profissionais.filter((p) => !assignedProfIds.has(p.id_profissional)),
    [profissionais, assignedProfIds]
  );

  const toggleProf = (id: number): void => {
    setSelectedProfIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleAssignGroup = async (): Promise<void> => {
    if (!selectedPesquisaId || selectedProfIds.length === 0) return;
    setSaving(true);
    try {
      await Promise.all(
        selectedProfIds.map((idProf) =>
          fetch(`${API_BASE}/atribuicoes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id_pesquisa: selectedPesquisaId,
              id_profissional: idProf,
              id_bairro: selectedBairroId ? Number(selectedBairroId) : null,
              lote_setor: loteSetor,
              meta_entrevistas: Number(metaEntrevistas) || 150,
            }),
          })
        )
      );
      setSelectedProfIds([]);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleUnlink = async (idAtribuicao: number): Promise<void> => {
    const res = await fetch(`${API_BASE}/atribuicoes/${idAtribuicao}`, {
      method: "DELETE",
    });
    if (res.ok) {
      await loadData();
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", color: colors.textPrimary }}>
      <div>
        <h2 style={{ margin: 0, fontSize: "20px" }}>Distribuição de Pesquisas & Profissionais Aptos</h2>
        <p style={{ margin: "4px 0 0", fontSize: "13px", color: colors.onSurfaceVariant }}>
          Selecione uma pesquisa à esquerda e marque o grupo de profissionais aptos à direita para vinculação em lote.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: "16px" }}>
        <div style={{ backgroundColor: colors.surfaceContainerLow, border: `1px solid ${colors.borderSubtle}`, borderRadius: "14px", padding: "16px" }}>
          <h3 style={{ margin: "0 0 12px", fontSize: "14px" }}>1. Pesquisas ({pesquisas.length})</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {pesquisas.map((p) => {
              const active = p.id_pesquisa === selectedPesquisaId;
              const totalAtribuido = atribuicoes
                .filter((a) => a.id_pesquisa === p.id_pesquisa)
                .reduce((acc, a) => acc + (Number(a.meta_entrevistas) || 0), 0);
              return (
                <button
                  key={p.id_pesquisa}
                  type="button"
                  onClick={() => setSelectedPesquisaId(p.id_pesquisa)}
                  style={{
                    textAlign: "left",
                    padding: "12px",
                    borderRadius: "10px",
                    border: active ? "1px solid #8ab4f8" : `1px solid ${colors.borderSubtle}`,
                    backgroundColor: active ? "#1e293b" : colors.surfaceContainer,
                    color: colors.textPrimary,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: "13px" }}>{p.nome}</div>
                  <div style={{ fontSize: "11px", color: colors.onSurfaceVariant, marginTop: "4px" }}>
                    Entrevistas a fazer: <strong>{p.total_entrevistas ?? 0}</strong> • Distribuídas: <strong>{totalAtribuido}</strong> • Status: {p.status}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ backgroundColor: colors.surfaceContainerLow, border: `1px solid ${colors.borderSubtle}`, borderRadius: "14px", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
            <h3 style={{ margin: 0, fontSize: "14px" }}>2. Profissionais Disponíveis ({availableProfissionais.length})</h3>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <select
                value={selectedBairroId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedBairroId(id);
                  const found = bairros.find((b) => String(b.id_bairro) === id);
                  if (found) setLoteSetor(found.nome_bairro);
                }}
                style={{ padding: "6px 10px", borderRadius: "8px", border: `1px solid ${colors.borderSubtle}`, backgroundColor: colors.surfaceContainer, color: colors.textPrimary, fontSize: "12px", maxWidth: "200px" }}
              >
                {filteredBairros.map((b) => (
                  <option key={b.id_bairro} value={b.id_bairro}>
                    {b.nome_bairro}{b.codigo_bairro_ibge ? ` (${b.codigo_bairro_ibge})` : ""}
                  </option>
                ))}
                {filteredBairros.length === 0 && <option value="">Setor Geral</option>}
              </select>
              <input
                type="number"
                value={metaEntrevistas}
                onChange={(e) => setMetaEntrevistas(e.target.value)}
                placeholder="Meta"
                style={{ padding: "6px 10px", borderRadius: "8px", border: `1px solid ${colors.borderSubtle}`, backgroundColor: colors.surfaceContainer, color: colors.textPrimary, fontSize: "12px", width: "80px" }}
              />
              <button
                type="button"
                disabled={saving || selectedProfIds.length === 0 || !selectedPesquisaId}
                onClick={handleAssignGroup}
                style={{
                  padding: "7px 14px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: selectedProfIds.length > 0 ? "#81c995" : "#353535",
                  color: selectedProfIds.length > 0 ? "#00391b" : "#999",
                  fontWeight: 600,
                  fontSize: "12px",
                  cursor: selectedProfIds.length > 0 ? "pointer" : "not-allowed",
                }}
              >
                {saving ? "Vinculando..." : `+ Vincular Grupo (${selectedProfIds.length})`}
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "8px", maxHeight: "280px", overflowY: "auto" }}>
            {availableProfissionais.map((prof) => {
              const checked = selectedProfIds.includes(prof.id_profissional);
              return (
                <label
                  key={prof.id_profissional}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px",
                    borderRadius: "10px",
                    border: checked ? "1px solid #81c995" : `1px solid ${colors.borderSubtle}`,
                    backgroundColor: colors.surfaceContainer,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleProf(prof.id_profissional)}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "12px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {prof.nome}
                    </div>
                    <div style={{ fontSize: "11px", color: colors.onSurfaceVariant }}>
                      {prof.tipo_profissional}
                    </div>
                  </div>
                </label>
              );
            })}
            {availableProfissionais.length === 0 && (
              <span style={{ fontSize: "12px", color: colors.onSurfaceVariant }}>
                Todos os profissionais já estão vinculados a esta pesquisa.
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: colors.surfaceContainerLow, border: `1px solid ${colors.borderSubtle}`, borderRadius: "14px", padding: "16px" }}>
        <h3 style={{ margin: "0 0 12px", fontSize: "14px" }}>
          Pesquisas e Pesquisadores Vinculados ({assignedForSelected.length})
        </h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", color: colors.textPrimary }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.borderSubtle}`, textAlign: "left", color: colors.onSurfaceVariant }}>
                <th style={{ padding: "8px" }}>Pesquisa</th>
                <th style={{ padding: "8px" }}>Pesquisador</th>
                <th style={{ padding: "8px" }}>Lote / Setor</th>
                <th style={{ padding: "8px" }}>Meta</th>
                <th style={{ padding: "8px" }}>Status</th>
                <th style={{ padding: "8px", textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {assignedForSelected.map((a) => (
                <tr key={a.id_atribuicao} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                  <td style={{ padding: "8px", fontWeight: 600 }}>{a.pesquisa_titulo || `Pesquisa #${a.id_pesquisa}`}</td>
                  <td style={{ padding: "8px" }}>{a.profissional_nome || `Prof #${a.id_profissional}`}</td>
                  <td style={{ padding: "8px" }}>{a.lote_setor}</td>
                  <td style={{ padding: "8px" }}>{a.meta_entrevistas}</td>
                  <td style={{ padding: "8px" }}>{a.status_atribuicao}</td>
                  <td style={{ padding: "8px", textAlign: "right" }}>
                    <button
                      type="button"
                      onClick={() => void handleUnlink(a.id_atribuicao)}
                      style={{
                        padding: "5px 10px",
                        borderRadius: "6px",
                        border: "none",
                        backgroundColor: "#f28b82",
                        color: "#690005",
                        fontSize: "11px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Desvincular
                    </button>
                  </td>
                </tr>
              ))}
              {assignedForSelected.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: "12px 8px", color: colors.onSurfaceVariant }}>
                    Nenhuma atribuição registrada para esta pesquisa.
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

