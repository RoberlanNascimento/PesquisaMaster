import React, { useEffect, useRef, useState } from "react";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";
import { useUiSessionStore } from "../../lib/store";
import { SearchableCombobox } from "../../components/ui/SearchableCombobox";
import { formatIntegerPtBr, parseIntegerDigits } from "../../lib/numberFormat";
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
  onRefreshOpcoes: _onRefreshOpcoes,
  municipios,
  bairros: _bairros,
  usuarios,
  eleitoradosTse: _eleitoradosTse = [],
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
  const [selectedUf, setSelectedUf] = useState("");
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

  const populateFromRecord = (rec: any): void => {
    const munIdStr = String(rec.id_municipio ?? "");
    const munObj = municipios.find((m) => String(m.id_municipio) === munIdStr);
    setEditingId(rec.id_eleitorado_tse ?? null);
    setSelectedUf(munObj?.uf ? String(munObj.uf) : String(rec.uf ?? ""));
    setIdMunicipio(munIdStr);
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
    const resolvedMunId = munId || (municipios[0] ? String(municipios[0].id_municipio) : "");
    const munObj = municipios.find((m) => String(m.id_municipio) === resolvedMunId);
    setEditingId(null);
    setSelectedUf(munObj?.uf ? String(munObj.uf) : "");
    setIdMunicipio(resolvedMunId);
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

  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false;
      return;
    }
    if (wasOpenRef.current) return;
    wasOpenRef.current = true;
    setSuccessMsg("");
    if (initialRecord) {
      populateFromRecord(initialRecord);
      return;
    }
    const munId = defaultMunicipioId || (municipios[0] ? String(municipios[0].id_municipio) : "");
    resetForm(munId);
  }, [isOpen, initialRecord, defaultMunicipioId]);

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
          persistir: false,
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
      setAnoCensoIbge(String(d.ano_censo_ibge ?? d.ano_referencia_tse ?? new Date().getFullYear()));
      setTipoCaptura("automatica");
      setFonteEndpoint("https://dadosabertos.tse.jus.br | https://servicodados.ibge.gov.br");
      setHashOrigem(d.hash_auditoria_sha256 ?? "");
      setDataCaptura(new Date().toLocaleString("pt-BR"));
      if (d.id_usuario_captura) {
        setIdUsuarioCaptura(String(d.id_usuario_captura));
      }
      const summary = `Dados adquiridos (não salvos ainda): TSE ${Number(d.eleitorado_tse_oficial).toLocaleString("pt-BR")} eleitores (Biometria: ${Number(d.eleitores_biometria).toLocaleString("pt-BR")}) | IBGE ${Number(d.populacao_ibge_oficial).toLocaleString("pt-BR")} hab. Clique em Salvar para gravar no banco.`;
      setSuccessMsg(summary);
      setSyncOverlay({
        status: "success",
        title: "Dados TSE / IBGE carregados!",
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "10px" }}>
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
                      setIdMunicipio(String(firstMun.id_municipio));
                      setIdBairro("");
                    }
                  }}
                />
              </div>
              <div>
                <label style={FIELD_LABEL}>Município</label>
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
                  onChange={(val) => {
                    const munObj = municipios.find((m) => String(m.id_municipio) === val);
                    if (munObj?.uf) setSelectedUf(String(munObj.uf));
                    setIdMunicipio(val);
                    setIdBairro("");
                  }}
                />
              </div>
            </div>
          </div>

          {/* REFERÊNCIA & QUANTITATIVOS */}
          <div style={SECTION_BOX}>
            <div style={{ ...SECTION_TITLE, color: "#8ab4f8" }}>2. Referência & Quantitativos (TSE / IBGE)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.2fr 0.9fr", gap: "10px" }}>
              <div>
                <label style={FIELD_LABEL}>Qtd. Eleitores *</label>
                <input
                  style={
                    tipoCaptura === "automatica"
                      ? { ...FIELD_INPUT, opacity: 0.65, cursor: "not-allowed" }
                      : FIELD_INPUT
                  }
                  type="text"
                  inputMode="numeric"
                  value={formatIntegerPtBr(quantidadeEleitores)}
                  onChange={(e) => setQuantidadeEleitores(parseIntegerDigits(e.target.value))}
                  readOnly={tipoCaptura === "automatica"}
                  required
                />
              </div>
              <div>
                <label style={FIELD_LABEL}>População IBGE</label>
                <input
                  style={
                    tipoCaptura === "automatica"
                      ? { ...FIELD_INPUT, opacity: 0.65, cursor: "not-allowed" }
                      : FIELD_INPUT
                  }
                  type="text"
                  inputMode="numeric"
                  placeholder="Opcional"
                  value={formatIntegerPtBr(populacaoIbge)}
                  onChange={(e) => setPopulacaoIbge(parseIntegerDigits(e.target.value))}
                  readOnly={tipoCaptura === "automatica"}
                />
              </div>
              <div>
                <label style={FIELD_LABEL}>Ano Censo IBGE</label>
                <input
                  style={
                    tipoCaptura === "automatica"
                      ? { ...FIELD_INPUT, opacity: 0.65, cursor: "not-allowed" }
                      : FIELD_INPUT
                  }
                  type="number"
                  min="1990"
                  max="2100"
                  placeholder="2022"
                  value={anoCensoIbge}
                  onChange={(e) => setAnoCensoIbge(e.target.value)}
                  readOnly={tipoCaptura === "automatica"}
                />
              </div>
            </div>
          </div>

          {/* AUDITORIA & CAPTURA */}
          <div style={SECTION_BOX}>
            <div style={{ ...SECTION_TITLE, color: "#fbbc04" }}>3. Auditoria & Captura</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "10px" }}>
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
                <label style={FIELD_LABEL}>Hash de Origem</label>
                <input
                  style={{ ...FIELD_INPUT, opacity: 0.65, cursor: "not-allowed", color: colors.onSurfaceVariant }}
                  maxLength={64}
                  placeholder="Automático (SHA-256)"
                  readOnly
                  value={hashOrigem}
                />
              </div>
              <div>
                <label style={FIELD_LABEL}>Data de Aquisição</label>
                <input
                  style={{ ...FIELD_INPUT, opacity: 0.65, cursor: "not-allowed", color: colors.onSurfaceVariant }}
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
