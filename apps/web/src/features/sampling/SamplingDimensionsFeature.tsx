import React, { useEffect, useMemo, useState } from "react";
import { NOCTURNE_BUTTON_STYLES, NOCTURNE_TOKENS } from "../../lib/designTokens";

const { colors } = NOCTURNE_TOKENS;
const API_OPCOES = "http://127.0.0.1:8000/api/v1/amostragem/opcoes";
const API_DIMENSOES = "http://127.0.0.1:8000/api/v1/pesquisas-tabelas/dimensoes";

export interface DimensionRecord {
  readonly id: number;
  readonly sampleId: number;
  readonly sampleName: string;
  readonly name: string;
  readonly source: string;
  readonly isMandatory: boolean;
  readonly order: number;
}

interface AmostraSummary {
  readonly id_amostra: number;
  readonly descricao: string;
  readonly municipio_nome?: string;
  readonly uf?: string;
  readonly tamanho_amostral?: number;
}

export function SamplingDimensionsFeature(): React.JSX.Element {
  const [amostras, setAmostras] = useState<readonly AmostraSummary[]>([]);
  const [dimensions, setDimensions] = useState<readonly DimensionRecord[]>([]);
  const [selectedAmostraId, setSelectedAmostraId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"TODOS" | "OBRIGATORIAS" | "OPCIONAIS">("TODOS");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = async (): Promise<void> => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [opcoesRes, dimRes] = await Promise.all([
        fetch(API_OPCOES, { cache: "no-store" }),
        fetch(API_DIMENSOES, { cache: "no-store" }),
      ]);

      const opcoesData = opcoesRes.ok ? await opcoesRes.json() : {};
      const ams: AmostraSummary[] = Array.isArray(opcoesData?.amostras) ? opcoesData.amostras : [];
      setAmostras(ams);

      if (!dimRes.ok) {
        throw new Error(`Falha ao carregar variáveis de controle (HTTP ${dimRes.status}).`);
      }
      const items: any[] = await dimRes.json();
      const mapped: DimensionRecord[] = (Array.isArray(items) ? items : []).map((d) => ({
        id: Number(d.id_amostra_dimensao),
        sampleId: Number(d.id_amostra),
        sampleName: d.amostra_descricao || `Amostra #${d.id_amostra}`,
        name: String(d.nome_dimensao || ""),
        source: d.fonte_dados || "IBGE / TSE",
        isMandatory: Boolean(d.obrigatoria),
        order: Number(d.ordem_exibicao ?? 1),
      }));
      setDimensions(mapped);

      setSelectedAmostraId((curr) => {
        if (curr !== null && ams.some((a) => a.id_amostra === curr)) return curr;
        return ams[0]?.id_amostra ?? null;
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao carregar dimensões amostrais.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const selectedAmostra = useMemo(
    () => amostras.find((a) => a.id_amostra === selectedAmostraId) ?? null,
    [amostras, selectedAmostraId]
  );

  const dimsForSample = useMemo(() => {
    if (selectedAmostraId === null) return dimensions;
    return dimensions.filter((d) => d.sampleId === selectedAmostraId);
  }, [dimensions, selectedAmostraId]);

  const filtered = useMemo(() => {
    return dimsForSample
      .filter((d) => {
        if (activeTab === "OBRIGATORIAS" && !d.isMandatory) return false;
        if (activeTab === "OPCIONAIS" && d.isMandatory) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          return (
            d.name.toLowerCase().includes(q) ||
            d.source.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => a.order - b.order);
  }, [dimsForSample, activeTab, search]);

  const countBySample = useMemo(() => {
    const map = new Map<number, number>();
    for (const d of dimensions) {
      map.set(d.sampleId, (map.get(d.sampleId) ?? 0) + 1);
    }
    return map;
  }, [dimensions]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", color: colors.textPrimary }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 600, letterSpacing: "-0.01em" }}>
            Variáveis de Controle Amostral
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: colors.textMuted }}>
            Estratificação de quotas sociodemográficas e geográficas por plano amostral (amostras_dimensao).
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadData()}
          style={{ ...NOCTURNE_BUTTON_STYLES.ghost, padding: "8px 14px", fontSize: "12px" }}
        >
          Atualizar
        </button>
      </div>

      {errorMsg && (
        <div
          role="alert"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 14px",
            borderRadius: "12px",
            backgroundColor: "rgba(242, 139, 130, 0.12)",
            border: `1px solid ${colors.errorPastel}`,
            color: colors.errorPastel,
            fontSize: "12.5px",
          }}
        >
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => void loadData()}
            style={{ ...NOCTURNE_BUTTON_STYLES.ghost, padding: "5px 10px", fontSize: "11.5px" }}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Mestre-Detalhe: Amostras (Pai) -> Dimensões (Filho) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(270px, 320px) minmax(0, 1fr)",
          gap: "16px",
          alignItems: "start",
        }}
      >
        <section
          aria-label="Planos amostrais"
          style={{
            backgroundColor: colors.surfaceContainerLow,
            border: `1px solid ${colors.borderSubtle}`,
            borderRadius: "16px",
            padding: "14px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: "13.5px", fontWeight: 600 }}>
              Amostras ({amostras.length})
            </h3>
            {selectedAmostraId !== null && (
              <button
                type="button"
                onClick={() => setSelectedAmostraId(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: colors.primaryContainer,
                  fontSize: "11.5px",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Ver todas
              </button>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "62vh", overflowY: "auto" }}>
            {loading &&
              [1, 2, 3].map((n) => (
                <div
                  key={n}
                  style={{
                    height: "62px",
                    borderRadius: "12px",
                    backgroundColor: colors.surfaceCard,
                    opacity: 0.55,
                  }}
                />
              ))}

            {!loading && amostras.length === 0 && (
              <div style={{ padding: "18px 10px", textAlign: "center", color: colors.textMuted, fontSize: "12px" }}>
                Nenhuma amostra cadastrada.
              </div>
            )}

            {!loading &&
              amostras.map((a) => {
                const isSelected = a.id_amostra === selectedAmostraId;
                const dimCount = countBySample.get(a.id_amostra) ?? 0;
                return (
                  <div
                    key={a.id_amostra}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedAmostraId(a.id_amostra)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedAmostraId(a.id_amostra);
                      }
                    }}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "12px",
                      border: `1px solid ${isSelected ? colors.borderFocus : colors.borderSubtle}`,
                      backgroundColor: isSelected ? colors.surfaceContainerHigh : colors.surfaceCard,
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 600 }}>{a.descricao}</span>
                      <span style={{ fontSize: "11px", color: colors.textMuted }}>#{a.id_amostra}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px", color: colors.textMuted }}>
                      <span>{a.municipio_nome ? `${a.municipio_nome} / ${a.uf || ""}` : "—"}</span>
                      <span style={{ color: colors.primaryContainer, fontWeight: 600 }}>
                        {dimCount} {dimCount === 1 ? "dimensão" : "dimensões"}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>

        <section
          aria-label="Dimensões da amostra"
          style={{
            backgroundColor: colors.surfaceContainerLow,
            border: `1px solid ${colors.borderSubtle}`,
            borderRadius: "16px",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px",
              paddingBottom: "10px",
              borderBottom: `1px solid ${colors.borderSubtle}`,
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600 }}>
                {selectedAmostra ? selectedAmostra.descricao : "Todas as Amostras"}
              </h3>
              <span style={{ fontSize: "12px", color: colors.textMuted }}>
                {dimsForSample.length} variáveis de controle configuradas
              </span>
            </div>

            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar variável ou fonte..."
                style={{
                  padding: "7px 11px",
                  borderRadius: "10px",
                  border: `1px solid ${colors.borderSubtle}`,
                  backgroundColor: colors.surfaceContainer,
                  color: colors.textPrimary,
                  fontSize: "12px",
                  minWidth: "200px",
                }}
              />
            </div>
          </div>

          <div
            role="tablist"
            style={{
              display: "inline-flex",
              alignSelf: "flex-start",
              backgroundColor: colors.surfaceCard,
              border: `1px solid ${colors.borderSubtle}`,
              borderRadius: "9999px",
              padding: "3px",
              gap: "4px",
            }}
          >
            {(
              [
                { id: "TODOS", label: `Todas (${dimsForSample.length})` },
                { id: "OBRIGATORIAS", label: `Obrigatórias (${dimsForSample.filter((d) => d.isMandatory).length})` },
                { id: "OPCIONAIS", label: `Estratificadoras (${dimsForSample.filter((d) => !d.isMandatory).length})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: "5px 12px",
                  borderRadius: "9999px",
                  border: "none",
                  backgroundColor: activeTab === tab.id ? colors.surfaceContainerHigh : "transparent",
                  color: activeTab === tab.id ? colors.textPrimary : colors.textMuted,
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ overflowX: "auto" }}>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {[1, 2, 3].map((n) => (
                  <div key={n} style={{ height: "36px", borderRadius: "8px", backgroundColor: colors.surfaceCard, opacity: 0.55 }} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div
                style={{
                  padding: "28px 16px",
                  textAlign: "center",
                  color: colors.textMuted,
                  fontSize: "12.5px",
                  border: `1px dashed ${colors.borderSubtle}`,
                  borderRadius: "12px",
                }}
              >
                Nenhuma variável de controle encontrada para o filtro atual.
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: `1px solid ${colors.borderSubtle}`,
                      textAlign: "left",
                      color: colors.textMuted,
                      fontSize: "11px",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    <th style={{ padding: "8px 6px" }}>Ordem</th>
                    <th style={{ padding: "8px 6px" }}>Variável / Dimensão</th>
                    {selectedAmostraId === null && <th style={{ padding: "8px 6px" }}>Amostra</th>}
                    <th style={{ padding: "8px 6px" }}>Fonte de Dados</th>
                    <th style={{ padding: "8px 6px" }}>Controle</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((d) => (
                    <tr key={d.id} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                      <td style={{ padding: "9px 6px", fontWeight: 700, color: colors.primaryContainer }}>#{d.order}</td>
                      <td style={{ padding: "9px 6px", fontWeight: 600 }}>{d.name}</td>
                      {selectedAmostraId === null && (
                        <td style={{ padding: "9px 6px", color: colors.textMuted }}>{d.sampleName}</td>
                      )}
                      <td style={{ padding: "9px 6px" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            padding: "2px 8px",
                            borderRadius: "9999px",
                            backgroundColor: colors.surfaceCard,
                            border: `1px solid ${colors.borderSubtle}`,
                            color: colors.textMuted,
                          }}
                        >
                          {d.source}
                        </span>
                      </td>
                      <td style={{ padding: "9px 6px", fontWeight: 600, color: d.isMandatory ? colors.successPastel : colors.warningPastel }}>
                        {d.isMandatory ? "● Cota Rígida" : "○ Estratificadora"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
