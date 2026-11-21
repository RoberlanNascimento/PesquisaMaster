/* API client em TypeScript para consumir endpoints do PostgreSQL 'pesquisas', 'amostras' e 'atribuicao_pesquisadores'. */
import type { SurveyRecord, SurveyStatus } from "./surveysData";

const API_ORIGIN = "http://127.0.0.1:8000";
const API_PESQUISAS = `${API_ORIGIN}/api/v1/pesquisas`;
const API_AMOSTRAGEM = `${API_ORIGIN}/api/v1/amostragem`;
const API_CAMPO = `${API_ORIGIN}/api/v1/campo-operacoes`;

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

export interface BackendMunicipioOut {
  readonly id_municipio: number;
  readonly nome: string;
  readonly estado: string;
  readonly codigo_ibge: number;
}

export interface BackendAmostraOut {
  readonly id_amostra: number;
  readonly id_municipio?: number;
  readonly descricao: string;
  readonly tamanho_amostral: number;
  readonly margem_erro: string | number;
  readonly nivel_confianca: string | number;
  readonly municipio_nome?: string | null;
  readonly uf?: string | null;
}

export interface BackendProfissionalOut {
  readonly id_profissional: number;
  readonly nome: string;
  readonly registro_profissional?: string;
  readonly tipo_profissional?: string;
}

export interface BackendUsuarioOut {
  readonly id_usuario: number;
  readonly nome: string;
  readonly email: string;
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
  readonly municipio?: BackendMunicipioOut | null;
  readonly amostra?: BackendAmostraOut | null;
  readonly profissional?: BackendProfissionalOut | null;
  readonly usuario?: BackendUsuarioOut | null;
}

export interface PesquisaCreatePayload {
  readonly nome: string;
  readonly data_inicio: string;
  readonly data_fim: string;
  readonly numero_registro_tse?: string | null;
  readonly id_municipio: number;
  readonly id_amostra: number;
  readonly id_profissional: number;
  readonly id_usuario?: number;
  readonly status?: string;
}

export interface PesquisaUpdatePayload {
  readonly nome?: string;
  readonly data_inicio?: string;
  readonly data_fim?: string;
  readonly numero_registro_tse?: string | null;
  readonly id_municipio?: number;
  readonly id_amostra?: number;
  readonly id_profissional?: number;
  readonly status?: string;
}

export interface AmostraCreatePayload {
  readonly id_municipio: number;
  readonly descricao: string;
  readonly nivel_confianca: number;
  readonly margem_erro: number;
  readonly proporcao_esperada?: number;
  readonly populacao_universo: number;
  readonly tamanho_amostral?: number | null;
  readonly metodo_alocacao?: string;
  readonly gerar_cotas_automaticas?: boolean;
}

export interface AmostraCreatedOut {
  readonly id_amostra: number;
  readonly id_municipio: number;
  readonly descricao: string;
  readonly tamanho_amostral: number;
  readonly metodo_alocacao?: string;
}

export interface BackendBairroOut {
  readonly id_bairro: number;
  readonly id_municipio: number;
  readonly nome_bairro: string;
  readonly codigo_bairro_ibge?: string | null;
}

export interface AtribuicaoOut {
  readonly id_atribuicao: number;
  readonly id_pesquisa: number;
  readonly id_profissional: number;
  readonly id_bairro?: number | null;
  readonly lote_setor: string;
  readonly meta_entrevistas: number;
  readonly data_inicio?: string | null;
  readonly data_limite?: string | null;
  readonly status_atribuicao: string;
  readonly id_organizacao?: number | null;
  readonly profissional_nome?: string | null;
  readonly pesquisa_titulo?: string | null;
}

export interface AtribuicaoCreatePayload {
  readonly id_pesquisa: number;
  readonly id_profissional: number;
  readonly id_bairro?: number | null;
  readonly lote_setor: string;
  readonly meta_entrevistas: number;
  readonly data_inicio?: string | null;
  readonly data_limite?: string | null;
  readonly status_atribuicao?: string;
  readonly id_organizacao?: number;
}

export interface PesquisasAuxOptions {
  readonly municipios: readonly BackendMunicipioOut[];
  readonly amostras: readonly BackendAmostraOut[];
  readonly profissionais: readonly BackendProfissionalOut[];
}

export interface CampoResumoOpcoesOut {
  readonly profissionais: readonly BackendProfissionalOut[];
  readonly bairros: readonly BackendBairroOut[];
}

function mapStatus(status: string): SurveyStatus {
  const s = (status || "").toLowerCase();
  if (s.includes("campo") || s === "processando") return "EM_CAMPO";
  if (s.includes("conclu") || s === "consolidada") return "CONSOLIDADA";
  if (s.includes("registrad")) return "REGISTRADA_PESQELE";
  return "RASCUNHO";
}

