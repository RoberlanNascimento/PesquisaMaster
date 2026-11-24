import React, { useCallback, useState, useEffect, useMemo } from "react";
import { EnterpriseCrudWorkspace } from "../../components/ui/EnterpriseCrudWorkspace";
import { SearchableCombobox } from "../../components/ui/SearchableCombobox";
import { SlideOverDrawer } from "../../components/ui/SlideOverDrawer";
import { ConfirmDialogModal } from "../../components/ui/ConfirmDialogModal";
import { CandidatePhotoUploader } from "./CandidatePhotoUploader";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";

const { colors } = NOCTURNE_TOKENS;
const API_CANDIDATOS = "http://127.0.0.1:8000/api/v1/questionarios-db/candidatos";
const API_PARTIDOS_TSE = "http://127.0.0.1:8000/api/v1/questionarios-db/partidos-tse";

interface TsePartyRecord {
  readonly sigla: string;
  readonly numero: number;
  readonly nome: string;
}

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 12px",
  borderRadius: "10px",
  border: `1px solid ${colors.borderSubtle}`,
  backgroundColor: colors.surfaceCard,
  color: colors.textPrimary,
  fontSize: "13px",
};

const LABEL_STYLE: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  color: colors.textMuted,
  marginBottom: "5px",
};

export interface CandidateRecord {
  readonly id: number;
  readonly urnName: string;
  readonly fullName: string;
  readonly partyNumber: number | null;
  readonly partyAcronym: string | null;
  readonly roleCategory: string;
  readonly colorHex: string;
  readonly photoUrl: string | null;
  readonly active: boolean;
}

