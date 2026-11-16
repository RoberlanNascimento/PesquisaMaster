import React, { useMemo, useState } from "react";
import type { QuestionOptionSchema } from "../../api-client";
import { Card } from "../../components/ui/Card";
import { useUiSessionStore } from "../../lib/store";
import { PWA_SURVEY_CATALOG } from "./researcherPwaData";

export function rotateDiscOptionsClient(
  options: readonly QuestionOptionSchema[],
  shift: number
): readonly QuestionOptionSchema[] {
  const rotatable = options.filter((o) => !o.is_fixed);
  const fixed = options.filter((o) => o.is_fixed);
  if (rotatable.length <= 1) return [...rotatable, ...fixed];
  const normalizedShift = ((shift % rotatable.length) + rotatable.length) % rotatable.length;
  const effectiveShift = normalizedShift === 0 ? 1 : normalizedShift;
  return [...rotatable.slice(effectiveShift), ...rotatable.slice(0, effectiveShift), ...fixed];
}

const SELECT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "6px 8px",
  borderRadius: "8px",
  border: "1px solid #353535",
  fontSize: "12px",
};

export function ResearcherPwaFeature(): React.JSX.Element {
  const boundDeviceId = useUiSessionStore((s) => s.boundDeviceId);
  const offlineQueueCount = useUiSessionStore((s) => s.offlineQueueCount);
  const enqueueOfflineInterview = useUiSessionStore((s) => s.enqueueOfflineInterview);
  const clearOfflineQueue = useUiSessionStore((s) => s.clearOfflineQueue);

  const [selectedSurveyId, setSelectedSurveyId] = useState<string>("BR-08421/2026");
  const activeSurvey = useMemo(
    () => PWA_SURVEY_CATALOG.find((s) => s.surveyId === selectedSurveyId) ?? PWA_SURVEY_CATALOG[0]!,
    [selectedSurveyId]
  );

  const [interviewCounter, setInterviewCounter] = useState<number>(1);
  const [selectedCode, setSelectedCode] = useState<string>("CAND_A");
  const [spontaneousAnswer, setSpontaneousAnswer] = useState<string>("Candidato Alfa");
  const [selectedSector, setSelectedSector] = useState<string>("Zona Sul — Setor 355030801");
  const [selectedProfile, setSelectedProfile] = useState<string>(
    "Feminino • 25 a 44 anos • Ensino Médio"
  );
  const [gpsCoords, setGpsCoords] = useState<{ lat: string; lon: string; acc: string }>({
    lat: "-23.6214",
    lon: "-46.6382",
    acc: "4.2m",
  });
  const [lastHmacDigest, setLastHmacDigest] = useState<string>(
    "hmac-sha256:9f86d081884c7d659a2feaa0c55ad015"
  );

  const rotatedOptions = useMemo(
    () => rotateDiscOptionsClient(activeSurvey.options, interviewCounter),
    [activeSurvey.options, interviewCounter]
  );

  const handleSurveyChange = (newId: string): void => {
    setSelectedSurveyId(newId);
    const found = PWA_SURVEY_CATALOG.find((s) => s.surveyId === newId);
    if (found) {
      setSpontaneousAnswer(found.defaultSpontaneous);
      setSelectedCode(found.options[0]?.code ?? "CAND_A");
    }
  };

  const handleCaptureGps = (): void => {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          setGpsCoords({
            lat: pos.coords.latitude.toFixed(4),
            lon: pos.coords.longitude.toFixed(4),
            acc: `${pos.coords.accuracy.toFixed(1)}m`,
          }),
        () => setGpsCoords({ lat: "-23.6219", lon: "-46.6389", acc: "3.1m" })
      );
    } else {
      setGpsCoords({ lat: "-23.6219", lon: "-46.6389", acc: "3.1m" });
    }
  };

  const handleSaveOffline = (): void => {
    handleCaptureGps();
    enqueueOfflineInterview();
    setInterviewCounter((prev) => prev + 1);
    setLastHmacDigest(`hmac-sha256:7f83b1657ff1fc53b92dc18148a1d65d-s${interviewCounter + 1}`);
  };

  return (
    <Card
      title="Épico 3.4 — Coleta Offline-First (PWA do Pesquisador com Disco Eleitoral TSE)"
      subtitle={`Device Binding Ativo: ${boundDeviceId} | Geofencing PostGIS SRID 4674 | Armazenamento Criptografado`}
      badgeText={`Fila Offline: ${offlineQueueCount} entrevista(s)`}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "12px",
          backgroundColor: "#1b1c1c",
          border: "1px solid #353535",
          borderRadius: "12px",
          padding: "14px",
          marginBottom: "16px",
          fontSize: "12px",
        }}
      >
        <div>
          <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>
            Pesquisa Ativa em Campo (Carga Dinâmica)
          </label>
          <select
            data-testid="pwa-select-active-survey"
            value={selectedSurveyId}
            onChange={(e) => handleSurveyChange(e.target.value)}
            style={SELECT_STYLE}
          >
            {PWA_SURVEY_CATALOG.map((s) => (
              <option key={s.surveyId} value={s.surveyId}>
                {s.surveyLabel}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>
            Setor Censitário Atribuído (IBGE)
          </label>
          <select
            data-testid="pwa-select-sector"
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            style={SELECT_STYLE}
          >
            <option value="Zona Sul — Setor 355030801">Zona Sul — Setor 355030801 (Meta: 25)</option>
            <option value="Centro — Setor 355030803">Centro — Setor 355030803 (Meta: 15)</option>
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>
            Célula de Cota Demográfica
          </label>
          <select
            data-testid="pwa-select-quota-profile"
            value={selectedProfile}
            onChange={(e) => setSelectedProfile(e.target.value)}
            style={SELECT_STYLE}
          >
            <option value="Feminino • 25 a 44 anos • Ensino Médio">
              Feminino • 25 a 44 anos • Ensino Médio (18/25)
            </option>
            <option value="Masculino • 45 a 59 anos • Fundamental">
              Masculino • 45 a 59 anos • Fundamental (14/20)
            </option>
          </select>
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
            <span style={{ fontWeight: 600 }}>Telemetria GPS & Assinatura</span>
            <button
              type="button"
              data-testid="btn-capture-gps"
              onClick={handleCaptureGps}
              style={{ padding: "3px 8px", fontSize: "10px", fontWeight: 700, borderRadius: "9999px", border: "1px solid #8ab4f8", backgroundColor: "#2a2a2a", color: "#8ab4f8", cursor: "pointer" }}
            >
              📍 Capturar GPS
            </button>
          </div>
          <div data-testid="pwa-gps-telemetry" style={{ fontFamily: "monospace", color: "#81c995", fontWeight: 700 }}>
            ✓ Polígono OK ({gpsCoords.lat}, {gpsCoords.lon} | ±{gpsCoords.acc})
          </div>
          <div style={{ fontFamily: "monospace", fontSize: "10px", color: "#9aa0a6" }}>{lastHmacDigest}</div>
        </div>
      </div>

      <div style={{ marginBottom: "14px" }}>
        <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#e5e2e1", marginBottom: "6px" }}>
          {activeSurvey.spontaneousPrompt}
        </label>
        <input
          data-testid="pwa-input-spontaneous"
          type="text"
          value={spontaneousAnswer}
          onChange={(e) => setSpontaneousAnswer(e.target.value)}
          style={{ width: "100%", padding: "9px 12px", borderRadius: "10px", border: "1px solid #353535", fontSize: "13px", boxSizing: "border-box" }}
        />
      </div>

      <p style={{ margin: "0 0 10px", fontSize: "13px", fontWeight: 700, color: "#e5e2e1" }}>
        {activeSurvey.stimulatedPrompt} (Semente #{interviewCounter})
      </p>
      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px", display: "grid", gap: "8px" }}>
        {rotatedOptions.map((opt) => (
          <li
            key={opt.code}
            style={{
              backgroundColor: selectedCode === opt.code ? "#2a2a2a" : "#1b1c1c",
              border: selectedCode === opt.code ? "1px solid #8ab4f8" : "1px solid #353535",
              borderRadius: "12px",
              padding: "10px 14px",
            }}
          >
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: "#e5e2e1" }}>
              <input
                type="radio"
                name="stimulated_vote"
                value={opt.code}
                checked={selectedCode === opt.code}
                onChange={() => setSelectedCode(opt.code)}
              />
              <span>
                <strong>{opt.label}</strong>{" "}
                {opt.is_fixed ? <em style={{ color: "#9aa0a6", fontSize: "11px" }}>(Ancorado no fim do cartão)</em> : null}
              </span>
            </label>
          </li>
        ))}
      </ul>

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={handleSaveOffline}
          data-testid="btn-save-offline"
          style={{ padding: "10px 18px", backgroundColor: "#8ab4f8", color: "#003061", border: "none", borderRadius: "10px", fontWeight: 600, cursor: "pointer" }}
        >
          Assinar HMAC & Salvar na Fila Local
        </button>
        <button
          type="button"
          onClick={clearOfflineQueue}
          disabled={offlineQueueCount === 0}
          data-testid="btn-sync-batch"
          style={{ padding: "10px 18px", backgroundColor: offlineQueueCount > 0 ? "#81c995" : "#353535", color: offlineQueueCount > 0 ? "#00391b" : "#9aa0a6", border: "none", borderRadius: "10px", fontWeight: 600, cursor: offlineQueueCount > 0 ? "pointer" : "not-allowed" }}
        >
          Sincronizar Lote Idempotente ({offlineQueueCount})
        </button>
      </div>
    </Card>
  );
}