export function mapBackendToSurveyRecord(item: BackendPesquisaOut): SurveyRecord {
  const city = item.municipio
    ? `${item.municipio.nome} / ${item.municipio.estado}`
    : "Abrangência Estadual";
  const statName = item.profissional?.nome || item.usuario?.nome || "Estatístico Responsável";
  const conre = item.profissional?.registro_profissional || "CONRE";
  const target = item.amostra?.tamanho_amostral || 1000;

  return {
    id: `db-pesq-${item.id_pesquisa}`,
    dbId: item.id_pesquisa,
    dbMunicipioId: item.municipio?.id_municipio,
    dbAmostraId: item.amostra?.id_amostra,
    dbProfissionalId: item.profissional?.id_profissional,
    isBloqueada: item.is_bloqueada,
    amostraResumo: item.amostra
      ? {
          idAmostra: item.amostra.id_amostra,
          descricao: item.amostra.descricao,
          tamanhoAmostral: item.amostra.tamanho_amostral,
          margemErro: String(item.amostra.margem_erro),
          nivelConfianca: String(item.amostra.nivel_confianca),
        }
      : undefined,
    protocolTse: item.numero_registro_tse || `PA-00${item.id_pesquisa}/2026`,
    title: item.nome,
    office: "Prefeito",
    cityUf: city,
    statisticianName: statName,
    conreNumber: conre,
    sampleTarget: target,
    sampleCollected: 0,
    fieldStartDate: item.data_inicio,
    fieldEndDate: item.data_fim,
    status: mapStatus(item.status),
    sha256Hash: item.hash_integridade || "Integridade TSE Validada",
    tseReceiptPdf: item.numero_registro_tse
      ? `TSE_${item.numero_registro_tse.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`
      : undefined,
  };
}

async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { detail?: string };
    if (body?.detail) return body.detail;
  } catch {
    // ignore JSON parse failure
  }
  return `${fallback} (HTTP ${res.status})`;
}

export async function fetchPesquisasFromDb(): Promise<readonly SurveyRecord[]> {
  const res = await fetch(`${API_PESQUISAS}?limit=50`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res, "Falha ao carregar pesquisas"));
  const data = (await res.json()) as readonly BackendPesquisaOut[];
  return data.map(mapBackendToSurveyRecord);
}

export async function createPesquisaInDb(payload: PesquisaCreatePayload): Promise<SurveyRecord> {
  const res = await fetch(API_PESQUISAS, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res, "Falha ao criar pesquisa"));
  const data = (await res.json()) as BackendPesquisaOut;
  return mapBackendToSurveyRecord(data);
}

export async function updatePesquisaInDb(
  idPesquisa: number,
  payload: PesquisaUpdatePayload,
): Promise<SurveyRecord> {
  const res = await fetch(`${API_PESQUISAS}/${idPesquisa}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res, "Falha ao atualizar pesquisa"));
  const data = (await res.json()) as BackendPesquisaOut;
  return mapBackendToSurveyRecord(data);
}

export async function togglePesquisaBloqueioInDb(
  idPesquisa: number,
  isBloqueada: boolean,
  motivo?: string,
): Promise<SurveyRecord> {
  const params = new URLSearchParams({ is_bloqueada: String(isBloqueada) });
  if (motivo) params.set("motivo", motivo);
  const res = await fetch(`${API_PESQUISAS}/${idPesquisa}/bloqueio?${params.toString()}`, {
    method: "PATCH",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res, "Falha ao alterar bloqueio"));
  const data = (await res.json()) as BackendPesquisaOut;
  return mapBackendToSurveyRecord(data);
}

export async function fetchPesquisasAuxOptions(): Promise<PesquisasAuxOptions> {
  const [munRes, amoRes, profRes] = await Promise.all([
    fetch(`${API_PESQUISAS}/aux/municipios`, { headers: { Accept: "application/json" } }),
    fetch(`${API_PESQUISAS}/aux/amostras`, { headers: { Accept: "application/json" } }),
    fetch(`${API_PESQUISAS}/aux/profissionais`, { headers: { Accept: "application/json" } }),
  ]);
  if (!munRes.ok || !amoRes.ok || !profRes.ok) {
    throw new Error("Falha ao carregar tabelas auxiliares de pesquisas");
  }
  const [municipios, amostras, profissionais] = (await Promise.all([
    munRes.json(),
    amoRes.json(),
    profRes.json(),
  ])) as [
    readonly BackendMunicipioOut[],
    readonly BackendAmostraOut[],
    readonly BackendProfissionalOut[],
  ];
  return { municipios, amostras, profissionais };
}

export async function createAmostraInDb(payload: AmostraCreatePayload): Promise<AmostraCreatedOut> {
  const res = await fetch(`${API_AMOSTRAGEM}/amostras`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res, "Falha ao criar amostra"));
  return (await res.json()) as AmostraCreatedOut;
}

export async function fetchAtribuicoesFromDb(): Promise<readonly AtribuicaoOut[]> {
  const res = await fetch(`${API_CAMPO}/atribuicoes`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res, "Falha ao carregar atribuições"));
  return (await res.json()) as readonly AtribuicaoOut[];
}

export async function fetchCampoOpcoesFromDb(): Promise<CampoResumoOpcoesOut> {
  const res = await fetch(`${API_CAMPO}/resumo-opcoes`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res, "Falha ao carregar opções de campo"));
  const data = (await res.json()) as {
    profissionais?: readonly BackendProfissionalOut[];
    bairros?: readonly BackendBairroOut[];
  };
  return {
    profissionais: data.profissionais ?? [],
    bairros: data.bairros ?? [],
  };
}

export async function createAtribuicaoInDb(
  payload: AtribuicaoCreatePayload,
): Promise<AtribuicaoOut> {
  const res = await fetch(`${API_CAMPO}/atribuicoes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res, "Falha ao atribuir pesquisador"));
  return (await res.json()) as AtribuicaoOut;
}

export async function deleteAtribuicaoInDb(idAtribuicao: number): Promise<void> {
  const res = await fetch(`${API_CAMPO}/atribuicoes/${idAtribuicao}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res, "Falha ao remover atribuição"));
}

export async function checkDbHealth(): Promise<DbHealthInfo> {
  const res = await fetch(`${API_PESQUISAS}/database/health`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Falha HTTP ${res.status}`);
  return (await res.json()) as DbHealthInfo;
}
