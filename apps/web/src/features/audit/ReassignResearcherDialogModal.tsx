import React, { useEffect, useMemo, useState } from "react";
import { SearchableCombobox, type ComboboxOption } from "../../components/ui/SearchableCombobox";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";
import { useUiSessionStore } from "../../lib/store";

const { colors } = NOCTURNE_TOKENS;

const FIELD_INPUT: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 11px",
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
  marginBottom: "5px",
};

export interface MovimentacaoPayload {
  readonly id_questionario_pessoa: number;
  readonly id_pesquisador_novo: number;
  readonly id_usuario_autorizador: number | null;
  readonly email_usuario: string | null;
  readonly motivo: string;
}

export function ReassignResearcherDialogModal({
  isOpen,
  onClose,
  onSubmit,
  municipiosAtivos,
  pesquisasAtivas,
  sessoes,
  profissionais,
  usuarios,
}: {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (payload: MovimentacaoPayload) => Promise<void>;
  readonly municipiosAtivos: readonly any[];
  readonly pesquisasAtivas: readonly any[];
  readonly sessoes: readonly any[];
  readonly profissionais: readonly any[];
  readonly usuarios: readonly any[];
}): React.JSX.Element | null {
  const currentUser = useUiSessionStore((state) => state.currentUser);
  const [selectedMunicipioId, setSelectedMunicipioId] = useState("");
  const [selectedPesquisaId, setSelectedPesquisaId] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [currentResearcherId, setCurrentResearcherId] = useState("");
  const [newResearcherId, setNewResearcherId] = useState("");
  const [authorizerId, setAuthorizerId] = useState("");
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Pesquisas ativas filtradas estritamente pelo município escolhido
  const pesquisasDoMunicipio = useMemo(() => {
    if (!selectedMunicipioId) return [];
    return pesquisasAtivas.filter((p) => String(p.id_municipio) === selectedMunicipioId);
  }, [pesquisasAtivas, selectedMunicipioId]);

  // Sessões filtradas pela pesquisa ativa selecionada
  const sessoesDaPesquisa = useMemo(() => {
    if (!selectedPesquisaId) return [];
    return sessoes.filter((s) => String(s.id_pesquisa) === selectedPesquisaId);
  }, [sessoes, selectedPesquisaId]);

  const selectedSession = useMemo(
    () => sessoesDaPesquisa.find((s) => String(s.id_questionario_pessoa) === selectedSessionId) ?? null,
    [sessoesDaPesquisa, selectedSessionId]
  );

  // Apenas profissionais do tipo pesquisador_campo
  const pesquisadoresCampo = useMemo(
    () => profissionais.filter((p) => String(p.tipo_profissional || "").toLowerCase() === "pesquisador_campo"),
    [profissionais]
  );

  const currentResearcherOptions = useMemo<ComboboxOption[]>(
    () =>
      pesquisadoresCampo.map((p) => ({
        value: String(p.id_profissional),
        label: String(p.nome ?? ""),
        sublabel: p.especialidade ? String(p.especialidade) : undefined,
      })),
    [pesquisadoresCampo]
  );

  const availableNewResearchers = useMemo(() => {
    const excludeId = currentResearcherId ? Number(currentResearcherId) : selectedSession ? Number(selectedSession.id_pesquisador) : null;
    if (!excludeId) return pesquisadoresCampo;
    return pesquisadoresCampo.filter((p) => Number(p.id_profissional) !== excludeId);
  }, [pesquisadoresCampo, currentResearcherId, selectedSession]);

  const newResearcherOptions = useMemo<ComboboxOption[]>(
    () =>
      availableNewResearchers.map((p) => ({
        value: String(p.id_profissional),
        label: String(p.nome ?? ""),
        sublabel: p.especialidade ? String(p.especialidade) : undefined,
      })),
    [availableNewResearchers]
  );

  const syncSelectionForPesquisa = (pesquisaId: string): void => {
    setSelectedPesquisaId(pesquisaId);
    const matchingSessions = sessoes.filter((s) => String(s.id_pesquisa) === pesquisaId);
    const firstSession = matchingSessions[0] ?? null;
    setSelectedSessionId(firstSession ? String(firstSession.id_questionario_pessoa) : "");
    if (firstSession) {
      setCurrentResearcherId(String(firstSession.id_pesquisador));
      const otherProf = pesquisadoresCampo.find(
        (p) => Number(p.id_profissional) !== Number(firstSession.id_pesquisador)
      );
      setNewResearcherId(otherProf ? String(otherProf.id_profissional) : "");
    } else {
      setCurrentResearcherId("");
      setNewResearcherId("");
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg("");
    setMotivo("");

    // Prioriza município que já possua sessões, ou o primeiro município com pesquisa em andamento
    const firstMun =
      municipiosAtivos.find((m) => sessoes.some((s) => Number(s.id_municipio) === Number(m.id_municipio))) ??
      municipiosAtivos[0] ??
      null;
    const munId = firstMun ? String(firstMun.id_municipio) : "";
    setSelectedMunicipioId(munId);

    const matchingPesquisas = pesquisasAtivas.filter((p) => String(p.id_municipio) === munId);
    const firstPesquisa = matchingPesquisas[0] ?? null;
    syncSelectionForPesquisa(firstPesquisa ? String(firstPesquisa.id_pesquisa) : "");

    const matchedUser = currentUser?.email
      ? usuarios.find((u) => String(u.email || "").toLowerCase() === currentUser.email.toLowerCase())
      : null;
    setAuthorizerId(
      matchedUser ? String(matchedUser.id_usuario) : usuarios[0] ? String(usuarios[0].id_usuario) : ""
    );
  }, [isOpen, municipiosAtivos, pesquisasAtivas, sessoes, profissionais, usuarios, currentUser]);

  if (!isOpen) return null;

  const handleMunicipioChange = (munId: string): void => {
    setSelectedMunicipioId(munId);
    const matchingPesquisas = pesquisasAtivas.filter((p) => String(p.id_municipio) === munId);
    const firstPesquisa = matchingPesquisas[0] ?? null;
    syncSelectionForPesquisa(firstPesquisa ? String(firstPesquisa.id_pesquisa) : "");
  };

  const handlePesquisaChange = (pesquisaId: string): void => {
    syncSelectionForPesquisa(pesquisaId);
  };

  const handleSessionChange = (val: string): void => {
    setSelectedSessionId(val);
    const sess = sessoesDaPesquisa.find((s) => String(s.id_questionario_pessoa) === val);
    if (sess) {
      setCurrentResearcherId(String(sess.id_pesquisador));
      const stillValid = pesquisadoresCampo.some(
        (p) =>
          String(p.id_profissional) === newResearcherId &&
          Number(p.id_profissional) !== Number(sess.id_pesquisador)
      );
      if (!stillValid) {
        const nextProf = pesquisadoresCampo.find((p) => Number(p.id_profissional) !== Number(sess.id_pesquisador));
        setNewResearcherId(nextProf ? String(nextProf.id_profissional) : "");
      }
    }
  };

  const handleCurrentResearcherChange = (researcherId: string): void => {
    setCurrentResearcherId(researcherId);
    const matchingSession = sessoesDaPesquisa.find((s) => String(s.id_pesquisador) === researcherId);
    if (matchingSession) {
      setSelectedSessionId(String(matchingSession.id_questionario_pessoa));
    }
    if (newResearcherId === researcherId) {
      const nextProf = pesquisadoresCampo.find((p) => String(p.id_profissional) !== researcherId);
      setNewResearcherId(nextProf ? String(nextProf.id_profissional) : "");
    }
  };

  const handleFormSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!selectedSessionId || !newResearcherId || !motivo.trim()) return;
    setSaving(true);
    setErrorMsg("");
    try {
      await onSubmit({
        id_questionario_pessoa: Number(selectedSessionId),
        id_pesquisador_novo: Number(newResearcherId),
        id_usuario_autorizador: authorizerId ? Number(authorizerId) : null,
        email_usuario: currentUser?.email ?? null,
        motivo: motivo.trim(),
      });
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao registrar movimentação de pesquisador.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Movimentação de Pesquisadores"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "rgba(0, 0, 0, 0.74)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "600px",
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
          <h3 style={{ margin: 0, fontSize: "16px" }}>Movimentação de Pesquisadores</h3>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: colors.onSurfaceVariant, fontSize: "16px", cursor: "pointer" }}
          >
            ✕
          </button>
        </div>
        <p style={{ margin: "0 0 16px", fontSize: "12px", color: colors.onSurfaceVariant }}>
          Selecione o município com pesquisas em andamento, a pesquisa ativa e a sessão de entrevista para transferir a custódia com auditoria.
        </p>

        <form onSubmit={handleFormSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "10px" }}>
            <div>
              <label style={FIELD_LABEL}>Município</label>
              <select
                style={FIELD_INPUT}
                value={selectedMunicipioId}
                onChange={(e) => handleMunicipioChange(e.target.value)}
                required
              >
                {municipiosAtivos.length === 0 && (
                  <option value="">Nenhum município com pesquisa ativa</option>
                )}
                {municipiosAtivos.map((m) => (
                  <option key={m.id_municipio} value={m.id_municipio}>
                    {m.nome} / {m.uf}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={FIELD_LABEL}>Pesquisa em andamento</label>
              <select
                style={FIELD_INPUT}
                value={selectedPesquisaId}
                onChange={(e) => handlePesquisaChange(e.target.value)}
                required
              >
                {pesquisasDoMunicipio.length === 0 && (
                  <option value="">Nenhuma pesquisa ativa neste município</option>
                )}
                {pesquisasDoMunicipio.map((p) => (
                  <option key={p.id_pesquisa} value={p.id_pesquisa}>
                    #{p.id_pesquisa} — {p.nome} [{p.status}]
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={FIELD_LABEL}>Sessão de Entrevista (Questionários)</label>
            <select
              style={FIELD_INPUT}
              value={selectedSessionId}
              onChange={(e) => handleSessionChange(e.target.value)}
              required
            >
              {sessoesDaPesquisa.length === 0 && (
                <option value="">Nenhuma sessão de entrevista registrada nesta pesquisa</option>
              )}
              {sessoesDaPesquisa.map((s) => (
                <option key={s.id_questionario_pessoa} value={s.id_questionario_pessoa}>
                  #{s.id_questionario_pessoa} • Pesquisador Atual: {s.pesquisador_nome || `#${s.id_pesquisador}`}
                  {s.data_resposta ? ` (${new Date(s.data_resposta).toLocaleString("pt-BR")})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={FIELD_LABEL}>Pesquisador Atual</label>
              <SearchableCombobox
                options={currentResearcherOptions}
                value={currentResearcherId}
                onChange={handleCurrentResearcherChange}
                placeholder="Digite para buscar pesquisador..."
                emptyOptionLabel="Selecione o pesquisador atual..."
                style={{ color: "#f87171", fontWeight: 600 }}
              />
            </div>
            <div>
              <label style={FIELD_LABEL}>Novo Pesquisador *</label>
              <SearchableCombobox
                options={newResearcherOptions}
                value={newResearcherId}
                onChange={setNewResearcherId}
                placeholder="Digite para buscar novo pesquisador..."
                required
              />
            </div>
          </div>

          <div>
            <label style={FIELD_LABEL}>Autorizador</label>
            <select
              style={FIELD_INPUT}
              value={authorizerId}
              onChange={(e) => setAuthorizerId(e.target.value)}
              required
            >
              {usuarios.map((u) => (
                <option key={u.id_usuario} value={u.id_usuario}>
                  #{u.id_usuario} — {u.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={FIELD_LABEL}>Justificativa</label>
            <textarea
              style={{ ...FIELD_INPUT, minHeight: "82px", resize: "vertical", fontFamily: "inherit" }}
              placeholder="Ex: Substituição operacional por término de turno ou redistribuição de setor..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              required
            />
          </div>

          {errorMsg && (
            <div style={{ fontSize: "12px", color: "#f28b82", padding: "8px 10px", borderRadius: "8px", backgroundColor: "rgba(242, 139, 130, 0.12)" }}>
              {errorMsg}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "6px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "9px 16px",
                borderRadius: "8px",
                border: `1px solid ${colors.borderSubtle}`,
                backgroundColor: "transparent",
                color: colors.textPrimary,
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !selectedSessionId || !newResearcherId}
              style={{
                padding: "9px 18px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: "#8ab4f8",
                color: "#003061",
                fontSize: "12px",
                fontWeight: 700,
                cursor: saving ? "wait" : "pointer",
              }}
            >
              {saving ? "Movimentando..." : "Confirmar Movimentação"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
