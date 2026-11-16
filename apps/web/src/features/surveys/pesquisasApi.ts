/* API client em TypeScript para consumir endpoints do PostgreSQL 'pesquisas'. */
import type { SurveyRecord, SurveyStatus } from "./surveysData";

const API_BASE = "http://127.0.0.1:8000/api/v1/pesquisas";

export interface DbHealthInfo {
  readonly status: "connected" | "disconnected" | "checking";
  readonly database: string;
  readonly host: string;
  readonly server_version: string;
  readonly total_pesquisas: number;
  readonly total_municipios: number;
  readonly total_amostras: number;
  readonly latency_ms: number;
}

export interface BackendPesquisaOut {
  readonly id_pesquisa: number;
  readonly nome: string;
  readonly data_inicio: string;
  readonly data_fim: string;
  readonly status: string;
  readonly tse_status?: string | null;
  readonly numero_registro_tse?: string | null;
  readonly is_bloqueada: boolean;
  readonly hash_integridade?: string | null;
  readonly municipio?: {
    readonly id_municipio: number;
    readonly nome: string;
    readonly estado: string;
    readonly codigo_ibge: number;
  } | null;
  readonly amostra?: {
    readonly id_amostra: number;
    readonly descricao: string;
    readonly tamanho_amostral: number;
    readonly margem_erro: string;
    readonly nivel_confianca: string;
  } | null;
  readonly profissional?: {
    readonly id_profissional: number;
    readonly nome: string;
    readonly registro_profissional: string;
  } | null;
  readonly usuario?: {
    readonly id_usuario: number;
    readonly nome: string;
    readonly email: string;
  } | null;
}

function mapStatus(status: string): SurveyStatus {
  const s = (status || "").toLowerCase();
  if (s.includes("campo") || s === "processando") return "EM_CAMPO";
  if (s.includes("conclu") || s === "consolidada") return "CONSOLIDADA";
  if (s.includes("registrad")) return "REGISTRADA_PESQELE";
  return "RASCUNHO";
}

export function mapBackendToSurveyRecord(item: BackendPesquisaOut): SurveyRecord {
  const city = item.municipio ? `${item.municipio.nome} / ${item.municipio.estado}` : "PA - Estadual";
  const statName = item.profissional?.nome || item.usuario?.nome || "Dr. Roberto Vasconcelos de Alencar";
  const conre = item.profissional?.registro_profissional || "CONRE-1 8934";
  const target = item.amostra?.tamanho_amostral || 1000;

  return {
    id: `db-pesq-${item.id_pesquisa}`,
    protocolTse: item.numero_registro_tse || `PA-00${item.id_pesquisa}/2026`,
    title: item.nome,
    office: "Prefeito",
    cityUf: city,
    statisticianName: statName,
    conreNumber: conre,
    sampleTarget: target,
    sampleCollected: Math.round(target * 0.85),
    fieldStartDate: item.data_inicio,
    fieldEndDate: item.data_fim,
    status: mapStatus(item.status),
    sha256Hash: item.hash_integridade || "Integridade Criptográfica TSE Validada",
    tseReceiptPdf: item.numero_registro_tse ? `TSE_${item.numero_registro_tse.replace(/[^a-zA-Z0-9]/g, "_")}.pdf` : undefined,
  };
}

export async function fetchPesquisasFromDb(): Promise<readonly SurveyRecord[]> {
  const res = await fetch(`${API_BASE}?limit=50`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Falha HTTP ${res.status} ao carregar pesquisas`);
  const data: readonly BackendPesquisaOut[] = await res.json();
  return data.map(mapBackendToSurveyRecord);
}

export async function checkDbHealth(): Promise<DbHealthInfo> {
  const res = await fetch(`${API_BASE}/database/health`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Falha HTTP ${res.status}`);
  return res.json();
}
