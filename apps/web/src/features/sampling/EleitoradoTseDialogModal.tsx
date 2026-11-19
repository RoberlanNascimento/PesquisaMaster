import React, { useEffect, useMemo, useState } from "react";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";
import { useUiSessionStore } from "../../lib/store";
import {
  INITIAL_SYNC_OVERLAY,
  TseIbgeSyncOverlay,
  type SyncOverlayState,
} from "./TseIbgeSyncOverlay";

const { colors } = NOCTURNE_TOKENS;

const FIELD_INPUT: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 10px",
  borderRadius: "9px",
  border: `1px solid ${colors.borderSubtle}`,
  backgroundColor: colors.surfaceContainer,
  color: colors.textPrimary,
  fontSize: "12px",
};

const FIELD_LABEL: React.CSSProperties = {
  display: "block",
  fontSize: "11px",
  fontWeight: 600,
  color: colors.onSurfaceVariant,
  marginBottom: "4px",
};

const SECTION_BOX: React.CSSProperties = {
  border: `1px solid ${colors.borderSubtle}`,
  borderRadius: "12px",
  padding: "12px 14px",
  backgroundColor: "rgba(255, 255, 255, 0.02)",
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const SECTION_TITLE: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "#81c995",
};

export interface EleitoradoTseFormPayload {
  readonly id_municipio: number;
  readonly id_bairro: number | null;
  readonly ano_referencia: number;
  readonly mes_referencia: number;
  readonly zona_eleitoral: string | null;
  readonly secao_eleitoral: string | null;
  readonly quantidade_eleitores: number;
  readonly eleitores_biometria: number;
  readonly populacao_ibge: number | null;
  readonly ano_censo_ibge: number | null;
  readonly tipo_captura: string;
  readonly fonte_endpoint: string | null;
  readonly id_usuario_captura: number | null;
  readonly hash_origem: string | null;
}

