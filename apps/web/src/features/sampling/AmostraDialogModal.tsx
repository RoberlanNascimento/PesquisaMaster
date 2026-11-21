import React, { useEffect, useMemo, useState } from "react";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";
import { SearchableCombobox } from "../../components/ui/SearchableCombobox";
import { formatIntegerPtBr, parseIntegerDigits } from "../../lib/numberFormat";

const { colors } = NOCTURNE_TOKENS;

const FIELD_INPUT: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 11px",
  borderRadius: "9px",
  border: `1px solid ${colors.borderSubtle}`,
  backgroundColor: colors.surfaceContainer,
  color: colors.textPrimary,
  fontSize: "12.5px",
};

const FIELD_LABEL: React.CSSProperties = {
  display: "block",
  fontSize: "11.5px",
  fontWeight: 600,
  color: colors.onSurfaceVariant,
  marginBottom: "4px",
};

const SECTION_BOX: React.CSSProperties = {
  border: `1px solid ${colors.borderSubtle}`,
  borderRadius: "12px",
  padding: "13px 14px",
  backgroundColor: "rgba(255, 255, 255, 0.02)",
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const SECTION_TITLE: React.CSSProperties = {
  fontSize: "11.5px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "#8ab4f8",
};

export interface AmostraFormPayload {
  readonly id_municipio: number;
  readonly descricao: string;
  readonly metodo_alocacao: string;
  readonly nivel_confianca: number;
  readonly margem_erro: number;
  readonly proporcao_esperada: number;
  readonly populacao_universo: number;
  readonly z_score: number;
  readonly tamanho_amostral: number | null;
  readonly gerar_cotas_automaticas: boolean;
  readonly id_eleitorado_tse: number | null;
}

interface PreviewSample {
  readonly n: number;
  readonly z: number;
  readonly cotas: readonly { dim: string; cat: string; pct: number; qtd: number }[];
}

function zFromConfidence(conf: number): number {
  if (conf >= 99) return 2.576;
  if (conf >= 95) return 1.96;
  return 1.645;
}

function formatTseOptionLabel(item: any): string {
  const mes = String(item.mes_referencia ?? 1).padStart(2, "0");
  const ano = item.ano_referencia ?? "—";
  const eleitores = Number(item.quantidade_eleitores ?? 0).toLocaleString("pt-BR");
  const ibge = item.populacao_ibge ? ` | IBGE: ${Number(item.populacao_ibge).toLocaleString("pt-BR")}` : "";
  const tipo = item.tipo_captura ? ` [${item.tipo_captura}]` : "";
  return `#${item.id_eleitorado_tse} — ${mes}/${ano} • ${eleitores} eleitores${ibge}${tipo}`;
}

export function AmostraDialogModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  municipios,
  eleitoradosTse,
  initialAmostra,
  defaultMunicipioId,
}: {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSave: (payload: AmostraFormPayload, editingId: number | null) => Promise<void>;
  readonly onDelete: (idAmostra: number) => Promise<void>;
  readonly onRefreshOpcoes?: () => Promise<void>;
  readonly municipios: readonly any[];
  readonly eleitoradosTse: readonly any[];
  readonly initialAmostra: any | null;
  readonly defaultMunicipioId: string;
}): React.JSX.Element | null {
  const [selectedUf, setSelectedUf] = useState("");
  const [idMunicipio, setIdMunicipio] = useState("");
  const [descricao, setDescricao] = useState("Amostra Municipal TSE 2026");
  const [metodoAlocacao, setMetodoAlocacao] = useState("hare_niemeyer");
  const [idEleitoradoTse, setIdEleitoradoTse] = useState<string>("");

  const [nivelConfianca, setNivelConfianca] = useState("95");
  const [zScore, setZScore] = useState("1.960");
  const [margemErro, setMargemErro] = useState("4.9");
  const [proporcaoEsperada, setProporcaoEsperada] = useState("50");
  const [populacao, setPopulacao] = useState("100000");
  const [tamanhoAmostral, setTamanhoAmostral] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [previewSample, setPreviewSample] = useState<PreviewSample | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const editingId: number | null = initialAmostra?.id_amostra ?? null;

  // Filtra eleitorado_tse pelo município selecionado e garante ordenação do mais novo para o mais velho
  const eleitoradosDoMunicipio = useMemo(() => {
    if (!idMunicipio) return [];
    return [...eleitoradosTse]
      .filter((e) => String(e.id_municipio) === idMunicipio)
      .sort((a, b) => {
        if ((b.ano_referencia ?? 0) !== (a.ano_referencia ?? 0)) {
          return (b.ano_referencia ?? 0) - (a.ano_referencia ?? 0);
        }
        if ((b.mes_referencia ?? 0) !== (a.mes_referencia ?? 0)) {
          return (b.mes_referencia ?? 0) - (a.mes_referencia ?? 0);
        }
        const dateA = a.data_captura ? new Date(a.data_captura).getTime() : 0;
        const dateB = b.data_captura ? new Date(b.data_captura).getTime() : 0;
        if (dateB !== dateA) return dateB - dateA;
        return (b.id_eleitorado_tse ?? 0) - (a.id_eleitorado_tse ?? 0);
      });
  }, [eleitoradosTse, idMunicipio]);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg("");
    setPreviewSample(null);

    if (initialAmostra) {
      const munIdStr = String(initialAmostra.id_municipio ?? "");
      const munObj = municipios.find((m) => String(m.id_municipio) === munIdStr);
      setSelectedUf(munObj?.uf ? String(munObj.uf) : String(initialAmostra.uf ?? ""));
      setIdMunicipio(munIdStr);
      setDescricao(String(initialAmostra.descricao ?? "Amostra Municipal TSE 2026"));
      setMetodoAlocacao(String(initialAmostra.metodo_alocacao ?? "hare_niemeyer"));
      setIdEleitoradoTse(initialAmostra.id_eleitorado_tse ? String(initialAmostra.id_eleitorado_tse) : "");

      const confNum = Number(initialAmostra.nivel_confianca ?? 95);
      setNivelConfianca(String(confNum));
      const zNum = Number(initialAmostra.z_score ?? zFromConfidence(confNum));
      setZScore(zNum.toFixed(3));
      setMargemErro(String(initialAmostra.margem_erro ?? "4.9"));
      const rawProp = Number(initialAmostra.proporcao_esperada ?? 0.5);
      setProporcaoEsperada(String(rawProp <= 1 ? Math.round(rawProp * 10000) / 100 : rawProp));
      setPopulacao(String(initialAmostra.populacao_universo ?? "100000"));
      setTamanhoAmostral(initialAmostra.tamanho_amostral ? String(initialAmostra.tamanho_amostral) : "");
    } else {
      const munId = defaultMunicipioId || (municipios[0] ? String(municipios[0].id_municipio) : "");
      const munObj = municipios.find((m) => String(m.id_municipio) === munId);
      setSelectedUf(munObj?.uf ? String(munObj.uf) : "");
      setIdMunicipio(munId);
      setDescricao("Amostra Municipal TSE 2026");
      setMetodoAlocacao("hare_niemeyer");
      setNivelConfianca("95");
      setZScore("1.960");
      setMargemErro("4.9");
      setProporcaoEsperada("50");
      setTamanhoAmostral("");

      const latestTse = eleitoradosTse.find((e) => String(e.id_municipio) === munId);
      if (latestTse) {
        setIdEleitoradoTse(String(latestTse.id_eleitorado_tse));
        const popIbge = Number(latestTse.populacao_ibge || 0);
        setPopulacao(String(popIbge > 0 ? popIbge : latestTse.quantidade_eleitores));
      } else {
        setIdEleitoradoTse("");
        const foundMun = municipios.find((m) => String(m.id_municipio) === munId);
        setPopulacao(foundMun?.eleitorado_total > 0 ? String(foundMun.eleitorado_total) : "100000");
      }
    }
  }, [isOpen, initialAmostra, defaultMunicipioId, municipios]);

  if (!isOpen) return null;

  const handleMunicipioChange = (val: string): void => {
    const munObj = municipios.find((m) => String(m.id_municipio) === val);
    if (munObj?.uf) setSelectedUf(String(munObj.uf));
    setIdMunicipio(val);
    const matchingTse = [...eleitoradosTse]
      .filter((e) => String(e.id_municipio) === val)
      .sort((a, b) => {
        if ((b.ano_referencia ?? 0) !== (a.ano_referencia ?? 0)) {
          return (b.ano_referencia ?? 0) - (a.ano_referencia ?? 0);
        }
        if ((b.mes_referencia ?? 0) !== (a.mes_referencia ?? 0)) {
          return (b.mes_referencia ?? 0) - (a.mes_referencia ?? 0);
        }
        return (b.id_eleitorado_tse ?? 0) - (a.id_eleitorado_tse ?? 0);
      });

    if (matchingTse.length > 0) {
      setIdEleitoradoTse(String(matchingTse[0].id_eleitorado_tse));
      const popIbge = Number(matchingTse[0].populacao_ibge || 0);
      setPopulacao(String(popIbge > 0 ? popIbge : matchingTse[0].quantidade_eleitores));
    } else {
      setIdEleitoradoTse("");
      const m = municipios.find((x) => String(x.id_municipio) === val);
      if (m?.eleitorado_total > 0) setPopulacao(String(m.eleitorado_total));
    }
  };

  const handleTseRecordChange = (val: string): void => {
    setIdEleitoradoTse(val);
    const rec = eleitoradosDoMunicipio.find((e) => String(e.id_eleitorado_tse) === val);
    if (rec) {
      const popIbge = Number(rec.populacao_ibge || 0);
      if (popIbge > 0) {
        setPopulacao(String(popIbge));
      } else if (rec.quantidade_eleitores > 0) {
        setPopulacao(String(rec.quantidade_eleitores));
      }
    }
  };

  const handleConfidenceChange = (val: string): void => {
    setNivelConfianca(val);
    const conf = Number(val) || 95;
    setZScore(zFromConfidence(conf).toFixed(3));
  };

  const handleCalculatePreview = (): void => {
    const conf = Number(nivelConfianca) || 95;
    const z = Number(zScore) > 0 ? Number(zScore) : zFromConfidence(conf);
    const e = Math.max((Number(margemErro) || 4.9) / 100, 0.005);
    const pPct = Number(proporcaoEsperada) || 50;
    const p = Math.min(Math.max(pPct > 1 ? pPct / 100 : pPct, 0.01), 0.99);
    const nPop = Number(populacao) || 0;
    const n0 = (z * z * p * (1 - p)) / (e * e);
    const calcN = nPop > 0 ? Math.ceil((n0 * nPop) / (n0 + nPop - 1)) : Math.ceil(n0);
    const finalN = Math.max(calcN, 1);
    setTamanhoAmostral(String(finalN));

    const hare = (total: number, items: [string, number][]): number[] => {
      const s = items.reduce((a, b) => a + b[1], 0);
      const exact = items.map((x) => (x[1] / s) * total);
      const floors = exact.map((x) => Math.floor(x));
      const rem = total - floors.reduce((a, b) => a + b, 0);
      const order = exact.map((x, i) => ({ i, frac: x - (floors[i] ?? 0) })).sort((a, b) => b.frac - a.frac);
      for (let k = 0; k < rem; k++) {
        const idx = order[k]?.i;
        if (idx !== undefined) floors[idx] = (floors[idx] ?? 0) + 1;
      }
      return floors;
    };

    const sexoCats: [string, number][] = [["Feminino", 52.8], ["Masculino", 47.2]];
    const faixaCats: [string, number][] = [
      ["16 a 24 anos", 14.5],
      ["25 a 34 anos", 21.2],
      ["35 a 44 anos", 21.0],
      ["45 a 59 anos", 24.8],
      ["60 anos ou mais", 18.5],
    ];
    const sexoQtds = hare(finalN, sexoCats);
    const faixaQtds = hare(finalN, faixaCats);

    setPreviewSample({
      n: finalN,
      z,
      cotas: [
        ...sexoCats.map(([cat, pct], i) => ({ dim: "Sexo", cat, pct, qtd: sexoQtds[i] ?? 0 })),
        ...faixaCats.map(([cat, pct], i) => ({ dim: "Faixa Etária", cat, pct, qtd: faixaQtds[i] ?? 0 })),
      ],
    });
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!idMunicipio || !descricao.trim()) return;
    setSaving(true);
    setErrorMsg("");
    try {
      const conf = Number(nivelConfianca) || 95;
      const z = Number(zScore) > 0 ? Number(zScore) : zFromConfidence(conf);
      await onSave(
        {
          id_municipio: Number(idMunicipio),
          descricao: descricao.trim(),
          metodo_alocacao: metodoAlocacao,
          nivel_confianca: conf,
          margem_erro: Number(margemErro) || 4.9,
          proporcao_esperada: Number(proporcaoEsperada) || 50,
          populacao_universo: Number(populacao) || 100000,
          z_score: z,
          tamanho_amostral: tamanhoAmostral && Number(tamanhoAmostral) > 0 ? Number(tamanhoAmostral) : null,
          gerar_cotas_automaticas: !editingId,
          id_eleitorado_tse: idEleitoradoTse ? Number(idEleitoradoTse) : null,
        },
        editingId
      );
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao salvar amostra.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = async (): Promise<void> => {
    if (!editingId) return;
    if (!window.confirm(`Deseja realmente excluir a amostra #${editingId} e todas as suas cotas?`)) return;
    setDeleting(true);
    setErrorMsg("");
    try {
      await onDelete(editingId);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Não foi possível excluir a amostra.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={editingId ? "Editar Amostra" : "Adicionar Amostra"}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "rgba(0, 0, 0, 0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "700px",
          maxHeight: "92vh",
          overflowY: "auto",
          backgroundColor: "#1b1c1d",
          border: `1px solid ${colors.borderSubtle}`,
          borderRadius: "16px",
          padding: "22px",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.65)",
          color: colors.textPrimary,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
          <h3 style={{ margin: 0, fontSize: "16px" }}>
            {editingId ? `Editar Amostra #${editingId}` : "Adicionar Amostra"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: colors.onSurfaceVariant, fontSize: "16px", cursor: "pointer" }}
          >
            ✕
          </button>
        </div>
        <p style={{ margin: "0 0 14px", fontSize: "12px", color: colors.onSurfaceVariant }}>
          Configure os dados da amostra, vincule o registro oficial TSE/IBGE ou informe os parâmetros estatísticos manualmente.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* PARTE 1: ITENS DE CABEÇALHO */}
          <div style={SECTION_BOX}>
            <div style={SECTION_TITLE}>1. Itens de Cabeçalho</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div>
                <label style={FIELD_LABEL}>Estado</label>
                <SearchableCombobox
                  value={selectedUf}
                  emptyOptionLabel="Todos os Estados"
                  placeholder="Digite a UF (ex: PA, SP)..."
                  options={Array.from(
                    new Set(
                      municipios
                        .map((m) => String(m.uf ?? "").trim())
                        .filter(Boolean)
                    )
                  )
                    .sort()
                    .map((uf) => ({ value: uf, label: uf }))}
                  onChange={(uf) => {
                    setSelectedUf(uf);
                    const firstMun = municipios.find((m) => !uf || String(m.uf ?? "") === uf);
                    if (firstMun) {
                      handleMunicipioChange(String(firstMun.id_municipio));
                    }
                  }}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr 1fr", gap: "10px" }}>
                <div>
                  <label style={FIELD_LABEL}>Município *</label>
                  <SearchableCombobox
                    value={idMunicipio}
                    required
                    placeholder="Digite o município..."
                    options={municipios
                      .filter((m) => !selectedUf || String(m.uf ?? "") === selectedUf)
                      .map((m) => ({
                        value: String(m.id_municipio),
                        label: `${m.nome} / ${m.uf}`,
                      }))}
                    onChange={(val) => handleMunicipioChange(val)}
                  />
                </div>
                <div>
                  <label style={FIELD_LABEL}>Descrição da Amostra *</label>
                  <input
                    style={FIELD_INPUT}
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={FIELD_LABEL}>Método de Alocação *</label>
                  <select
                    style={FIELD_INPUT}
                    value={metodoAlocacao}
                    onChange={(e) => setMetodoAlocacao(e.target.value)}
                    required
                  >
                    <option value="hare_niemeyer">Hare-Niemeyer (TSE)</option>
                    <option value="proporcional">Proporcional</option>
                    <option value="uniforme">Uniforme</option>
                    <option value="neyman">Neyman (Ótima)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* PARTE 2: INSERÇÃO AUTOMÁTICA (TSE / IBGE) */}
          <div style={SECTION_BOX}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
              <div style={{ ...SECTION_TITLE, color: "#81c995" }}>2. Inserção Automática (TSE / IBGE)</div>
              <span style={{ fontSize: "11px", color: colors.onSurfaceVariant }}>
                Ordenado do mais novo para o mais velho
              </span>
            </div>
            <div>
              <label style={FIELD_LABEL}>Registro Oficial Eleitorado TSE (tabela eleitorado_tse)</label>
              <select
                style={FIELD_INPUT}
                value={idEleitoradoTse}
                onChange={(e) => handleTseRecordChange(e.target.value)}
              >
                <option value="">
                  {eleitoradosDoMunicipio.length > 0
                    ? "— Nenhum vínculo TSE (usar inserção manual) —"
                    : "Nenhum registro TSE salvo para este município"}
                </option>
                {eleitoradosDoMunicipio.map((item) => (
                  <option key={item.id_eleitorado_tse} value={item.id_eleitorado_tse}>
                    {formatTseOptionLabel(item)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* PARTE 3: INSERÇÃO MANUAL */}
          <div style={SECTION_BOX}>
            <div style={{ ...SECTION_TITLE, color: "#fbbc04" }}>3. Inserção Manual (Parâmetros Estatísticos)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
              <div>
                <label style={FIELD_LABEL}>Confiança (%) *</label>
                <select
                  style={FIELD_INPUT}
                  value={nivelConfianca}
                  onChange={(e) => handleConfidenceChange(e.target.value)}
                  required
                >
                  <option value="90">90%</option>
                  <option value="95">95%</option>
                  <option value="99">99%</option>
                </select>
              </div>
              <div>
                <label style={FIELD_LABEL}>Z-Score *</label>
                <input
                  style={FIELD_INPUT}
                  type="number"
                  step="0.001"
                  value={zScore}
                  onChange={(e) => setZScore(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={FIELD_LABEL}>Margem de Erro (%) *</label>
                <input
                  style={FIELD_INPUT}
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="10"
                  value={margemErro}
                  onChange={(e) => setMargemErro(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={FIELD_LABEL}>Proporção Esperada (%) *</label>
                <input
                  style={FIELD_INPUT}
                  type="number"
                  step="0.5"
                  min="1"
                  max="99"
                  value={proporcaoEsperada}
                  onChange={(e) => setProporcaoEsperada(e.target.value)}
                  required
                />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={FIELD_LABEL}>População Esperada (Universo) *</label>
                <input
                  style={FIELD_INPUT}
                  type="text"
                  inputMode="numeric"
                  value={formatIntegerPtBr(populacao)}
                  onChange={(e) => setPopulacao(parseIntegerDigits(e.target.value))}
                  required
                />
              </div>
            </div>
          </div>

          {/* PARTE 4: TAMANHO DA AMOSTRA */}
          <div style={SECTION_BOX}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
              <div style={{ ...SECTION_TITLE, color: "#8ab4f8" }}>4. Tamanho da Amostra</div>
              <span style={{ fontSize: "11px", color: colors.onSurfaceVariant }}>

              </span>
            </div>
            <div style={{ padding: "6px 2px", display: "flex", alignItems: "baseline", gap: "8px" }}>
              {tamanhoAmostral ? (
                <>
                  <span style={{ fontSize: "28px", fontWeight: 800, color: "#8ab4f8", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
                    {Number(tamanhoAmostral).toLocaleString("pt-BR")}
                  </span>
                  <span style={{ fontSize: "14px", fontWeight: 600, color: colors.textPrimary }}>
                    entrevistas
                  </span>
                </>
              ) : (
                <span style={{ fontSize: "14px", fontWeight: 500, color: colors.onSurfaceVariant }}>
                  Clique em &quot;Calcular&quot; para exibir o tamanho amostral (N)
                </span>
              )}
            </div>
          </div>

          {errorMsg && (
            <div style={{ fontSize: "12px", color: "#f28b82", padding: "8px 10px", borderRadius: "8px", backgroundColor: "rgba(242, 139, 130, 0.12)" }}>
              {errorMsg}
            </div>
          )}

          {previewSample && (
            <div style={{ backgroundColor: "#141c2b", border: "1px solid #8ab4f8", borderRadius: "12px", padding: "12px" }}>
              <div style={{ fontSize: "12.5px", fontWeight: 700, color: "#8ab4f8", marginBottom: "8px" }}>
                Prévia Calculada — N = {previewSample.n} entrevistas (Z = {previewSample.z.toFixed(3)})
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11.5px" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${colors.borderSubtle}`, textAlign: "left", color: colors.onSurfaceVariant }}>
                    <th style={{ padding: "5px" }}>Dimensão</th>
                    <th style={{ padding: "5px" }}>Estrato / Categoria</th>
                    <th style={{ padding: "5px" }}>% Meta</th>
                    <th style={{ padding: "5px" }}>Qtd ({metodoAlocacao})</th>
                  </tr>
                </thead>
                <tbody>
                  {previewSample.cotas.map((c, idx) => (
                    <tr key={idx} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                      <td style={{ padding: "5px" }}>{c.dim}</td>
                      <td style={{ padding: "5px", fontWeight: 600 }}>{c.cat}</td>
                      <td style={{ padding: "5px" }}>{c.pct.toFixed(1)}%</td>
                      <td style={{ padding: "5px", color: "#fbbc04", fontWeight: 600 }}>{c.qtd}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", marginTop: "4px" }}>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={handleCalculatePreview}
                style={{
                  padding: "9px 14px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: "#fbbc04",
                  color: "#3f2e00",
                  fontWeight: 700,
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                Calcular
              </button>
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={!editingId || deleting}
                onClick={() => void handleDeleteClick()}
                style={{
                  padding: "9px 14px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: editingId ? "#f28b82" : "#353535",
                  color: editingId ? "#690005" : "#888",
                  fontWeight: 700,
                  fontSize: "12px",
                  cursor: editingId && !deleting ? "pointer" : "not-allowed",
                }}
              >
                {deleting ? "Excluindo..." : "Excluir"}
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: "9px 18px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: "#8ab4f8",
                  color: "#003061",
                  fontWeight: 700,
                  fontSize: "12px",
                  cursor: saving ? "wait" : "pointer",
                }}
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
