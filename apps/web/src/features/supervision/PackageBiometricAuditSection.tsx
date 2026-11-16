import React, { useState } from "react";
import type { FieldPackageItem } from "./supervisionData";

export function PackageBiometricAuditSection({
  pkg,
}: {
  readonly pkg: FieldPackageItem;
}): React.JSX.Element {
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [signatureVerified, setSignatureVerified] = useState<boolean>(true);

  return (
    <div
      data-testid="drawer-biometric-audio-section"
      style={{
        backgroundColor: "#202020",
        border: "1px solid #353535",
        borderRadius: "12px",
        padding: "10px 12px",
        marginTop: "12px",
        marginBottom: "12px",
        fontSize: "12px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <strong style={{ color: "#e5e2e1" }}>
          🎙️ Auditoria de Áudio Ambiental & Assinatura Digital (TSE)
        </strong>
        <span
          style={{
            backgroundColor: signatureVerified ? "#183724" : "#2a2a2a",
            color: signatureVerified ? "#a8dab5" : "#fdd663",
            border: "1px solid rgba(129, 201, 149, 0.3)",
            padding: "2px 8px",
            borderRadius: "9999px",
            fontSize: "10px",
            fontWeight: 700,
          }}
        >
          {signatureVerified ? "✓ Biometria & Áudio Íntegros" : "Em Verificação"}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "#1b1c1c",
          border: "1px solid #353535",
          borderRadius: "8px",
          padding: "8px 10px",
          marginBottom: "8px",
        }}
      >
        <div>
          <div style={{ fontWeight: 600, color: "#e5e2e1" }}>
            Trecho de Verificação Acústica ({pkg.packageProtocol}.opus — 18s)
          </div>
          <div style={{ fontSize: "11px", color: "#9aa0a6" }}>
            {isPlayingAudio
              ? "🔊 Reproduzindo confirmação de consentimento do eleitor (00:08 / 00:18)..."
              : "Gravado com consentimento no início da entrevista"}
          </div>
        </div>
        <button
          type="button"
          data-testid="btn-toggle-audio-snippet"
          onClick={() => setIsPlayingAudio((prev) => !prev)}
          style={{
            padding: "5px 10px",
            backgroundColor: isPlayingAudio ? "#f28b82" : "#8ab4f8",
            color: isPlayingAudio ? "#690005" : "#003061",
            border: "none",
            borderRadius: "8px",
            fontSize: "11px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {isPlayingAudio ? "⏹ Parar Áudio" : "▶️ Ouvir Trecho"}
        </button>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "11px",
          color: "#c3c6d1",
        }}
      >
        <span>
          <strong>Assinatura Digital Eleitor:</strong>{" "}
          <code style={{ color: "#8ab4f8" }}>sig-ecdsa:{pkg.deviceHash.slice(-10)}-ok</code>
        </span>
        <button
          type="button"
          data-testid="btn-verify-signature"
          onClick={() => setSignatureVerified(true)}
          style={{
            padding: "3px 8px",
            backgroundColor: "#2a2a2a",
            color: "#8ab4f8",
            border: "1px solid #353535",
            borderRadius: "6px",
            fontSize: "11px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          🔏 Validar Assinatura
        </button>
      </div>
    </div>
  );
}

