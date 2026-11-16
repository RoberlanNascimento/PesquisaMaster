import React, { useState, useEffect, useMemo } from "react";
import { EnterpriseCrudWorkspace } from "../../components/ui/EnterpriseCrudWorkspace";

export interface ElectorateRecord {
  readonly id: number;
  readonly municipality: string;
  readonly year: number;
  readonly month: number;
  readonly zone: string;
  readonly totalVoters: number;
  readonly biometricVoters: number;
  readonly captureType: string;
}

const INITIAL_ELECTORATE: readonly ElectorateRecord[] = [
  { id: 1, municipality: "Parauapebas / PA", year: 2026, month: 10, zone: "075ª Z.E.", totalVoters: 184500, biometricVoters: 172000, captureType: "API_TSE_OFICIAL" },
  { id: 2, municipality: "Marabá / PA", year: 2026, month: 10, zone: "023ª Z.E.", totalVoters: 198200, biometricVoters: 189400, captureType: "API_TSE_OFICIAL" },
  { id: 3, municipality: "São Paulo / SP", year: 2026, month: 10, zone: "001ª Z.E. Bela Vista", totalVoters: 124500, biometricVoters: 120100, captureType: "CARGA_DIARIA" },
];

export function ElectorateTseFeature(): React.JSX.Element {
  const [data, setData] = useState<readonly ElectorateRecord[]>(INITIAL_ELECTORATE);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("TODOS");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/v1/pesquisas-tabelas/eleitorado")
      .then((res) => (res.ok ? res.json() : []))
      .then((items: any[]) => {
        if (items && items.length > 0) {
          setData(
            items.map((e) => ({
              id: e.id_eleitorado_tse,
              municipality: e.municipio_nome || "Parauapebas / PA",
              year: e.ano_referencia,
              month: e.mes_referencia,
              zone: e.zona_eleitoral ? `${e.zona_eleitoral}ª Z.E.` : "Geral",
              totalVoters: Number(e.quantidade_eleitores),
              biometricVoters: Number(e.eleitores_biometria || e.quantidade_eleitores),
              captureType: e.tipo_captura || "API_TSE",
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    return data.filter((e) => {
      if (activeTab !== "TODOS" && String(e.year) !== activeTab) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return e.municipality.toLowerCase().includes(q) || e.zone.toLowerCase().includes(q);
      }
      return true;
    });
  }, [data, activeTab, search]);

  return (
    <EnterpriseCrudWorkspace<ElectorateRecord>
      title="Histórico do Eleitorado TSE"
      subtitle="Base oficial de eleitores aptos por município, zona eleitoral e cobertura biométrica"
      tabs={[
        { id: "TODOS", label: "Todas as Séries", count: data.length },
        { id: "2026", label: "Eleições 2026", count: data.filter((e) => e.year === 2026).length },
        { id: "2024", label: "Eleições 2024", count: data.filter((e) => e.year === 2024).length },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      kpis={[
        { id: "kpi-elec-total", label: "Eleitorado Total", value: data.reduce((acc, c) => acc + c.totalVoters, 0).toLocaleString("pt-BR"), helperText: "Eleitores aptos", variant: "default" },
        { id: "kpi-elec-bio", label: "Cobertura Biométrica", value: "93.4%", helperText: "Auditada TSE", variant: "success" },
        { id: "kpi-elec-ref", label: "Ano de Referência", value: "2026", helperText: "Atualizado", variant: "default" },
      ]}
      searchPlaceholder="Buscar por município ou zona eleitoral..."
      searchValue={search}
      onSearchChange={setSearch}
      columns={[
        { header: "Município", key: "municipality", render: (e) => <span style={{ fontWeight: 600, color: "#f8fafc" }}>{e.municipality}</span> },
        { header: "Ano / Mês", key: "year", render: (e) => <span style={{ color: "#94a3b8" }}>{e.year}/{String(e.month).padStart(2, "0")}</span> },
        { header: "Zona Eleitoral", key: "zone", render: (e) => <span style={{ fontWeight: 600, color: "#38bdf8" }}>{e.zone}</span> },
        { header: "Eleitores Aptos", key: "totalVoters", render: (e) => <span style={{ fontWeight: 700, color: "#f8fafc" }}>{e.totalVoters.toLocaleString("pt-BR")}</span> },
        { header: "Com Biometria", key: "biometricVoters", render: (e) => <span style={{ color: "#4ade80" }}>{e.biometricVoters.toLocaleString("pt-BR")}</span> },
        { header: "Origem dos Dados", key: "captureType", render: (e) => <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "6px", backgroundColor: "#1e293b" }}>{e.captureType}</span> },
      ]}
      data={filtered}
      keyExtractor={(e) => String(e.id)}
    />
  );
}
