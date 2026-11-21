import React, { useCallback, useEffect, useMemo, useState } from "react";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";
import { SearchableCombobox } from "../../components/ui/SearchableCombobox";
import { useUiSessionStore } from "../../lib/store";

const { colors, typography } = NOCTURNE_TOKENS;
const API_OPCOES = "http://127.0.0.1:8000/api/v1/campo-operacoes/resumo-opcoes";
const API_TABULACAO = "http://127.0.0.1:8000/api/v1/tabulacao-ponderada";

interface PesquisaOption {
  readonly id_pesquisa: number;
  readonly nome: string;
  readonly status: string;
}

interface TabulacaoItem {
  readonly id_candidato_produto: number | null;
  readonly candidato: string;
  readonly partido: string;
  readonly cor_hex: string;
  readonly is_nao_valido: boolean;
  readonly votos_brutos: number;
  readonly votos_ponderados: number;
  readonly pct_bruto: number;
  readonly pct_ponderado: number;
  readonly pct_validos: number;
  readonly pct_rejeicao: number;
}

interface CenarioTabulacao {
  readonly id_cenario: number;
  readonly cenario_nome: string;
  readonly tipo_cenario: string;
  readonly total_votos_brutos: number;
  readonly total_votos_ponderados: number;
  readonly itens: readonly TabulacaoItem[];
}

interface CrosstabRow {
  readonly segmento: string;
  readonly candidato: string;
  readonly votos_brutos: number;
  readonly votos_ponderados: number;
}

interface TabulacaoResponse {
  readonly pesquisa: {
    readonly id_pesquisa: number;
    readonly nome: string;
    readonly status: string;
    readonly is_bloqueada: boolean;
    readonly numero_registro_tse?: string | null;
    readonly municipio_nome?: string | null;
    readonly uf?: string | null;
    readonly tamanho_amostral: number;
    readonly margem_erro: number;
  };
  readonly metricas_kish: {
    readonly n_bruto_aprovado: number;
    readonly n_efetivo_kish: number;
    readonly deff_kish: number;
    readonly margem_erro_nominal_pp: number;
    readonly margem_erro_real_ponderada_pp: number;
    readonly peso_minimo: number;
    readonly peso_maximo: number;
    readonly peso_medio: number;
  };
  readonly cenarios: readonly CenarioTabulacao[];
  readonly dimensao_crosstab: string;
  readonly crosstabs: readonly CrosstabRow[];
}

const DIMENSOES_CROSSTAB = [
  { value: "sexo", label: "Sexo" },
  { value: "faixa_etaria", label: "Faixa Etária" },
  { value: "escolaridade", label: "Escolaridade" },
  { value: "faixa_renda", label: "Faixa de Renda" },
  { value: "religiao", label: "Religião" },
];

