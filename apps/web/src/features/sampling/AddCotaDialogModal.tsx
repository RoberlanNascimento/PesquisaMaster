import React, { useEffect, useState } from "react";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";

const { colors } = NOCTURNE_TOKENS;

const FIELD_INPUT: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 12px",
  borderRadius: "10px",
  border: `1px solid ${colors.borderSubtle}`,
  backgroundColor: colors.surfaceContainer,
  color: colors.textPrimary,
  fontSize: "13px",
};

const FIELD_LABEL: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  fontWeight: 600,
  color: colors.onSurfaceVariant,
  marginBottom: "5px",
};

export interface ManualCotaPayload {
  readonly nome_dimensao: string;
  readonly categoria: string;
  readonly id_bairro: number | null;
  readonly percentual_meta: number;
  readonly quantidade_meta: number;
}

export function AddCotaDialogModal({
  isOpen,
  onClose,
  onSave,
  bairros,
  sampleSize,
  amostraLabel,
}: {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSave: (payload: ManualCotaPayload) => Promise<void>;
  readonly bairros: readonly any[];
  readonly sampleSize: number;
  readonly amostraLabel: string;
}): React.JSX.Element | null {
  const [dimensao, setDimensao] = useState("Sexo");
  const [categoria, setCategoria] = useState("");
  const [bairroId, setBairroId] = useState("");
  const [percentual, setPercentual] = useState("10");
  const [quantidade, setQuantidade] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setCategoria("");
    setPercentual("10");
    setQuantidade(String(Math.max(1, Math.round((sampleSize || 400) * 0.1))));
    if (bairros.length > 0) {
      setBairroId(String(bairros[0].id_bairro));
    } else {
      setBairroId("");
    }
  }, [isOpen, bairros, sampleSize]);

  if (!isOpen) return null;

  const handlePercentChange = (val: string): void => {
    setPercentual(val);
    const num = Number(val);
    if (!Number.isNaN(num) && sampleSize > 0) {
      setQuantidade(String(Math.round((sampleSize * num) / 100)));
    }
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!categoria.trim()) return;
    setSaving(true);
    try {
      await onSave({
        nome_dimensao: dimensao.trim() || "Bairro / Zona",
        categoria: categoria.trim(),
        id_bairro: bairroId ? Number(bairroId) : null,
        percentual_meta: Number(percentual) || 0,
        quantidade_meta: Number(quantidade) || 0,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Adicionar Cota Manualmente"
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
          maxWidth: "480px",
          backgroundColor: "#1b1c1d",
          border: `1px solid ${colors.borderSubtle}`,
          borderRadius: "16px",
          padding: "22px",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.65)",
          color: colors.textPrimary,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
          <h3 style={{ margin: 0, fontSize: "16px" }}>Adicionar Cota Manualmente</h3>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: colors.onSurfaceVariant, fontSize: "16px", cursor: "pointer" }}
          >
            ✕
          </button>
        </div>
        <p style={{ margin: "0 0 16px", fontSize: "12px", color: colors.onSurfaceVariant }}>
          {amostraLabel}
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div>
            <label style={FIELD_LABEL}>Dimensão *</label>
            <input
              list="dimensoes-padrao"
              style={FIELD_INPUT}
              value={dimensao}
              onChange={(e) => setDimensao(e.target.value)}
              placeholder="Ex: Sexo, Faixa Etária, Escolaridade, Renda, Bairro / Zona"
              required
            />
            <datalist id="dimensoes-padrao">
              <option value="Sexo" />
              <option value="Faixa Etária" />
              <option value="Escolaridade" />
              <option value="Renda" />
              <option value="Bairro / Zona" />
            </datalist>
          </div>

          <div>
            <label style={FIELD_LABEL}>Categoria / Estrato *</label>
            <input
              style={FIELD_INPUT}
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              placeholder="Ex: Ensino Superior, 25 a 34 anos, Feminino"
              required
            />
          </div>

          <div>
            <label style={FIELD_LABEL}>Bairro (Município da Amostra) *</label>
            <select
              style={FIELD_INPUT}
              value={bairroId}
              onChange={(e) => setBairroId(e.target.value)}
              required={bairros.length > 0}
            >
              {bairros.map((b) => (
                <option key={b.id_bairro} value={b.id_bairro}>
                  {b.nome_bairro}
                </option>
              ))}
              {bairros.length === 0 && <option value="">Bairro padrão do município</option>}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={FIELD_LABEL}>Percentual Meta (%) *</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                style={FIELD_INPUT}
                value={percentual}
                onChange={(e) => handlePercentChange(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={FIELD_LABEL}>Quantidade Meta (N) *</label>
              <input
                type="number"
                min="1"
                style={FIELD_INPUT}
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
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
              disabled={saving}
              style={{
                padding: "9px 18px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: "#81c995",
                color: "#00391b",
                fontSize: "12px",
                fontWeight: 700,
                cursor: saving ? "wait" : "pointer",
              }}
            >
              {saving ? "Salvando..." : "Salvar Cota"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
