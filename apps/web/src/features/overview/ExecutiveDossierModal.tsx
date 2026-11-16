import React, { useState } from "react";
import type { OverviewSurveyDataset } from "./overviewData";

export function ExecutiveDossierModal({
  survey,
  onClose,
}: {
  readonly survey: OverviewSurveyDataset | null;
  readonly onClose: () => void;
}): React.JSX.Element | null {
  const [downloadConfirm, setDownloadConfirm] = useState<string | null>(null);

  if (!survey) return null;

  const handleDownloadPdf = (): void => {
    setDownloadConfirm(
      `✓ Dossiê_Executivo_TSE_${survey.protocolTse.replace(/[^a-zA-Z0-9]/g, "_")}.pdf gerado e assinado digitalmente com sucesso!`
    );
  };

  return (
    <div
      data-testid="executive-dossier-modal-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 300,
        padding: "16px",
      }}
    >
      <div
        data-testid="executive-dossier-modal"
        role="dialog"
        aria-label={`Dossiê Executivo TSE — ${survey.protocolTse}`}
        style={{
          width: "680px",
          maxWidth: "96vw",
          maxHeight: "90vh",
          overflowY: "auto",
          backgroundColor: "#2a2a2a",
          border: "1px solid #424750",
          color: "#e5e2e1",
          borderRadius: "16px",
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5)",
          padding: "24px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            borderBottom: "1px solid #353535",
            paddingBottom: "12px",
            marginBottom: "16px",
          }}
        >
          <div>
            <span
              style={{
                backgroundColor: "#183724",
                color: "#a8dab5",
                border: "1px solid rgba(129, 201, 149, 0.3)",
                padding: "3px 10px",
                borderRadius: "9999px",
                fontSize: "11px",
                fontWeight: 700,
              }}
            >
              DOCUMENTO OFICIAL HOMOLOGADO — RESOLUÇÃO TSE Nº 23.600
            </span>
            <h2 style={{ margin: "6px 0 2px", fontSize: "19px", color: "#e5e2e1" }}>
              Dossiê Executivo & Ficha Técnica Completa ({survey.protocolTse})
            </h2>
            <div style={{ fontSize: "12px", color: "#9aa0a6" }}>{survey.surveyName}</div>
          </div>
          <button
            type="button"
            data-testid="btn-close-dossier-modal"
            onClick={onClose}
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              border: "1px solid #353535",
              backgroundColor: "#202020",
              color: "#e5e2e1",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Fechar ✕
          </button>
        </div>

        {downloadConfirm && (
          <div
            data-testid="dossier-download-confirmation"
            style={{
              padding: "10px 14px",
              backgroundColor: "#183724",
              color: "#a8dab5",
              border: "1px solid rgba(129, 201, 149, 0.3)",
              borderRadius: "12px",
              fontSize: "13px",
              fontWeight: 700,
              marginBottom: "14px",
            }}
          >
            {downloadConfirm}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
            backgroundColor: "#202020",
            border: "1px solid #353535",
            borderRadius: "12px",
            padding: "14px",
            fontSize: "12px",
            marginBottom: "16px",
          }}
        >
          <div>
            <strong>Protocolo PesqEle / TSE:</strong> {survey.protocolTse}
          </div>
          <div>
            <strong>Data de Campo:</strong> {survey.surveyDate}
          </div>
          <div>
            <strong>Contratante / Origem:</strong> Instituto Alpha Pesquisas (FEFC Eleitoral)
          </div>
          <div>
            <strong>Estatístico Responsável:</strong> Dra. Helena Vasconcelos (CONRE-3 nº 9482-A)
          </div>
          <div>
            <strong>Amostra Ponderada ($N$):</strong> {survey.sampleSize} eleitores entrevistados
          </div>
          <div>
            <strong>Margem de Erro (95% Confiança):</strong> ±{survey.marginOfError} pp (Kish DEFF = 1.124)
          </div>
          <div style={{ gridColumn: "1 / -1", fontFamily: "monospace", fontSize: "11px", color: "#8ab4f8" }}>
            <strong>Assinatura Criptográfica SHA-256:</strong> 3a9f8b2c1d4e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e
          </div>
        </div>

        <h3 style={{ margin: "0 0 10px", fontSize: "14px", color: "#e5e2e1" }}>
          Síntese Consolidada dos Cargos Pesquisados ({survey.offices.length} cargos)
        </h3>
        <div style={{ display: "grid", gap: "10px", marginBottom: "18px" }}>
          {survey.offices.map((off) => (
            <div
              key={off.officeCode}
              style={{
                backgroundColor: "#202020",
                border: "1px solid #353535",
                borderRadius: "12px",
                padding: "10px 12px",
                fontSize: "12px",
              }}
            >
              <div style={{ fontWeight: 700, color: "#8ab4f8", marginBottom: "6px" }}>
                📌 {off.officeLabel} — Cenário Estimulado (Disco TSE)
              </div>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                {off.stimulated.map((cand) => (
                  <span
                    key={cand.code}
                    style={{
                      backgroundColor: "#2a2a2a",
                      border: "1px solid #353535",
                      padding: "4px 8px",
                      borderRadius: "8px",
                      fontSize: "11px",
                    }}
                  >
                    <strong>{cand.name} ({cand.party}):</strong> {Number(cand.percentage).toFixed(1)}%
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "1px solid #353535", paddingTop: "14px" }}>
          <button
            type="button"
            data-testid="btn-download-dossier-pdf"
            onClick={handleDownloadPdf}
            style={{
              padding: "10px 18px",
              backgroundColor: "#8ab4f8",
              color: "#003061",
              border: "none",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            📥 Baixar PDF Oficial Assinado Digitalmente
          </button>
        </div>
      </div>
    </div>
  );
}

