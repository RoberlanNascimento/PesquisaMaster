import React, { useState } from "react";
import type { OverviewSurveyDataset } from "./overviewData";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildDossierHtml(survey: OverviewSurveyDataset): string {
  const generatedAt = new Date().toLocaleString("pt-BR");
  const officesHtml = survey.offices
    .map((off) => {
      const renderRows = (title: string, items: typeof off.stimulated): string => {
        if (items.length === 0) return "";
        return `
          <div class="block">
            <h4>${escapeHtml(title)}</h4>
            <table>
              <thead>
                <tr>
                  <th>Candidato / Opção</th>
                  <th>Partido</th>
                  <th class="num">Respostas</th>
                  <th class="num">Percentual</th>
                </tr>
              </thead>
              <tbody>
                ${items
                  .map(
                    (c) => `
                  <tr>
                    <td>${escapeHtml(c.name)}</td>
                    <td>${escapeHtml(c.party || "—")}</td>
                    <td class="num">${c.quantity.toLocaleString("pt-BR")}</td>
                    <td class="num"><strong>${Number(c.percentage).toFixed(1)}%</strong></td>
                  </tr>`
                  )
                  .join("")}
              </tbody>
            </table>
          </div>`;
      };

      const scenariosHtml = off.scenarios
        .map((sc) => renderRows(`Cenário: ${sc.scenarioTitle}`, sc.points))
        .join("");

      return `
        <section class="office">
          <h3>${escapeHtml(off.officeLabel)}</h3>
          ${renderRows(off.stimulatedTitle || "Cenário Estimulado", off.stimulated)}
          ${renderRows(off.spontaneousTitle || "Cenário Espontâneo", off.spontaneous)}
          ${scenariosHtml}
          ${renderRows(off.rejectionTitle || "Índice de Rejeição", off.rejection)}
        </section>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Dossiê Executivo — ${escapeHtml(survey.protocolTse)}</title>
  <style>
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { margin: 0; padding: 24px; font-family: "Segoe UI", Arial, sans-serif; color: #0f172a; background: #ffffff; }
    .header { border-bottom: 2px solid #1e3a8a; padding-bottom: 14px; margin-bottom: 18px; }
    .kicker { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #1d4ed8; }
    h1 { margin: 6px 0 4px; font-size: 22px; }
    .sub { font-size: 13px; color: #475569; }
    .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; margin-bottom: 20px; font-size: 12.5px; }
    .office { margin-bottom: 20px; }
    .office h3 { margin: 0 0 10px; font-size: 16px; color: #1e3a8a; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
    .block { margin-bottom: 14px; }
    .block h4 { margin: 0 0 6px; font-size: 13px; color: #334155; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: left; }
    th { background: #f1f5f9; color: #334155; font-weight: 700; }
    .num { text-align: right; }
    .footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #cbd5e1; font-size: 11px; color: #64748b; }
    @page { size: A4 portrait; margin: 12mm; }
  </style>
</head>
<body>
  <div class="header">
    <div class="kicker">Dossiê Executivo &amp; Ficha Técnica — Resolução TSE nº 23.600</div>
    <h1>${escapeHtml(survey.surveyName)}</h1>
    <div class="sub">Protocolo: ${escapeHtml(survey.protocolTse)} • Gerado em ${escapeHtml(generatedAt)}</div>
  </div>
  <div class="meta-grid">
    <div><strong>Protocolo PesqEle / TSE:</strong> ${escapeHtml(survey.protocolTse)}</div>
    <div><strong>Data de Campo:</strong> ${escapeHtml(survey.surveyDate)}</div>
    <div><strong>Amostra (N):</strong> ${survey.sampleSize.toLocaleString("pt-BR")} eleitores</div>
    <div><strong>Margem de Erro:</strong> ±${escapeHtml(String(survey.marginOfError))} p.p.</div>
    <div><strong>ID da Pesquisa:</strong> #${escapeHtml(survey.id)}</div>
    <div><strong>Cargos Consolidados:</strong> ${survey.offices.length}</div>
  </div>
  ${officesHtml || "<p>Nenhum resultado consolidado registrado para esta pesquisa.</p>"}
  <div class="footer">Dados consolidados diretamente da base oficial PostgreSQL • Pesquisa #${escapeHtml(survey.id)}</div>
</body>
</html>`;
}

export function ExecutiveDossierModal({
  survey,
  onClose,
}: {
  readonly survey: OverviewSurveyDataset | null;
  readonly onClose: () => void;
}): React.JSX.Element | null {
  const [downloadConfirm, setDownloadConfirm] = useState<string | null>(null);

  if (!survey) return null;

  const totalScenarios = survey.offices.reduce((acc, off) => acc + off.scenarios.length, 0);

  const handleDownloadPdf = (): void => {
    const html = buildDossierHtml(survey);
    const win = window.open("", "_blank", "width=960,height=780");
    if (!win) {
      setDownloadConfirm(
        "Permita pop-ups no navegador para abrir o Dossiê Executivo em PDF para impressão/salvamento."
      );
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 200);
    setDownloadConfirm(
      `✓ Dossiê_Executivo_TSE_${survey.protocolTse.replace(/[^a-zA-Z0-9]/g, "_")}.pdf aberto para impressão / salvamento em PDF.`
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
              DOSSIÊ EXECUTIVO — RESOLUÇÃO TSE Nº 23.600
            </span>
            <h2 style={{ margin: "6px 0 2px", fontSize: "19px", color: "#e5e2e1" }}>
              Dossiê Executivo & Ficha Técnica ({survey.protocolTse})
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
            <strong>Pesquisa (BD):</strong> #{survey.id} — {survey.surveyName}
          </div>
          <div>
            <strong>Cenários Apurados:</strong> {totalScenarios}
          </div>
          <div>
            <strong>Amostra (N):</strong> {survey.sampleSize.toLocaleString("pt-BR")} eleitores
          </div>
          <div>
            <strong>Margem de Erro:</strong> ±{survey.marginOfError} p.p.
          </div>
        </div>

        <h3 style={{ margin: "0 0 10px", fontSize: "14px", color: "#e5e2e1" }}>
          Síntese Consolidada dos Cargos Pesquisados ({survey.offices.length}{" "}
          {survey.offices.length === 1 ? "cargo" : "cargos"})
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
                📌 {off.officeLabel} — {off.stimulatedTitle || "Cenário Estimulado"}
              </div>
              {off.stimulated.length === 0 ? (
                <div style={{ fontSize: "11px", color: "#9aa0a6" }}>
                  Nenhuma resposta estimulada consolidada para este cargo.
                </div>
              ) : (
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
                      <strong>
                        {cand.name}
                        {cand.party ? ` (${cand.party})` : ""}:
                      </strong>{" "}
                      {Number(cand.percentage).toFixed(1)}%
                    </span>
                  ))}
                </div>
              )}
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
            🖨️ Exportar / Imprimir PDF Oficial
          </button>
        </div>
      </div>
    </div>
  );
}

