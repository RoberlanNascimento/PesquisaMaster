import type { MunicipalRegionRecord, NeighborhoodItem, UrbanZoneType } from "./regionsData";

export async function fetchNeighborhoodsWithRegions(): Promise<MunicipalRegionRecord[] | null> {
  const [regData, nbData] = (await Promise.all([
    fetch("http://127.0.0.1:8000/api/v1/regioes").then((r) => (r.ok ? r.json() : null)),
    fetch("http://127.0.0.1:8000/api/v1/bairros").then((r) => (r.ok ? r.json() : null)),
  ])) as [Array<Record<string, unknown>> | null, Array<Record<string, unknown>> | null];

  if (!regData || !Array.isArray(regData) || regData.length === 0) return null;

  const nbByReg = new Map<string, NeighborhoodItem[]>();
  if (nbData && Array.isArray(nbData)) {
    nbData.forEach((row) => {
      const regKey = `reg-${row.id_regiao_zona ?? 1}`;
      const list = nbByReg.get(regKey) ?? [];
      list.push({
        id: `nb-db-${row.id_bairro}`,
        id_bairro: Number(row.id_bairro),
        code: String(row.codigo_bairro_ibge ?? `BAIRRO-${row.id_bairro}`),
        name: String(row.nome_bairro ?? "Bairro"),
        ibgeCensusSectorPrefix: String(row.codigo_bairro_ibge ?? "15055360000"),
        predominantIncomeBracket: `R$ ${Number(row.renda_media_domiciliar ?? 2500).toFixed(0)}`,
        estimatedVoters: Number(row.eleitorado_total ?? 15000),
        electoralWeightPct: "5.0000",
      });
      nbByReg.set(regKey, list);
    });
  }

  return regData.map((row, idx) => {
    const sigla = String(row.sigla ?? `R${idx + 1}`);
    const uf = String(row.uf ?? "PA");
    const regId = `reg-${row.id_regiao_zona}`;
    const zoneVal: UrbanZoneType = sigla.includes("S")
      ? "ZONA_SUL"
      : sigla.includes("N")
        ? "ZONA_NORTE"
        : sigla.includes("L")
          ? "ZONA_LESTE"
          : sigla.includes("O")
            ? "ZONA_OESTE"
            : "ZONA_CENTRAL";
    return {
      id: regId,
      id_regiao_zona: Number(row.id_regiao_zona),
      countryId: "country-br",
      stateId: `state-${uf.toLowerCase()}`,
      municipalityId: `mun-${row.id_municipio ?? 1}`,
      code: `REG-${uf}-${sigla}`,
      name: String(row.nome_regiao ?? ""),
      cityName: String(row.municipio_nome ?? "Parauapebas"),
      uf,
      masterPlanZone: zoneVal,
      masterPlanLawRef: String(row.descricao ?? "Plano Diretor Municipal"),
      electorateTotal: 45000,
      electorateWeightPct: "10.0000",
      censusSectorsCount: 40,
      isActive: Boolean(row.ativo ?? true),
      neighborhoods: nbByReg.get(regId) ?? [],
    };
  });
}

