"""Motor Antifraude de Coleta em Campo: HMAC-SHA256, Geofencing Ray-Casting e Tempo Mínimo."""

import hashlib
import hmac
from decimal import Decimal
from typing import Any
from uuid import UUID

from src.core.config import get_settings
from src.modules.fieldwork.models import InterviewAuditStatus

MIN_INTERVIEW_DURATION_SECONDS = 45


def compute_interview_hmac(
    *,
    survey_id: UUID,
    stratum_id: UUID,
    quota_cell_id: UUID,
    researcher_id: UUID,
    client_interview_key: str,
    duration_seconds: int,
    lon: Decimal,
    lat: Decimal,
) -> str:
    """Calcula a assinatura HMAC-SHA256 canônica de uma entrevista coletada em campo."""
    settings = get_settings()
    lon_norm = f"{lon:.4f}"
    lat_norm = f"{lat:.4f}"
    canonical = "|".join(
        [
            str(survey_id),
            str(stratum_id),
            str(quota_cell_id),
            str(researcher_id),
            client_interview_key.strip(),
            str(duration_seconds),
            lon_norm,
            lat_norm,
        ]
    )
    return hmac.new(
        settings.hmac_field_secret.encode("utf-8"),
        canonical.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def verify_interview_hmac(
    *,
    expected_signature: str,
    survey_id: UUID,
    stratum_id: UUID,
    quota_cell_id: UUID,
    researcher_id: UUID,
    client_interview_key: str,
    duration_seconds: int,
    lon: Decimal,
    lat: Decimal,
) -> bool:
    """Compara em tempo constante a assinatura HMAC enviada pelo dispositivo."""
    computed = compute_interview_hmac(
        survey_id=survey_id,
        stratum_id=stratum_id,
        quota_cell_id=quota_cell_id,
        researcher_id=researcher_id,
        client_interview_key=client_interview_key,
        duration_seconds=duration_seconds,
        lon=lon,
        lat=lat,
    )
    return hmac.compare_digest(computed, expected_signature.strip().lower())


def is_point_inside_polygon(
    lon: Decimal,
    lat: Decimal,
    boundary_geom: dict[str, Any] | None,
) -> bool:
    """Verifica se o ponto GPS está dentro do Polígono GeoJSON (Ray-Casting Decimal)."""
    if not boundary_geom:
        return True

    geom_type = str(boundary_geom.get("type", ""))
    coords = boundary_geom.get("coordinates")
    if geom_type != "Polygon" or not isinstance(coords, list) or not coords:
        return True

    ring = coords[0]
    if not isinstance(ring, list) or len(ring) < 3:
        return True

    inside = False
    n = len(ring)
    j = n - 1
    for i in range(n):
        xi = Decimal(str(ring[i][0]))
        yi = Decimal(str(ring[i][1]))
        xj = Decimal(str(ring[j][0]))
        yj = Decimal(str(ring[j][1]))

        intersects = ((yi > lat) != (yj > lat)) and (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)
        if intersects:
            inside = not inside
        j = i

    return inside


def evaluate_antifraud_rules(
    *,
    lon: Decimal,
    lat: Decimal,
    boundary_geom: dict[str, Any] | None,
    duration_seconds: int,
    current_valid_quota: int,
    target_quota: int,
) -> tuple[bool, InterviewAuditStatus, str | None]:
    """Avalia regras antifraude (Geofencing, Tempo Mínimo e Teto da Célula de Cota).

    Retorna `(is_geofence_valid, audit_status, flag_or_purge_reason)`.
    """
    geofence_ok = is_point_inside_polygon(lon, lat, boundary_geom)
    reasons: list[str] = []

    if not geofence_ok:
        reasons.append("FORA_DO_PERIMETRO_GEOGRAFICO_SETOR")

    if duration_seconds < MIN_INTERVIEW_DURATION_SECONDS:
        reasons.append(
            f"TEMPO_DE_ENTREVISTA_ABAIXO_DO_MINIMO "
            f"({duration_seconds}s < {MIN_INTERVIEW_DURATION_SECONDS}s)"
        )

    if current_valid_quota >= target_quota:
        reasons.append(f"COTA_DEMOGRAFICA_EXCEDIDA ({current_valid_quota}/{target_quota})")

    if reasons:
        return geofence_ok, InterviewAuditStatus.FLAGGED, "; ".join(reasons)

    return True, InterviewAuditStatus.VALID, None