export function CandidatesManagementFeature(): React.JSX.Element {
  const [candidates, setCandidates] = useState<readonly CandidateRecord[]>([]);
  const [tseParties, setTseParties] = useState<readonly TsePartyRecord[]>([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("TODOS");
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [bannerSuccess, setBannerSuccess] = useState<string | null>(null);

  // Modal de cadastro / edição
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<CandidateRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CandidateRecord | null>(null);
  const [urnName, setUrnName] = useState("");
  const [fullName, setFullName] = useState("");
  const [partyNumber, setPartyNumber] = useState("");
  const [partyAcronym, setPartyAcronym] = useState("");
  const [roleCategory, setRoleCategory] = useState("Prefeito");
  const [colorHex, setColorHex] = useState("#3b82f6");
  const [photoUrl, setPhotoUrl] = useState("");
  const [active, setActive] = useState(true);

  const loadCandidates = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch(API_CANDIDATOS, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as any[];
      if (Array.isArray(data)) {
        setCandidates(
          data.map((c) => ({
            id: Number(c.id_candidato_produto),
            urnName: String(c.nome_urna_comercial ?? ""),
            fullName: String(c.nome_completo_razao ?? c.nome_urna_comercial ?? ""),
            partyNumber: c.numero_partido !== null && c.numero_partido !== undefined ? Number(c.numero_partido) : null,
            partyAcronym: c.sigla_partido_marca ? String(c.sigla_partido_marca) : null,
            roleCategory: String(c.cargo_categoria ?? "Prefeito"),
            colorHex: String(c.cor_hex || "#3b82f6"),
            photoUrl: c.foto_url || c.imagem_url || c.url_foto ? String(c.foto_url || c.imagem_url || c.url_foto) : null,
            active: Boolean(c.ativo ?? true),
          }))
        );
      }
    } catch {
      setCandidates([]);
    }
  }, []);

  useEffect(() => {
    void loadCandidates();
  }, [loadCandidates]);

  useEffect(() => {
    fetch(API_PARTIDOS_TSE, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then((rows: unknown) => {
        if (Array.isArray(rows)) {
          setTseParties(
            rows
              .filter(
                (r): r is { sigla: string; numero: number; nome: string } =>
                  Boolean(r && typeof r === "object" && "sigla" in r && "numero" in r)
              )
              .map((r) => ({
                sigla: String(r.sigla),
                numero: Number(r.numero),
                nome: String(r.nome ?? r.sigla),
              }))
          );
        }
      })
      .catch(() => { });
  }, []);

  const notifySuccess = (msg: string): void => {
    setBannerSuccess(msg);
    window.setTimeout(() => setBannerSuccess((prev) => (prev === msg ? null : prev)), 3500);
  };

  const openNewModal = (): void => {
    setEditingCandidate(null);
    setModalError(null);
    setBannerError(null);
    setUrnName("");
    setFullName("");
    setPartyNumber("");
    setPartyAcronym("");
    setRoleCategory("Prefeito");
    setColorHex("#3b82f6");
    setPhotoUrl("");
    setActive(true);
    setDrawerOpen(true);
  };

  const openEditModal = (c: CandidateRecord): void => {
    setEditingCandidate(c);
    setModalError(null);
    setBannerError(null);
    setUrnName(c.urnName);
    setFullName(c.fullName);
    setPartyNumber(c.partyNumber !== null ? String(c.partyNumber) : "");
    setPartyAcronym(c.partyAcronym ?? "");
    setRoleCategory(c.roleCategory || "Prefeito");
    setColorHex(c.colorHex || "#3b82f6");
    setPhotoUrl(c.photoUrl ?? "");
    setActive(c.active);
    setDrawerOpen(true);
  };

  const handleSave = async (): Promise<void> => {
    const trimmedUrn = urnName.trim();
    if (!trimmedUrn) {
      setModalError("Informe o nome de urna ou nome comercial.");
      return;
    }
    setSaving(true);
    setModalError(null);
    setBannerError(null);
    try {
      const parsedNumber = partyNumber.trim() ? Number(partyNumber.trim()) : null;
      const payload = {
        nome_urna_comercial: trimmedUrn,
        nome_completo_razao: fullName.trim() || trimmedUrn,
        numero_partido: parsedNumber !== null && Number.isFinite(parsedNumber) ? parsedNumber : null,
        sigla_partido_marca: partyAcronym.trim() || null,
        cargo_categoria: roleCategory.trim() || "Prefeito",
        cor_hex: colorHex.trim() || "#3b82f6",
        foto_url: photoUrl.trim() || null,
        ativo: active,
      };
      const isEdit = editingCandidate !== null;
      const url = isEdit ? `${API_CANDIDATOS}/${editingCandidate.id}` : API_CANDIDATOS;
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const detail =
          typeof err?.detail === "string"
            ? err.detail
            : Array.isArray(err?.detail)
              ? err.detail.map((d: { msg?: string }) => d?.msg).filter(Boolean).join("; ")
              : null;
        throw new Error(detail || `Erro ao salvar candidato/produto (HTTP ${res.status}).`);
      }
      setDrawerOpen(false);
      setEditingCandidate(null);
      await loadCandidates();
      notifySuccess(isEdit ? "Candidato/produto atualizado com sucesso." : "Candidato/produto cadastrado com sucesso.");
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Erro ao salvar candidato/produto.");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async (): Promise<void> => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    setBannerError(null);
    setModalError(null);
    try {
      const res = await fetch(`${API_CANDIDATOS}/${target.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const detail =
          typeof err?.detail === "string"
            ? err.detail
            : `Erro ao excluir candidato/produto (HTTP ${res.status}).`;
        setBannerError(detail);
        if (drawerOpen) setModalError(detail);
        return;
      }
      if (editingCandidate?.id === target.id) {
        setDrawerOpen(false);
        setEditingCandidate(null);
      }
      await loadCandidates();
      notifySuccess(`"${target.urnName}" excluído com sucesso.`);
    } catch (err) {
      setBannerError(err instanceof Error ? err.message : "Erro ao excluir candidato/produto.");
    }
  };

  const filtered = useMemo(() => {
    return candidates.filter((c) => {
      if (activeTab === "ATIVOS" && !c.active) return false;
      if (activeTab === "INATIVOS" && c.active) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return c.urnName.toLowerCase().includes(q) || c.fullName.toLowerCase().includes(q) || (c.partyAcronym?.toLowerCase().includes(q) ?? false);
      }
      return true;
    });
  }, [candidates, activeTab, search]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {bannerSuccess && (
        <div
          role="status"
          style={{
            padding: "10px 14px",
            borderRadius: "12px",
            backgroundColor: colors.successContainer,
            color: colors.onSuccessContainer,
            border: `1px solid ${colors.successPastel}`,
            fontSize: "13px",
          }}
        >
          {bannerSuccess}
        </div>
      )}
      {bannerError && (
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
          {bannerError}
        </div>
      )}

      <EnterpriseCrudWorkspace<CandidateRecord>
        title="Catálogo de Candidatos & Marcas"
        subtitle="Cadastro oficial de candidatos, partidos, discos de rotação e produtos pesquisados"
        globalActions={
          <button
            type="button"
            onClick={openNewModal}
            style={{
              padding: "9px 16px",
              borderRadius: "10px",
              border: "none",
              backgroundColor: colors.primaryContainer,
              color: colors.onPrimary,
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            + Novo Candidato / Produto
          </button>
        }
        tabs={[
          { id: "TODOS", label: "Todos os Candidatos", count: candidates.length },
          { id: "ATIVOS", label: "Em Disputa Ativa", count: candidates.filter((c) => c.active).length },
          { id: "INATIVOS", label: "Inativos / Indeferidos", count: candidates.filter((c) => !c.active).length },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        kpis={[
          { id: "kpi-cand-total", label: "Candidatos Cadastrados", value: candidates.length, helperText: "Tabela candidatos_produtos", variant: "default" },
          { id: "kpi-cand-parties", label: "Partidos Representados", value: new Set(candidates.map((c) => c.partyAcronym).filter(Boolean)).size, helperText: "TSE", variant: "default" },
          { id: "kpi-cand-discs", label: "Discos Parametrizados", value: "Rotação 360°", helperText: "Anti-viés de ordem", variant: "success" },
        ]}
        searchPlaceholder="Buscar por nome de urna, nome completo ou partido..."
        searchValue={search}
        onSearchChange={setSearch}
        columns={[
          {
            header: "Foto",
            key: "photoUrl",
            width: "64px",
            render: (c) => (
              <CandidatePhotoUploader
                candidateId={c.id}
                name={c.urnName}
                photoUrl={c.photoUrl}
                colorHex={c.colorHex}
                size={40}
                onUploaded={() => {
                  setBannerError(null);
                  void loadCandidates();
                  notifySuccess(`Foto de "${c.urnName}" atualizada no GCS.`);
                }}
                onError={(msg) => setBannerError(msg)}
              />
            ),
          },
          {
            header: "Nome de Urna",
            key: "urnName",
            render: (c) => (
              <button
                type="button"
                onClick={() => openEditModal(c)}
                style={{
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  textAlign: "left",
                  fontWeight: 700,
                  color: "#f8fafc",
                  cursor: "pointer",
                  fontSize: "13px",
                  textDecoration: "underline",
                  textDecorationColor: "rgba(148,163,184,0.35)",
                  textUnderlineOffset: "3px",
                }}
                title="Clique para editar este candidato/produto"
              >
                {c.urnName}
              </button>
            ),
          },
          { header: "Nome Completo", key: "fullName", render: (c) => <span style={{ color: "#94a3b8" }}>{c.fullName}</span> },
          { header: "Partido / Número", key: "partyAcronym", render: (c) => <span style={{ fontWeight: 600, color: c.colorHex }}>{c.partyAcronym ? `${c.partyAcronym}${c.partyNumber !== null ? ` (${c.partyNumber})` : ""}` : "Sem Partido"}</span> },
          { header: "Cargo / Categoria", key: "roleCategory", render: (c) => <span style={{ padding: "2px 8px", borderRadius: "6px", backgroundColor: "#1e293b", fontSize: "11px" }}>{c.roleCategory}</span> },
          { header: "Status", key: "active", render: (c) => <span style={{ color: c.active ? "#4ade80" : "#f87171" }}>{c.active ? "● Ativo" : "○ Inativo"}</span> },
        ]}
        data={filtered}
        keyExtractor={(c) => String(c.id)}
        renderRowActions={(c) => (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openEditModal(c);
              }}
              style={{
                padding: "5px 10px",
                borderRadius: "8px",
                border: `1px solid ${colors.borderSubtle}`,
                backgroundColor: colors.surfaceCard,
                color: colors.textPrimary,
                fontSize: "11.5px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Editar
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTarget(c);
              }}
              style={{
                padding: "5px 10px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: colors.errorContainer,
                color: colors.onErrorContainer,
                fontSize: "11.5px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Excluir
            </button>
          </div>
        )}
      />

      <SlideOverDrawer
        isOpen={drawerOpen}
        onClose={() => {
          if (!saving) {
            setDrawerOpen(false);
            setEditingCandidate(null);
            setModalError(null);
          }
        }}
        title={editingCandidate ? `Editar Candidato / Produto #${editingCandidate.id}` : "Novo Candidato / Produto"}
        width="480px"
        footerActions={
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", width: "100%" }}>
            <div>
              {editingCandidate && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setDeleteTarget(editingCandidate)}
                  style={{
                    padding: "9px 14px",
                    borderRadius: "10px",
                    border: "none",
                    backgroundColor: colors.errorContainer,
                    color: colors.onErrorContainer,
                    fontWeight: 600,
                    fontSize: "12.5px",
                    cursor: saving ? "not-allowed" : "pointer",
                  }}
                >
                  Excluir
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  setEditingCandidate(null);
                  setModalError(null);
                }}
                style={{
                  padding: "9px 14px",
                  borderRadius: "10px",
                  border: `1px solid ${colors.borderSubtle}`,
                  backgroundColor: colors.surfaceCard,
                  color: colors.textPrimary,
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={saving || !urnName.trim()}
                onClick={() => void handleSave()}
                style={{
                  padding: "9px 18px",
                  borderRadius: "10px",
                  border: "none",
                  backgroundColor: colors.primaryContainer,
                  color: colors.onPrimary,
                  fontWeight: 700,
                  cursor: saving || !urnName.trim() ? "not-allowed" : "pointer",
                  opacity: saving || !urnName.trim() ? 0.5 : 1,
                }}
              >
                {saving ? "Salvando..." : editingCandidate ? "Salvar Alterações" : "Salvar"}
              </button>
            </div>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {modalError && (
            <div
              role="alert"
              style={{
                padding: "10px 12px",
                borderRadius: "10px",
                backgroundColor: colors.errorContainer,
                color: colors.onErrorContainer,
                border: `1px solid ${colors.errorPastel}`,
                fontSize: "12.5px",
              }}
            >
              {modalError}
            </div>
          )}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
              padding: "6px 0 4px",
            }}
          >
            <CandidatePhotoUploader
              candidateId={editingCandidate?.id}
              name={urnName || "C"}
              photoUrl={photoUrl.trim() || null}
              colorHex={colorHex}
              size={112}
              onUploaded={(url) => {
                setPhotoUrl(url);
                setModalError(null);
                if (editingCandidate) {
                  void loadCandidates();
                }
                notifySuccess("Foto enviada com sucesso!");
              }}
              onError={(msg) => setModalError(msg)}
            />
          </div>

          <div>
            <label style={LABEL_STYLE}>Nome de Urna / Comercial *</label>
            <input
              style={INPUT_STYLE}
              value={urnName}
              onChange={(e) => {
                setUrnName(e.target.value);
                setModalError(null);
              }}
              placeholder="Ex: Maria Silva ou Produto X"
            />
          </div>

          <div>
            <label style={LABEL_STYLE}>Nome Completo / Razão Social</label>
            <input
              style={INPUT_STYLE}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ex: Maria Aparecida da Silva"
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: "10px" }}>
            <div>
              <label style={LABEL_STYLE}>Partido (TSE) / Marca</label>
              <SearchableCombobox
                value={partyAcronym}
                emptyOptionLabel="Sem Partido"
                placeholder="Pesquisar partido no TSE..."
                options={tseParties.map((p) => ({
                  value: p.sigla,
                  label: `${p.sigla} (${p.numero}) — ${p.nome}`,
                  sublabel: String(p.numero),
                }))}
                onChange={(sigla) => {
                  setPartyAcronym(sigla);
                  const found = tseParties.find((p) => p.sigla === sigla);
                  setPartyNumber(found ? String(found.numero) : "");
                }}
              />
            </div>
            <div>
              <label style={LABEL_STYLE}>Número</label>
              <input
                style={INPUT_STYLE}
                type="number"
                value={partyNumber}
                onChange={(e) => setPartyNumber(e.target.value)}
                placeholder="Ex: 15"
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: "10px" }}>
            <div>
              <label style={LABEL_STYLE}>Cargo / Categoria</label>
              <input
                style={INPUT_STYLE}
                value={roleCategory}
                onChange={(e) => setRoleCategory(e.target.value)}
                placeholder="Ex: Prefeito, Governador, Produto"
              />
            </div>
            <div>
              <label style={LABEL_STYLE}>Cor (Hex)</label>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="color"
                  value={colorHex}
                  onChange={(e) => setColorHex(e.target.value)}
                  style={{ width: "38px", height: "36px", border: "none", background: "transparent", cursor: "pointer", padding: 0 }}
                />
                <input
                  style={INPUT_STYLE}
                  value={colorHex}
                  onChange={(e) => setColorHex(e.target.value)}
                />
              </div>
            </div>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Candidato / produto ativo
          </label>
        </div>
      </SlideOverDrawer>

      <ConfirmDialogModal
        isOpen={deleteTarget !== null}
        title="Excluir Candidato / Produto"
        message={
          deleteTarget
            ? `Tem certeza que deseja excluir "${deleteTarget.urnName}"?`
            : ""
        }
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
