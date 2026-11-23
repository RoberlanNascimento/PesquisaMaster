"""Camada de serviços externos e infraestrutura da API PesquisaMaster."""

from src.services.gcs import GCSService, get_gcs_service

__all__ = ["GCSService", "get_gcs_service"]