export function EleitoradoTseDialogModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  onRefreshOpcoes,
  municipios,
  bairros,
  usuarios,
  eleitoradosTse = [],
  initialRecord = null,
  defaultMunicipioId,
}: {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSave: (payload: EleitoradoTseFormPayload, editingId: number | null) => Promise<void>;
  readonly onDelete: (idEleitoradoTse: number) => Promise<void>;
  readonly onRefreshOpcoes: () => Promise<void>;
  readonly municipios: readonly any[];
  readonly bairros: readonly any[];
  readonly usuarios: readonly any[];
  readonly eleitoradosTse?: readonly any[];
  readonly initialRecord?: any | null;
  readonly defaultMunicipioId: string;
}): React.JSX.Element | null {
  const currentUser = useUiSessionStore((state) => state.currentUser);
  const now = new Date();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [idMunicipio, setIdMunicipio] = useState("");
  const [idBairro, setIdBairro] = useState("");
  const [anoReferencia, setAnoReferencia] = useState(String(now.getFullYear()));
  const [mesReferencia, setMesReferencia] = useState(String(now.getMonth() + 1));
  const [zonaEleitoral, setZonaEleitoral] = useState("");
  const [secaoEleitoral, setSecaoEleitoral] = useState("");
  const [quantidadeEleitores, setQuantidadeEleitores] = useState("0");
  const [eleitoresBiometria, setEleitoresBiometria] = useState("0");
  const [populacaoIbge, setPopulacaoIbge] = useState("");
  const [anoCensoIbge, setAnoCensoIbge] = useState("2022");
  const [tipoCaptura, setTipoCaptura] = useState("manual");
  const [fonteEndpoint, setFonteEndpoint] = useState("");
  const [idUsuarioCaptura, setIdUsuarioCaptura] = useState("");
  const [dataCaptura, setDataCaptura] = useState("");
  const [hashOrigem, setHashOrigem] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [acquiring, setAcquiring] = useState(false);
  const [syncOverlay, setSyncOverlay] = useState<SyncOverlayState>(INITIAL_SYNC_OVERLAY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const findNewestForMunicipio = (munId: string): any | null => {
    if (!munId) return null;
    const matches = [...eleitoradosTse]
      .filter((e) => String(e.id_municipio) === munId)
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
    return matches[0] ?? null;
  };

  const populateFromRecord = (rec: any): void => {
    setEditingId(rec.id_eleitorado_tse ?? null);
    setIdMunicipio(String(rec.id_municipio ?? ""));
    setIdBairro(rec.id_bairro ? String(rec.id_bairro) : "");
    setAnoReferencia(String(rec.ano_referencia ?? new Date().getFullYear()));
    setMesReferencia(String(rec.mes_referencia ?? 1));
    setZonaEleitoral(rec.zona_eleitoral ?? "");
    setSecaoEleitoral(rec.secao_eleitoral ?? "");
    setQuantidadeEleitores(String(rec.quantidade_eleitores ?? 0));
    setEleitoresBiometria(String(rec.eleitores_biometria ?? 0));
    setPopulacaoIbge(rec.populacao_ibge != null ? String(rec.populacao_ibge) : "");
    setAnoCensoIbge(rec.ano_censo_ibge != null ? String(rec.ano_censo_ibge) : "");
    setTipoCaptura(rec.tipo_captura ?? "manual");
    setFonteEndpoint(rec.fonte_endpoint ?? "");
    setIdUsuarioCaptura(rec.id_usuario_captura ? String(rec.id_usuario_captura) : "");
    setDataCaptura(rec.data_captura ? new Date(rec.data_captura).toLocaleString("pt-BR") : "");
    setHashOrigem(rec.hash_origem ?? "");
    setErrorMsg("");
  };

  const resetForm = (munOverride?: string): void => {
    const munId = munOverride ?? defaultMunicipioId ?? (municipios[0] ? String(municipios[0].id_municipio) : "");
    setEditingId(null);
    setIdMunicipio(munId || (municipios[0] ? String(municipios[0].id_municipio) : ""));
    setIdBairro("");
    setAnoReferencia(String(new Date().getFullYear()));
    setMesReferencia(String(new Date().getMonth() + 1));
    setZonaEleitoral("");
    setSecaoEleitoral("");
    setQuantidadeEleitores("0");
    setEleitoresBiometria("0");
    setPopulacaoIbge("");
    setAnoCensoIbge("2022");
    setTipoCaptura("manual");
    setFonteEndpoint("");
    setIdUsuarioCaptura(usuarios[0] ? String(usuarios[0].id_usuario) : "");
    setDataCaptura("");
    setHashOrigem("");
    setErrorMsg("");
  };

  useEffect(() => {
    if (!isOpen) return;
    setSuccessMsg("");
    if (initialRecord) {
      populateFromRecord(initialRecord);
      return;
    }
    const munId = defaultMunicipioId || (municipios[0] ? String(municipios[0].id_municipio) : "");
    const latest = findNewestForMunicipio(munId);
    if (latest) {
      populateFromRecord(latest);
    } else {
      resetForm(munId);
    }
  }, [isOpen, initialRecord, defaultMunicipioId, municipios]);

  const bairrosDoMunicipio = useMemo(
    () => bairros.filter((b) => String(b.id_municipio) === idMunicipio),
    [bairros, idMunicipio]
  );

  if (!isOpen) return null;

  const handleAcquireTseIbge = async (): Promise<void> => {
    if (!idMunicipio) return;
    setAcquiring(true);
    setErrorMsg("");
    setSuccessMsg("Consultando servidores oficiais do TSE e IBGE...");
    setSyncOverlay({
      status: "loading",
      title: "Consultando TSE e IBGE...",
      message: "Baixando e conferindo os dados oficiais de eleitorado (TSE) e população estimada (IBGE). Aguarde...",
    });
    try {
      const numericUserId = currentUser?.id && /^\d+$/.test(currentUser.id) ? Number(currentUser.id) : null;
      const res = await fetch(`http://127.0.0.1:8000/api/v1/integracoes/conferir-municipio/${idMunicipio}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_usuario: numericUserId,
          email_usuario: currentUser?.email ?? null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const detail = err?.detail || "Não foi possível adquirir os dados nos servidores do TSE/IBGE.";
        setSuccessMsg("");
        setErrorMsg(detail);
        setSyncOverlay({
          status: "error",
          title: "Erro na aquisição TSE / IBGE",
          message: detail,
        });
        return;
      }
      const d = await res.json();
      setAnoReferencia(String(d.ano_referencia_tse ?? new Date().getFullYear()));
      setMesReferencia(String(d.mes_referencia_tse ?? new Date().getMonth() + 1));
      setQuantidadeEleitores(String(d.eleitorado_tse_oficial ?? 0));
      setEleitoresBiometria(String(d.eleitores_biometria ?? 0));
      setPopulacaoIbge(d.populacao_ibge_oficial != null ? String(d.populacao_ibge_oficial) : "");
      setTipoCaptura("automatica");
      setFonteEndpoint("https://dadosabertos.tse.jus.br | https://servicodados.ibge.gov.br");
      setHashOrigem(d.hash_auditoria_sha256 ?? "");
      setDataCaptura(new Date().toLocaleString("pt-BR"));
      if (d.id_usuario_captura) {
        setIdUsuarioCaptura(String(d.id_usuario_captura));
      }
      if (d.id_eleitorado_tse_gravado) {
        setEditingId(Number(d.id_eleitorado_tse_gravado));
      }
      await onRefreshOpcoes();
      const summary = `Dados adquiridos e gravados (#${d.id_eleitorado_tse_gravado}): TSE ${Number(d.eleitorado_tse_oficial).toLocaleString("pt-BR")} eleitores (Biometria: ${Number(d.eleitores_biometria).toLocaleString("pt-BR")}) | IBGE ${Number(d.populacao_ibge_oficial).toLocaleString("pt-BR")} hab.`;
      setSuccessMsg(summary);
      setSyncOverlay({
        status: "success",
        title: "Dados TSE / IBGE adquiridos com sucesso!",
        message: summary,
      });
    } catch {
      const msg = "Erro ao conectar com os servidores do TSE/IBGE.";
      setSuccessMsg("");
      setErrorMsg(msg);
      setSyncOverlay({
        status: "error",
        title: "Falha de conexão TSE / IBGE",
        message: msg,
      });
    } finally {
      setAcquiring(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!idMunicipio) return;
    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await onSave(
        {
          id_municipio: Number(idMunicipio),
          id_bairro: idBairro ? Number(idBairro) : null,
          ano_referencia: Number(anoReferencia),
          mes_referencia: Number(mesReferencia),
          zona_eleitoral: zonaEleitoral.trim() || null,
          secao_eleitoral: secaoEleitoral.trim() || null,
          quantidade_eleitores: Number(quantidadeEleitores) || 0,
          eleitores_biometria: Number(eleitoresBiometria) || 0,
          populacao_ibge: populacaoIbge ? Number(populacaoIbge) : null,
          ano_censo_ibge: anoCensoIbge ? Number(anoCensoIbge) : null,
          tipo_captura: tipoCaptura,
          fonte_endpoint: fonteEndpoint.trim() || null,
          id_usuario_captura: idUsuarioCaptura ? Number(idUsuarioCaptura) : null,
          hash_origem: hashOrigem.trim() || null,
        },
        editingId
      );
      setSuccessMsg(editingId ? `Registro #${editingId} atualizado com sucesso.` : "Registro cadastrado na tabela eleitorado_tse.");
      resetForm(idMunicipio);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao salvar registro de eleitorado TSE.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = async (): Promise<void> => {
    if (!editingId) return;
    if (!window.confirm(`Deseja realmente excluir o registro #${editingId} da tabela eleitorado_tse?`)) return;
    setDeleting(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await onDelete(editingId);
      setSuccessMsg(`Registro #${editingId} excluído.`);
      resetForm(idMunicipio);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao excluir registro.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cadastro Eleitorado TSE"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "820px",
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
            {editingId ? `Cadastro Eleitorado TSE — Editando #${editingId}` : "Cadastro Eleitorado TSE / IBGE"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: colors.onSurfaceVariant, fontSize: "16px", cursor: "pointer" }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* LOCALIZAÇÃO */}
          <div style={SECTION_BOX}>
            <div style={SECTION_TITLE}>1. Localização Eleitoral</div>
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1.4fr 0.8fr 0.8fr", gap: "10px" }}>
              <div>
                <label style={FIELD_LABEL}>Município (id_municipio) *</label>
                <select
                  style={FIELD_INPUT}
                  value={idMunicipio}
                  onChange={(e) => {
                    const val = e.target.value;
                    const latest = findNewestForMunicipio(val);
                    if (latest) {
                      populateFromRecord(latest);
                    } else {
                      resetForm(val);
                    }
                  }}
                  required
                >
                  {municipios.map((m) => (
                    <option key={m.id_municipio} value={m.id_municipio}>
                      {m.nome} / {m.uf}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={FIELD_LABEL}>Bairro (id_bairro)</label>
                <select
                  style={FIELD_INPUT}
                  value={idBairro}
                  onChange={(e) => setIdBairro(e.target.value)}
                >
                  <option value="">— Município inteiro (NULL) —</option>
                  {bairrosDoMunicipio.map((b) => (
                    <option key={b.id_bairro} value={b.id_bairro}>
                      {b.nome_bairro}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={FIELD_LABEL}>Zona Eleitoral</label>
                <input
                  style={FIELD_INPUT}
                  maxLength={10}
                  placeholder="Ex: 0023"
                  value={zonaEleitoral}
                  onChange={(e) => setZonaEleitoral(e.target.value)}
                />
              </div>
              <div>
                <label style={FIELD_LABEL}>Seção Eleitoral</label>
                <input
                  style={FIELD_INPUT}
                  maxLength={10}
                  placeholder="Ex: 0145"
                  value={secaoEleitoral}
                  onChange={(e) => setSecaoEleitoral(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* REFERÊNCIA & QUANTITATIVOS */}
          <div style={SECTION_BOX}>
            <div style={{ ...SECTION_TITLE, color: "#8ab4f8" }}>2. Referência & Quantitativos (TSE / IBGE)</div>
            <div style={{ display: "grid", gridTemplateColumns: "0.8fr 0.8fr 1.2fr 1.2fr 1.2fr 0.9fr", gap: "10px" }}>
              <div>
                <label style={FIELD_LABEL}>Ano Ref. *</label>
                <input
                  style={FIELD_INPUT}
                  type="number"
                  min="1990"
                  max="2100"
                  value={anoReferencia}
                  onChange={(e) => setAnoReferencia(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={FIELD_LABEL}>Mês Ref. *</label>
                <select
                  style={FIELD_INPUT}
                  value={mesReferencia}
                  onChange={(e) => setMesReferencia(e.target.value)}
                  required
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {String(m).padStart(2, "0")}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={FIELD_LABEL}>Qtd. Eleitores *</label>
                <input
                  style={FIELD_INPUT}
                  type="number"
                  min="0"
                  value={quantidadeEleitores}
                  onChange={(e) => setQuantidadeEleitores(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={FIELD_LABEL}>Eleit. Biometria *</label>
                <input
                  style={FIELD_INPUT}
                  type="number"
                  min="0"
                  value={eleitoresBiometria}
                  onChange={(e) => setEleitoresBiometria(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={FIELD_LABEL}>População IBGE</label>
                <input
                  style={FIELD_INPUT}
                  type="number"
                  min="0"
                  placeholder="Opcional"
                  value={populacaoIbge}
                  onChange={(e) => setPopulacaoIbge(e.target.value)}
                />
              </div>
              <div>
                <label style={FIELD_LABEL}>Ano Censo IBGE</label>
                <input
                  style={FIELD_INPUT}
                  type="number"
                  min="1990"
                  max="2100"
                  placeholder="2022"
                  value={anoCensoIbge}
                  onChange={(e) => setAnoCensoIbge(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* AUDITORIA & CAPTURA */}
          <div style={SECTION_BOX}>
            <div style={{ ...SECTION_TITLE, color: "#fbbc04" }}>3. Auditoria & Captura</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr 1.8fr", gap: "10px" }}>
              <div>
                <label style={FIELD_LABEL}>Tipo Captura *</label>
                <select
                  style={FIELD_INPUT}
                  value={tipoCaptura}
                  onChange={(e) => setTipoCaptura(e.target.value)}
                  required
                >
                  <option value="manual">manual</option>
                  <option value="automatica">automatica</option>
                </select>
              </div>
              <div>
                <label style={FIELD_LABEL}>
                  Usuário Captura {tipoCaptura === "manual" ? "*" : "(opcional)"}
                </label>
                <select
                  style={FIELD_INPUT}
                  value={idUsuarioCaptura}
                  onChange={(e) => setIdUsuarioCaptura(e.target.value)}
                  required={tipoCaptura === "manual"}
                >
                  <option value="">— Nenhum —</option>
                  {usuarios.map((u) => (
                    <option key={u.id_usuario} value={u.id_usuario}>
                      #{u.id_usuario} — {u.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={FIELD_LABEL}>
                  Fonte / Endpoint {tipoCaptura === "automatica" ? "*" : "(opcional)"}
                </label>
                <input
                  style={FIELD_INPUT}
                  maxLength={255}
                  placeholder="https://dadosabertos.tse.jus.br/..."
                  value={fonteEndpoint}
                  onChange={(e) => setFonteEndpoint(e.target.value)}
                  required={tipoCaptura === "automatica"}
                />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "10px" }}>
              <div>
                <label style={FIELD_LABEL}>Hash de Origem (SHA-256 — gerado automaticamente se vazio)</label>
                <input
                  style={FIELD_INPUT}
                  maxLength={64}
                  placeholder="Automático (SHA-256)"
                  value={hashOrigem}
                  onChange={(e) => setHashOrigem(e.target.value)}
                />
              </div>
              <div>
                <label style={FIELD_LABEL}>Data de Captura (data_captura)</label>
                <input
                  style={{ ...FIELD_INPUT, color: colors.onSurfaceVariant }}
                  type="text"
                  readOnly
                  value={dataCaptura || "Automática (CURRENT_TIMESTAMP)"}
                />
              </div>
            </div>
          </div>

          {errorMsg && (
            <div style={{ fontSize: "12px", color: "#f28b82", padding: "8px 10px", borderRadius: "8px", backgroundColor: "rgba(242, 139, 130, 0.12)" }}>
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div style={{ fontSize: "12px", color: "#81c995", padding: "8px 10px", borderRadius: "8px", backgroundColor: "rgba(129, 201, 149, 0.12)" }}>
              {successMsg}
            </div>
          )}

          {/* BOTÕES DO FORMULÁRIO */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", paddingTop: "8px", borderTop: `1px solid ${colors.borderSubtle}` }}>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={acquiring || !idMunicipio}
                onClick={() => void handleAcquireTseIbge()}
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: "#8ab4f8",
                  color: "#003061",
                  fontWeight: 700,
                  fontSize: "12px",
                  cursor: acquiring ? "wait" : "pointer",
                }}
              >
                {acquiring ? "Adquirindo..." : "Adquirir Dados TSE/IBGE"}
              </button>
              <button
                type="button"
                onClick={() => resetForm(idMunicipio)}
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: `1px solid ${colors.borderSubtle}`,
                  backgroundColor: colors.surfaceContainer,
                  color: colors.textPrimary,
                  fontWeight: 600,
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                + Novo Registro
              </button>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                disabled={!editingId || deleting}
                onClick={() => void handleDeleteClick()}
                style={{
                  padding: "8px 14px",
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
                  padding: "8px 18px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: "#81c995",
                  color: "#00391b",
                  fontWeight: 700,
                  fontSize: "12px",
                  cursor: saving ? "wait" : "pointer",
                }}
              >
                {saving ? "Salvando..." : editingId ? "Atualizar" : "Salvar"}
              </button>
            </div>
          </div>
        </form>
      </div>
      <TseIbgeSyncOverlay
        state={syncOverlay}
        onClose={() => setSyncOverlay(INITIAL_SYNC_OVERLAY)}
      />
    </div>
  );
}