export function TseTabulationFeature(): React.JSX.Element {
  const currentUser = useUiSessionStore((s) => s.currentUser);
  const [pesquisas, setPesquisas] = useState<readonly PesquisaOption[]>([]);
  const [selectedPesquisaId, setSelectedPesquisaId] = useState<string>("");
  const [dimensaoCrosstab, setDimensaoCrosstab] = useState<string>("sexo");
  const [selectedCenarioIdx, setSelectedCenarioIdx] = useState<number>(0);
  const [onlyValidVotes, setOnlyValidVotes] = useState<boolean>(false);

  const [minWeight, setMinWeight] = useState<string>("0.30");
  const [maxWeight, setMaxWeight] = useState<string>("3.00");

  const [data, setData] = useState<TabulacaoResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [runningRaking, setRunningRaking] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch(API_OPCOES, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((op) => {
        const list: PesquisaOption[] = Array.isArray(op?.pesquisas) ? op.pesquisas : [];
        setPesquisas(list);
        if (list.length > 0 && list[0]) {
          setSelectedPesquisaId(String(list[0].id_pesquisa));
        }
      })
      .catch(() => setErrorMsg("Não foi possível carregar a lista de pesquisas do banco."));
  }, []);

  const loadTabulacao = useCallback(async (): Promise<void> => {
    if (!selectedPesquisaId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(
        `${API_TABULACAO}/pesquisas/${selectedPesquisaId}?dimensao_crosstab=${encodeURIComponent(dimensaoCrosstab)}`,
        { cache: "no-store" }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.detail || `Erro ao carregar tabulação (HTTP ${res.status}).`);
      }
      const json = (await res.json()) as TabulacaoResponse;
      setData(json);
      setSelectedCenarioIdx(0);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao consultar tabulação ponderada.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedPesquisaId, dimensaoCrosstab]);

  useEffect(() => {
    void loadTabulacao();
  }, [loadTabulacao]);

  const handleRunRaking = async (): Promise<void> => {
    if (!selectedPesquisaId) return;
    setRunningRaking(true);
    setErrorMsg(null);
    setFeedbackMsg(null);
    try {
      const numericUserId = currentUser?.id && /^\d+$/.test(currentUser.id) ? Number(currentUser.id) : null;
      const res = await fetch(`${API_TABULACAO}/pesquisas/${selectedPesquisaId}/raking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          min_weight: Number(minWeight) || 0.3,
          max_weight: Number(maxWeight) || 3.0,
          salvar_relatorio_diagnostico: true,
          id_usuario: numericUserId,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.detail || `Falha ao executar Raking (HTTP ${res.status}).`);
      }
      const diag = await res.json();
      setFeedbackMsg(
        `Raking (IPF) concluído em ${diag.iteracoes_executadas} iterações (${diag.convergiu ? "convergiu" : "limite atingido"}) • N efetivo: ${diag.n_efetivo_kish} • DEFF Kish: ${diag.deff_kish} • Margem real: ±${diag.margem_erro_real_ponderada_pp} p.p.`
      );
      await loadTabulacao();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao executar ponderação Raking (IPF).");
    } finally {
      setRunningRaking(false);
    }
  };

  const activeCenario = data?.cenarios[selectedCenarioIdx] ?? data?.cenarios[0] ?? null;

  const displayedItems = useMemo(() => {
    if (!activeCenario) return [];
    return onlyValidVotes
      ? activeCenario.itens.filter((i) => !i.is_nao_valido)
      : activeCenario.itens;
  }, [activeCenario, onlyValidVotes]);

  const kish = data?.metricas_kish;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        color: colors.textPrimary,
        fontFamily: typography.fontFamily,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 600 }}>
            Ponderação Raking (IPF) & Tabulação Ponderada
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: colors.textMuted }}>
            Pós-estratificação com Weight Trimming, Deff de Kish e apuração ponderada diretamente do PostgreSQL.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: colors.textMuted }}>
            Min W:
            <input
              type="number"
              step="0.05"
              min="0.05"
              max="1"
              value={minWeight}
              onChange={(e) => setMinWeight(e.target.value)}
              style={{
                width: "64px",
                padding: "7px 8px",
                borderRadius: "8px",
                border: `1px solid ${colors.borderSubtle}`,
                backgroundColor: colors.surfaceCard,
                color: colors.textPrimary,
                fontSize: "12px",
              }}
            />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: colors.textMuted }}>
            Max W:
            <input
              type="number"
              step="0.1"
              min="1"
              max="10"
              value={maxWeight}
              onChange={(e) => setMaxWeight(e.target.value)}
              style={{
                width: "64px",
                padding: "7px 8px",
                borderRadius: "8px",
                border: `1px solid ${colors.borderSubtle}`,
                backgroundColor: colors.surfaceCard,
                color: colors.textPrimary,
                fontSize: "12px",
              }}
            />
          </label>
          <button
            type="button"
            disabled={runningRaking || !selectedPesquisaId || data?.pesquisa.is_bloqueada}
            onClick={() => void handleRunRaking()}
            style={{
              padding: "9px 16px",
              borderRadius: "10px",
              border: `1px solid ${colors.warningPastel}`,
              backgroundColor: colors.warningContainer,
              color: colors.onWarningContainer,
              fontSize: "12.5px",
              fontWeight: 700,
              cursor: runningRaking || data?.pesquisa.is_bloqueada ? "not-allowed" : "pointer",
              opacity: runningRaking || data?.pesquisa.is_bloqueada ? 0.55 : 1,
            }}
          >
            {runningRaking ? "Executando IPF..." : "⚖️ Executar Raking (IPF)"}
          </button>
        </div>
      </div>

      {/* Feedback / Error Banners */}
      {feedbackMsg && (
        <div
          role="status"
          style={{
            padding: "10px 14px",
            borderRadius: "12px",
            backgroundColor: colors.successContainer,
            color: colors.onSuccessContainer,
            border: `1px solid ${colors.successPastel}`,
            fontSize: "13px",
            fontWeight: 500,
          }}
        >
          {feedbackMsg}
        </div>
      )}
      {errorMsg && (
        <div
          role="alert"
          style={{
            padding: "10px 14px",
            borderRadius: "12px",
            backgroundColor: colors.errorContainer,
            color: colors.onErrorContainer,
            border: `1px solid ${colors.errorPastel}`,
            fontSize: "13px",
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* Barra de Seleção (Pesquisa + Dimensão + Votos Válidos) */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-end",
          gap: "12px",
          padding: "14px 16px",
          borderRadius: "14px",
          backgroundColor: colors.surfaceContainerLow,
          border: `1px solid ${colors.borderSubtle}`,
        }}
      >
        <div style={{ flex: "1 1 300px", minWidth: "240px" }}>
          <div style={{ fontSize: "11px", color: colors.textMuted, marginBottom: "4px" }}>Pesquisa</div>
          <SearchableCombobox
            value={selectedPesquisaId}
            placeholder="Digite o nome da pesquisa..."
            options={pesquisas.map((p) => ({
              value: String(p.id_pesquisa),
              label: `#${p.id_pesquisa} — ${p.nome}`,
              sublabel: p.status,
            }))}
            onChange={setSelectedPesquisaId}
          />
        </div>

        <div style={{ width: "200px" }}>
          <div style={{ fontSize: "11px", color: colors.textMuted, marginBottom: "4px" }}>Crosstab por Dimensão</div>
          <SearchableCombobox
            value={dimensaoCrosstab}
            options={DIMENSOES_CROSSTAB}
            onChange={setDimensaoCrosstab}
          />
        </div>

        <button
          type="button"
          onClick={() => setOnlyValidVotes((v) => !v)}
          style={{
            padding: "9px 14px",
            borderRadius: "10px",
            border: `1px solid ${onlyValidVotes ? colors.primaryContainer : colors.borderSubtle}`,
            backgroundColor: onlyValidVotes ? colors.primaryContainer : colors.surfaceCard,
            color: onlyValidVotes ? colors.onPrimary : colors.textPrimary,
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {onlyValidVotes ? "Exibindo: Votos Válidos" : "Exibindo: Votos Totais"}
        </button>
      </div>

      {/* KPIs de Kish */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "12px" }}>
        {[
          { label: "N Bruto Aprovado", value: (kish?.n_bruto_aprovado ?? 0).toLocaleString("pt-BR") },
          { label: "N Efetivo (Kish)", value: (kish?.n_efetivo_kish ?? 0).toLocaleString("pt-BR") },
          { label: "DEFF de Kish", value: kish ? kish.deff_kish.toFixed(4) : "—" },
          {
            label: "Margem Real Ponderada",
            value: kish ? `±${kish.margem_erro_real_ponderada_pp.toFixed(2)} p.p.` : "—",
          },
          {
            label: "Faixa de Pesos (Min–Max)",
            value: kish ? `${kish.peso_minimo.toFixed(2)} – ${kish.peso_maximo.toFixed(2)}` : "—",
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            style={{
              backgroundColor: colors.surfaceCard,
              border: `1px solid ${colors.borderSubtle}`,
              borderRadius: "14px",
              padding: "14px 16px",
            }}
          >
            <div style={{ fontSize: "11px", color: colors.textMuted, textTransform: "uppercase" }}>{kpi.label}</div>
            <div style={{ fontSize: "20px", fontWeight: 600, marginTop: "4px" }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Tabela de Tabulação Ponderada */}
      <div
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
          <h3 style={{ margin: 0, fontSize: "15px" }}>
            Resultado Ponderado {activeCenario ? `— ${activeCenario.cenario_nome}` : ""}
          </h3>
          {data && data.cenarios.length > 1 && (
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {data.cenarios.map((c, idx) => (
                <button
                  key={c.id_cenario}
                  type="button"
                  onClick={() => setSelectedCenarioIdx(idx)}
                  style={{
                    padding: "5px 10px",
                    borderRadius: "9999px",
                    border: `1px solid ${idx === selectedCenarioIdx ? colors.primaryContainer : colors.borderSubtle}`,
                    backgroundColor: idx === selectedCenarioIdx ? colors.primaryContainer : colors.surfaceCard,
                    color: idx === selectedCenarioIdx ? colors.onPrimary : colors.textPrimary,
                    fontSize: "11.5px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {c.cenario_nome}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ padding: "24px", textAlign: "center", fontSize: "13px", color: colors.textMuted }}>
            Carregando tabulação do banco de dados...
          </div>
        ) : displayedItems.length === 0 ? (
          <div style={{ padding: "28px", textAlign: "center", fontSize: "13px", color: colors.textMuted }}>
            Nenhuma resposta aprovada registrada para esta pesquisa ainda.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${colors.borderSubtle}`, textAlign: "left", color: colors.textMuted, fontSize: "11px", textTransform: "uppercase" }}>
                  <th style={{ padding: "10px" }}>Candidato / Opção</th>
                  <th style={{ padding: "10px" }}>Partido</th>
                  <th style={{ padding: "10px", textAlign: "right" }}>Votos Brutos</th>
                  <th style={{ padding: "10px", textAlign: "right" }}>% Bruto</th>
                  <th style={{ padding: "10px", textAlign: "right" }}>Votos Ponderados</th>
                  <th style={{ padding: "10px", textAlign: "right" }}>% Ponderado</th>
                  <th style={{ padding: "10px", textAlign: "right" }}>% Válidos</th>
                  <th style={{ padding: "10px", textAlign: "right" }}>Rejeição %</th>
                </tr>
              </thead>
              <tbody>
                {displayedItems.map((item, idx) => (
                  <tr key={`${item.candidato}-${idx}`} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                    <td style={{ padding: "10px", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ width: "10px", height: "10px", borderRadius: "9999px", backgroundColor: item.cor_hex, display: "inline-block" }} />
                      {item.candidato}
                    </td>
                    <td style={{ padding: "10px", color: colors.textMuted }}>{item.partido}</td>
                    <td style={{ padding: "10px", textAlign: "right", fontFamily: "monospace" }}>
                      {item.votos_brutos.toLocaleString("pt-BR")}
                    </td>
                    <td style={{ padding: "10px", textAlign: "right", fontFamily: "monospace" }}>
                      {item.pct_bruto.toFixed(2)}%
                    </td>
                    <td style={{ padding: "10px", textAlign: "right", fontFamily: "monospace", fontWeight: 600 }}>
                      {item.votos_ponderados.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: "10px", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: colors.primaryContainer }}>
                      {item.pct_ponderado.toFixed(2)}%
                    </td>
                    <td style={{ padding: "10px", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: colors.successPastel }}>
                      {item.is_nao_valido ? "—" : `${item.pct_validos.toFixed(2)}%`}
                    </td>
                    <td style={{ padding: "10px", textAlign: "right", fontFamily: "monospace", color: colors.errorPastel }}>
                      {item.pct_rejeicao.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Crosstab Ponderado */}
      {data && data.crosstabs.length > 0 && (
        <div
          style={{
            backgroundColor: colors.surfaceContainerLow,
            border: `1px solid ${colors.borderSubtle}`,
            borderRadius: "16px",
            padding: "16px",
          }}
        >
          <h3 style={{ margin: "0 0 12px", fontSize: "15px" }}>
            Crosstab Ponderado — {DIMENSOES_CROSSTAB.find((d) => d.value === dimensaoCrosstab)?.label ?? dimensaoCrosstab}
          </h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${colors.borderSubtle}`, textAlign: "left", color: colors.textMuted, fontSize: "11px", textTransform: "uppercase" }}>
                  <th style={{ padding: "8px 10px" }}>Segmento</th>
                  <th style={{ padding: "8px 10px" }}>Candidato / Opção</th>
                  <th style={{ padding: "8px 10px", textAlign: "right" }}>Votos Brutos</th>
                  <th style={{ padding: "8px 10px", textAlign: "right" }}>Votos Ponderados</th>
                </tr>
              </thead>
              <tbody>
                {data.crosstabs.map((row, idx) => (
                  <tr key={`${row.segmento}-${row.candidato}-${idx}`} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                    <td style={{ padding: "8px 10px", fontWeight: 600 }}>{row.segmento}</td>
                    <td style={{ padding: "8px 10px" }}>{row.candidato}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "monospace" }}>
                      {row.votos_brutos.toLocaleString("pt-BR")}
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "monospace", fontWeight: 600 }}>
                      {Number(row.votos_ponderados).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
