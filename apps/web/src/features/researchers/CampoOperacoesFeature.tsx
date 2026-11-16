import React, { useEffect, useState } from "react";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";

const { colors } = NOCTURNE_TOKENS;
const API_BASE = "http://127.0.0.1:8000/api/v1/campo-operacoes";

type SubTab = "atribuicoes" | "transferencias" | "reatribuicoes" | "sessoes_logs";

const CARD_STYLE: React.CSSProperties = {
  backgroundColor: colors.surfaceContainerLow,
  border: `1px solid ${colors.borderSubtle}`,
  borderRadius: "14px",
  padding: "20px",
};

const INPUT_STYLE: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: "8px",
  border: `1px solid ${colors.borderSubtle}`,
  backgroundColor: colors.surfaceContainer,
  color: colors.textPrimary,
  fontSize: "12px",
};

export function CampoOperacoesFeature(): React.JSX.Element {
  const [tab, setTab] = useState<SubTab>("atribuicoes");
  const [atribuicoes, setAtribuicoes] = useState<any[]>([]);
  const [transferencias, setTransferencias] = useState<any[]>([]);
  const [reatribuicoes, setReatribuicoes] = useState<any[]>([]);
  const [sessoes, setSessoes] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [pesquisasOpt, setPesquisasOpt] = useState<any[]>([]);
  const [profissionaisOpt, setProfissionaisOpt] = useState<any[]>([]);

  const [atrPesquisa, setAtrPesquisa] = useState("1");
  const [atrProf, setAtrProf] = useState("1");
  const [atrLote, setAtrLote] = useState("Setor 014");
  const [atrMeta, setAtrMeta] = useState("150");

  const [trPesquisa, setTrPesquisa] = useState("1");
  const [trOrig, setTrOrig] = useState("1");
  const [trDest, setTrDest] = useState("2");
  const [trQtd, setTrQtd] = useState("25");
  const [trMotivo, setTrMotivo] = useState("Redistribuição de carga em campo");

  const [reQuest, setReQuest] = useState("");
  const [reAnt, setReAnt] = useState("1");
  const [reNovo, setReNovo] = useState("2");
  const [reMotivo, setReMotivo] = useState("Reatribuição de questionário");

  const loadAll = async (): Promise<void> => {
    try {
      const [a, t, r, s, l, op] = await Promise.all([
        fetch(`${API_BASE}/atribuicoes`).then((res) => (res.ok ? res.json() : [])),
        fetch(`${API_BASE}/transferencias`).then((res) => (res.ok ? res.json() : [])),
        fetch(`${API_BASE}/reatribuicoes`).then((res) => (res.ok ? res.json() : [])),
        fetch(`${API_BASE}/sessoes-profissionais`).then((res) => (res.ok ? res.json() : [])),
        fetch(`${API_BASE}/logs-autenticacao`).then((res) => (res.ok ? res.json() : [])),
        fetch(`${API_BASE}/resumo-opcoes`).then((res) => (res.ok ? res.json() : ({} as any))),
      ]);
      setAtribuicoes(Array.isArray(a) ? a : []);
      setTransferencias(Array.isArray(t) ? t : []);
      setReatribuicoes(Array.isArray(r) ? r : []);
      setSessoes(Array.isArray(s) ? s : []);
      setLogs(Array.isArray(l) ? l : []);
      if (Array.isArray(op?.pesquisas)) setPesquisasOpt(op.pesquisas);
      if (Array.isArray(op?.profissionais)) setProfissionaisOpt(op.profissionais);
    } catch {
      // ignore network error
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const handleCreateAtribuicao = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const res = await fetch(`${API_BASE}/atribuicoes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_pesquisa: Number(atrPesquisa),
        id_profissional: Number(atrProf),
        lote_setor: atrLote,
        meta_entrevistas: Number(atrMeta),
      }),
    });
    if (res.ok) void loadAll();
  };

  const handleCreateTransferencia = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const res = await fetch(`${API_BASE}/transferencias`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_pesquisa: Number(trPesquisa),
        id_pesquisador_origem: Number(trOrig),
        id_pesquisador_destino: Number(trDest),
        quantidade_transferida: Number(trQtd),
        motivo: trMotivo,
      }),
    });
    if (res.ok) void loadAll();
  };

  const handleCreateReatribuicao = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const res = await fetch(`${API_BASE}/reatribuicoes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_questionario_pessoa: reQuest ? Number(reQuest) : null,
        id_pesquisador_anterior: Number(reAnt),
        id_pesquisador_novo: Number(reNovo),
        motivo: reMotivo,
      }),
    });
    if (res.ok) void loadAll();
  };

  const tabBtn = (id: SubTab, label: string): React.JSX.Element => (
    <button
      type="button"
      onClick={() => setTab(id)}
      style={{
        padding: "8px 14px",
        borderRadius: "8px",
        border: "none",
        cursor: "pointer",
        fontSize: "12px",
        fontWeight: 600,
        backgroundColor: tab === id ? "#8ab4f8" : "#2a2a2a",
        color: tab === id ? "#003061" : "#e5e2e1",
      }}
    >
      {label}
    </button>
  );

  return (
    <section style={CARD_STYLE}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "16px", color: colors.textPrimary }}>
            Operações de Campo, Transferências & Auditoria de Acesso
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: colors.onSurfaceVariant }}>
            Persistência direta em Atribuições, Transferências, Reatribuições, Sessões e Logs de Autenticação
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {tabBtn("atribuicoes", `Atribuições (${atribuicoes.length})`)}
          {tabBtn("transferencias", `Transferências (${transferencias.length})`)}
          {tabBtn("reatribuicoes", `Reatribuições (${reatribuicoes.length})`)}
          {tabBtn("sessoes_logs", `Sessões (${sessoes.length}) & Logs (${logs.length})`)}
        </div>
      </div>

      {tab === "atribuicoes" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <form onSubmit={handleCreateAtribuicao} style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <select style={INPUT_STYLE} value={atrPesquisa} onChange={(e) => setAtrPesquisa(e.target.value)} required>
              {pesquisasOpt.map((p) => (
                <option key={p.id_pesquisa} value={p.id_pesquisa}>{p.nome}</option>
              ))}
            </select>
            <select style={INPUT_STYLE} value={atrProf} onChange={(e) => setAtrProf(e.target.value)} required>
              {profissionaisOpt.map((p) => (
                <option key={p.id_profissional} value={p.id_profissional}>{p.nome}</option>
              ))}
            </select>
            <input style={INPUT_STYLE} placeholder="Lote / Setor" value={atrLote} onChange={(e) => setAtrLote(e.target.value)} required />
            <input style={INPUT_STYLE} type="number" placeholder="Meta" value={atrMeta} onChange={(e) => setAtrMeta(e.target.value)} required />
            <button type="submit" style={{ padding: "8px 14px", borderRadius: "8px", border: "none", backgroundColor: "#81c995", color: "#00391b", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}>
              + Nova Atribuição
            </button>
          </form>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", color: colors.textPrimary }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${colors.borderSubtle}`, textAlign: "left", color: colors.onSurfaceVariant }}>
                  <th style={{ padding: "8px" }}>ID</th>
                  <th style={{ padding: "8px" }}>Profissional</th>
                  <th style={{ padding: "8px" }}>Pesquisa</th>
                  <th style={{ padding: "8px" }}>Lote / Setor</th>
                  <th style={{ padding: "8px" }}>Meta</th>
                  <th style={{ padding: "8px" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {atribuicoes.map((a) => (
                  <tr key={a.id_atribuicao} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                    <td style={{ padding: "8px" }}>{a.id_atribuicao}</td>
                    <td style={{ padding: "8px" }}>{a.profissional_nome || `Prof #${a.id_profissional}`}</td>
                    <td style={{ padding: "8px" }}>{a.pesquisa_titulo || `Pesq #${a.id_pesquisa}`}</td>
                    <td style={{ padding: "8px" }}>{a.lote_setor}</td>
                    <td style={{ padding: "8px" }}>{a.meta_entrevistas}</td>
                    <td style={{ padding: "8px" }}>{a.status_atribuicao}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "transferencias" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <form onSubmit={handleCreateTransferencia} style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <select style={INPUT_STYLE} value={trPesquisa} onChange={(e) => setTrPesquisa(e.target.value)} required>
              {pesquisasOpt.map((p) => (
                <option key={p.id_pesquisa} value={p.id_pesquisa}>{p.nome}</option>
              ))}
            </select>
            <select style={INPUT_STYLE} value={trOrig} onChange={(e) => setTrOrig(e.target.value)} required>
              {profissionaisOpt.map((p) => (
                <option key={p.id_profissional} value={p.id_profissional}>Orig: {p.nome}</option>
              ))}
            </select>
            <select style={INPUT_STYLE} value={trDest} onChange={(e) => setTrDest(e.target.value)} required>
              {profissionaisOpt.map((p) => (
                <option key={p.id_profissional} value={p.id_profissional}>Dest: {p.nome}</option>
              ))}
            </select>
            <input style={INPUT_STYLE} type="number" placeholder="Qtd" value={trQtd} onChange={(e) => setTrQtd(e.target.value)} required />
            <input style={{ ...INPUT_STYLE, minWidth: "220px" }} placeholder="Motivo" value={trMotivo} onChange={(e) => setTrMotivo(e.target.value)} required />
            <button type="submit" style={{ padding: "8px 14px", borderRadius: "8px", border: "none", backgroundColor: "#81c995", color: "#00391b", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}>
              + Registrar Transferência
            </button>
          </form>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", color: colors.textPrimary }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${colors.borderSubtle}`, textAlign: "left", color: colors.onSurfaceVariant }}>
                  <th style={{ padding: "8px" }}>ID</th>
                  <th style={{ padding: "8px" }}>Origem</th>
                  <th style={{ padding: "8px" }}>Destino</th>
                  <th style={{ padding: "8px" }}>Qtd</th>
                  <th style={{ padding: "8px" }}>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {transferencias.map((t) => (
                  <tr key={t.id_transferencia} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                    <td style={{ padding: "8px" }}>{t.id_transferencia}</td>
                    <td style={{ padding: "8px" }}>{t.origem_nome || `Prof #${t.id_pesquisador_origem}`}</td>
                    <td style={{ padding: "8px" }}>{t.destino_nome || `Prof #${t.id_pesquisador_destino}`}</td>
                    <td style={{ padding: "8px" }}>{t.quantidade_transferida}</td>
                    <td style={{ padding: "8px" }}>{t.motivo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "reatribuicoes" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <form onSubmit={handleCreateReatribuicao} style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <input style={INPUT_STYLE} type="number" placeholder="ID Questionário (opc)" value={reQuest} onChange={(e) => setReQuest(e.target.value)} />
            <select style={INPUT_STYLE} value={reAnt} onChange={(e) => setReAnt(e.target.value)} required>
              {profissionaisOpt.map((p) => (
                <option key={p.id_profissional} value={p.id_profissional}>Ant: {p.nome}</option>
              ))}
            </select>
            <select style={INPUT_STYLE} value={reNovo} onChange={(e) => setReNovo(e.target.value)} required>
              {profissionaisOpt.map((p) => (
                <option key={p.id_profissional} value={p.id_profissional}>Novo: {p.nome}</option>
              ))}
            </select>
            <input style={{ ...INPUT_STYLE, minWidth: "220px" }} placeholder="Motivo" value={reMotivo} onChange={(e) => setReMotivo(e.target.value)} required />
            <button type="submit" style={{ padding: "8px 14px", borderRadius: "8px", border: "none", backgroundColor: "#81c995", color: "#00391b", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}>
              + Reatribuir Questionário
            </button>
          </form>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", color: colors.textPrimary }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${colors.borderSubtle}`, textAlign: "left", color: colors.onSurfaceVariant }}>
                  <th style={{ padding: "8px" }}>ID</th>
                  <th style={{ padding: "8px" }}>Questionário</th>
                  <th style={{ padding: "8px" }}>Anterior</th>
                  <th style={{ padding: "8px" }}>Novo</th>
                  <th style={{ padding: "8px" }}>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {reatribuicoes.map((r) => (
                  <tr key={r.id_historico_reatribuicao} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                    <td style={{ padding: "8px" }}>{r.id_historico_reatribuicao}</td>
                    <td style={{ padding: "8px" }}>{r.id_questionario_pessoa ?? "—"}</td>
                    <td style={{ padding: "8px" }}>{r.anterior_nome || `Prof #${r.id_pesquisador_anterior}`}</td>
                    <td style={{ padding: "8px" }}>{r.novo_nome || `Prof #${r.id_pesquisador_novo}`}</td>
                    <td style={{ padding: "8px" }}>{r.motivo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "sessoes_logs" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div>
            <h4 style={{ margin: "0 0 8px", fontSize: "13px", color: colors.textPrimary }}>Sessões Refresh Tokens</h4>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", color: colors.textPrimary }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${colors.borderSubtle}`, textAlign: "left", color: colors.onSurfaceVariant }}>
                  <th style={{ padding: "6px" }}>Profissional</th>
                  <th style={{ padding: "6px" }}>IP</th>
                  <th style={{ padding: "6px" }}>Revogado</th>
                </tr>
              </thead>
              <tbody>
                {sessoes.map((s) => (
                  <tr key={s.id_sessao} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                    <td style={{ padding: "6px" }}>{s.profissional_nome || `User #${s.id_usuario ?? "—"}`}</td>
                    <td style={{ padding: "6px" }}>{s.ip_origem || "—"}</td>
                    <td style={{ padding: "6px" }}>{s.revogado ? "Sim" : "Não"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h4 style={{ margin: "0 0 8px", fontSize: "13px", color: colors.textPrimary }}>Logs de Autenticação</h4>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", color: colors.textPrimary }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${colors.borderSubtle}`, textAlign: "left", color: colors.onSurfaceVariant }}>
                  <th style={{ padding: "6px" }}>Identificador</th>
                  <th style={{ padding: "6px" }}>Sucesso</th>
                  <th style={{ padding: "6px" }}>IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id_log} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                    <td style={{ padding: "6px" }}>{l.email_informado || l.identificador_informado || "—"}</td>
                    <td style={{ padding: "6px" }}>{l.sucesso ? "✅" : `❌ ${l.motivo_falha || ""}`}</td>
                    <td style={{ padding: "6px" }}>{l.ip_origem || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

