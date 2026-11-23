import React, { useEffect, useRef, useState } from "react";

const API_UPLOAD_FOTO = "http://127.0.0.1:8000/api/v1/questionarios-db/candidatos/upload-foto";

export interface CandidatePhotoUploaderProps {
  readonly candidateId?: number;
  readonly name: string;
  readonly photoUrl: string | null;
  readonly colorHex: string;
  readonly size?: number;
  readonly onUploaded: (fotoUrl: string) => void;
  readonly onError?: (message: string) => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  if (!first) return "?";
  const last = parts[parts.length - 1];
  if (parts.length === 1 || !last) return first.slice(0, 2).toUpperCase();
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

export function CandidatePhotoUploader({
  candidateId,
  name,
  photoUrl,
  colorHex: _colorHex,
  size = 40,
  onUploaded,
  onError,
}: CandidatePhotoUploaderProps): React.JSX.Element {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [photoUrl]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      onError?.("Selecione um arquivo de imagem válido (JPG, PNG, WEBP).");
      return;
    }

    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ""));
        reader.onerror = () => reject(new Error("Falha ao ler o arquivo de imagem."));
        reader.readAsDataURL(file);
      });

      const res = await fetch(API_UPLOAD_FOTO, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name || "candidato.jpg",
          content_type: file.type || "image/jpeg",
          data_base64: dataUrl,
          id_candidato_produto: candidateId ?? null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const detail =
          typeof err?.detail === "string"
            ? err.detail
            : `Erro ao enviar foto para o GCS (HTTP ${res.status}).`;
        throw new Error(detail);
      }
      const data = (await res.json()) as { foto_url?: string };
      if (!data.foto_url) {
        throw new Error("O servidor não retornou a URL da imagem enviada.");
      }
      setImgFailed(false);
      onUploaded(data.foto_url);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Erro ao enviar imagem para o GCS.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => void handleFileChange(e)}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={(e) => {
          e.stopPropagation();
          fileInputRef.current?.click();
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title={uploading ? "Enviando foto para o GCS..." : "Clique para enviar/alterar a foto (GCS)"}
        aria-label={`Enviar foto de ${name || "candidato"}`}
        style={{
          position: "relative",
          width: `${size}px`,
          height: `${size}px`,
          padding: 0,
          borderRadius: "50%",
          overflow: "hidden",
          border: "1.5px solid var(--outline-variant, #424750)",
          backgroundColor: "var(--surface-elevated, #2a2a2a)",
          color: "var(--text-muted, #9aa0a6)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: `${Math.max(11, Math.round(size * 0.32))}px`,
          cursor: uploading ? "wait" : "pointer",
          flexShrink: 0,
        }}
      >
        {photoUrl && !imgFailed ? (
          <img
            src={photoUrl}
            alt={name}
            onError={() => setImgFailed(true)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              borderRadius: "50%",
              display: "block",
            }}
          />
        ) : (
          getInitials(name || "C")
        )}

        {(hovered || uploading) && (
          <span
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.58)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: uploading ? "11px" : `${Math.max(12, Math.round(size * 0.36))}px`,
              fontWeight: 700,
            }}
          >
            {uploading ? "..." : "📷"}
          </span>
        )}
      </button>
    </div>
  );
}
