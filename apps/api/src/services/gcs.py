"""Serviço de integração com Google Cloud Storage (GCS) para a API FastAPI.

Baseado em `gcs.py` (raiz do projeto), adaptado para FastAPI / Pydantic Settings
utilizando o SDK oficial `google-cloud-storage`.
"""

from __future__ import annotations

from datetime import timedelta
from functools import lru_cache
import logging
import os
from pathlib import Path
from typing import Any, BinaryIO
import uuid

from src.core.config import get_settings

logger = logging.getLogger(__name__)

try:
    from google.cloud import storage as gcs_storage
except ImportError:  # pragma: no cover - dependência opcional até instalação
    gcs_storage = None  # type: ignore[assignment]


class GCSService:
    """Serviço responsável por upload, exclusão e URLs assinadas no Google Cloud Storage."""

    def __init__(
        self,
        bucket_name: str | None = None,
        project_id: str | None = None,
        credentials_path: str | None = None,
        signed_url_expiration_minutes: int | None = None,
    ) -> None:
        settings = get_settings()
        self.project_id = project_id or settings.gcs_project_id or os.getenv("GCS_PROJECT_ID") or "Pesquisas"
        self.bucket_name = (
            bucket_name
            or settings.gcs_bucket_name
            or os.getenv("GCS_BUCKET_NAME")
            or "pesquisas_candidatos"
        )
        default_json = Path(__file__).resolve().parents[4] / "credenciais-pesquisas.json"
        raw_creds = (
            credentials_path
            or settings.gcs_credentials_path
            or settings.google_application_credentials
            or os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        )
        if raw_creds and os.path.exists(raw_creds):
            self.credentials_path: str | None = raw_creds
        elif default_json.exists():
            self.credentials_path = str(default_json)
        else:
            self.credentials_path = raw_creds
        self.signed_url_expiration_minutes = (
            signed_url_expiration_minutes or settings.gcs_signed_url_expiration_minutes
        )
        self._client: Any | None = None
        self._bucket: Any | None = None

        if not self.bucket_name:
            logger.warning(
                "GCS_BUCKET_NAME não configurado. Operações de upload/exclusão no GCS estarão indisponíveis."
            )
        if gcs_storage is None:
            logger.warning(
                "Pacote 'google-cloud-storage' não instalado. Instale com `pip install google-cloud-storage`."
            )

    @property
    def is_configured(self) -> bool:
        """Retorna True se o SDK estiver instalado e o bucket configurado."""
        return bool(self.bucket_name and gcs_storage is not None)

    def _get_bucket(self) -> Any:
        """Inicializa (lazy) o cliente GCS e retorna o objeto Bucket."""
        if not self.bucket_name:
            raise RuntimeError("GCS_BUCKET_NAME não configurado no ambiente.")
        if gcs_storage is None:
            raise RuntimeError(
                "Dependência 'google-cloud-storage' não instalada no ambiente virtual da API."
            )
        if self._bucket is None:
            if self.credentials_path and os.path.exists(self.credentials_path):
                self._client = gcs_storage.Client.from_service_account_json(self.credentials_path)
            else:
                self._client = gcs_storage.Client(project=self.project_id)
            self._bucket = self._client.bucket(self.bucket_name)
        return self._bucket

    def _extract_blob_path(self, file_url_or_path: str) -> str | None:
        """Extrai o caminho relativo do objeto dentro do bucket a partir de uma URL ou path."""
        cleaned = file_url_or_path.strip()
        if not cleaned:
            return None

        if self.bucket_name and self.bucket_name in cleaned:
            path = cleaned.split(self.bucket_name, maxsplit=1)[-1].lstrip("/").lstrip("\\")
        elif cleaned.startswith(("http://", "https://")):
            return None
        else:
            path = cleaned.lstrip("/").lstrip("\\")

        if "?" in path:
            path = path.split("?", maxsplit=1)[0]
        return path or None

    def upload_file(
        self,
        file_obj: bytes | BinaryIO | Any,
        destination_folder: str = "uploads",
        *,
        filename: str | None = None,
        content_type: str | None = None,
        make_public: bool = True,
    ) -> str:
        """Faz upload de um arquivo para o GCS e retorna sua URL pública (ou assinada).

        Aceita `bytes`, file-like objects (`BinaryIO`) ou `fastapi.UploadFile`.
        """
        bucket = self._get_bucket()

        # Suporte transparente para fastapi.UploadFile
        source_name = filename or getattr(file_obj, "filename", None) or getattr(file_obj, "name", None) or ""
        resolved_content_type = content_type or getattr(file_obj, "content_type", None)
        ext = os.path.splitext(str(source_name))[1]
        folder = destination_folder.strip("/")
        unique_name = f"{uuid.uuid4()}{ext}"
        blob_path = f"{folder}/{unique_name}" if folder else unique_name

        blob = bucket.blob(blob_path)

        try:
            if isinstance(file_obj, bytes):
                blob.upload_from_string(file_obj, content_type=resolved_content_type)
            elif hasattr(file_obj, "file"):
                # fastapi.UploadFile
                file_obj.file.seek(0)
                blob.upload_from_file(file_obj.file, content_type=resolved_content_type)
            else:
                if hasattr(file_obj, "seek"):
                    file_obj.seek(0)
                blob.upload_from_file(file_obj, content_type=resolved_content_type)

            file_url: str
            if make_public:
                try:
                    blob.make_public()
                    file_url = str(blob.public_url)
                except Exception as acl_error:
                    logger.warning("Falha ao aplicar ACL pública em %s: %s", blob_path, acl_error)
                    file_url = f"https://storage.googleapis.com/{self.bucket_name}/{blob_path}"
            else:
                file_url = self.get_signed_url(blob_path) or (
                    f"https://storage.googleapis.com/{self.bucket_name}/{blob_path}"
                )

            logger.info("Arquivo enviado ao GCS: %s -> %s", blob_path, file_url)
            return file_url
        except Exception as exc:
            logger.error("Falha ao enviar arquivo para o GCS: %s", exc, exc_info=True)
            raise

    def delete_file(self, file_url: str | None) -> bool:
        """Remove um arquivo do GCS com base na sua URL ou caminho relativo."""
        if not file_url:
            return False

        try:
            blob_path = self._extract_blob_path(file_url)
            if not blob_path:
                logger.warning(
                    "Ignorando exclusão no GCS: URL %s não pertence ao bucket %s",
                    file_url,
                    self.bucket_name,
                )
                return False

            bucket = self._get_bucket()
            blob = bucket.blob(blob_path)
            if blob.exists():
                blob.delete()
                logger.info("Arquivo removido do GCS: %s", blob_path)
                return True

            logger.warning("Arquivo não encontrado no GCS para exclusão: %s", blob_path)
            return False
        except Exception as exc:
            logger.error("Falha ao remover arquivo do GCS: %s", exc, exc_info=True)
            return False

    def download_file(self, file_url_or_path: str | None) -> tuple[bytes, str] | None:
        """Baixa os bytes e o content_type de um objeto do bucket GCS."""
        if not file_url_or_path:
            return None
        try:
            blob_path = self._extract_blob_path(file_url_or_path)
            if not blob_path:
                return None
            bucket = self._get_bucket()
            blob = bucket.blob(blob_path)
            if not blob.exists():
                return None
            data = blob.download_as_bytes()
            content_type = blob.content_type or "image/jpeg"
            return data, content_type
        except Exception as exc:
            logger.warning("Falha ao baixar arquivo do GCS (%s): %s", file_url_or_path, exc)
            return None

    def get_signed_url(
        self,
        file_url_or_path: str | None,
        expiration_minutes: int | None = None,
    ) -> str | None:
        """Gera uma URL assinada v4 temporária sem disparar HEAD síncrono (evita N+1)."""
        if not file_url_or_path:
            return None

        try:
            # URLs externas que não pertencem ao bucket são retornadas intactas
            if (
                file_url_or_path.startswith(("http://", "https://"))
                and "storage.googleapis.com" not in file_url_or_path
                and (not self.bucket_name or self.bucket_name not in file_url_or_path)
            ):
                return file_url_or_path

            blob_path = self._extract_blob_path(file_url_or_path)
            if not blob_path:
                return file_url_or_path

            bucket = self._get_bucket()
            blob = bucket.blob(blob_path)
            minutes = expiration_minutes or self.signed_url_expiration_minutes
            return str(
                blob.generate_signed_url(
                    version="v4",
                    expiration=timedelta(minutes=minutes),
                    method="GET",
                )
            )
        except Exception as exc:
            logger.warning("Falha ao gerar URL assinada para %s: %s", file_url_or_path, exc)
            return file_url_or_path


@lru_cache
def get_gcs_service() -> GCSService:
    """Retorna instância singleton do serviço GCS."""
    return GCSService()
