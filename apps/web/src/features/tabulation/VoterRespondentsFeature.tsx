import React, { useState, useEffect, useMemo } from "react";
import { EnterpriseCrudWorkspace } from "../../components/ui/EnterpriseCrudWorkspace";

export interface PersonRecord {
  readonly id: number;
  readonly name: string;
  readonly gender: string;
  readonly ageGroup: string;
  readonly education: string;
  readonly income: string;
  readonly religion: string;
  readonly district: string;
  readonly region: string;
}

const INITIAL_PEOPLE: readonly PersonRecord[] = [
  { id: 1, name: "Entrevistado Anonimizado #001", gender: "Feminino", ageGroup: "25 a 34 anos", education: "Superior Completo", income: "3 a 5 SM", religion: "Católica", district: "Centro", region: "Urbana" },
  { id: 2, name: "Entrevistado Anonimizado #002", gender: "Masculino", ageGroup: "35 a 44 anos", education: "Médio Completo", income: "1 a 2 SM", religion: "Evangélica", district: "Cidade Nova", region: "Urbana" },
  { id: 3, name: "Entrevistado Anonimizado #003", gender: "Feminino", ageGroup: "45 a 59 anos", education: "Fundamental", income: "Até 1 SM", religion: "Outras", district: "Bairro da Paz", region: "Periférica" },
  { id: 4, name: "Entrevistado Anonimizado #004", gender: "Masculino", ageGroup: "16 a 24 anos", education: "Médio Incompleto", income: "1 a 2 SM", religion: "Sem Religião", district: "Nova Marabá", region: "Urbana" },
];

export function VoterRespondentsFeature(): React.JSX.Element {
  const [people, setPeople] = useState<readonly PersonRecord[]>(INITIAL_PEOPLE);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("TODOS");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/v1/pesquisas-tabelas/pessoas")
      .then((res) => (res.ok ? res.json() : []))
      .then((items: any[]) => {
        if (items && items.length > 0) {
          setPeople(
            items.map((p) => ({
              id: p.id_pessoa,
              name: p.nome || `Eleitor Registrado #${p.id_pessoa}`,
              gender: p.sexo,
              ageGroup: p.faixa_etaria,
              education: p.escolaridade,
              income: p.faixa_renda,
              religion: p.religiao || "Não declarada",
              district: p.bairro_distrito,
              region: p.regiao_geografica,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    return people.filter((p) => {
      if (activeTab === "FEMININO" && p.gender !== "Feminino") return false;
      if (activeTab === "MASCULINO" && p.gender !== "Masculino") return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.district.toLowerCase().includes(q) || p.education.toLowerCase().includes(q);
      }
      return true;
    });
  }, [people, activeTab, search]);

  return (
    <EnterpriseCrudWorkspace<PersonRecord>
      title="Ficha do Eleitor & Cadastro de Respondentes"
      subtitle="Base anonimizada de eleitores entrevistados em campo com perfil sociodemográfico auditado"
      tabs={[
        { id: "TODOS", label: "Todos os Eleitores", count: people.length },
        { id: "FEMININO", label: "Mulheres (Cota F)", count: people.filter((p) => p.gender === "Feminino").length },
        { id: "MASCULINO", label: "Homens (Cota M)", count: people.filter((p) => p.gender === "Masculino").length },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      kpis={[
        { id: "kpi-voter-total", label: "Eleitores Cadastrados", value: people.length, helperText: "Tabela pessoas", variant: "default" },
        { id: "kpi-voter-lgpd", label: "Anonimização LGPD", value: "Ativa", helperText: "Blindagem de dados", variant: "success" },
        { id: "kpi-voter-districts", label: "Bairros Cobertos", value: new Set(people.map((p) => p.district)).size, helperText: "Distribuição", variant: "default" },
      ]}
      searchPlaceholder="Buscar por código, bairro ou escolaridade..."
      searchValue={search}
      onSearchChange={setSearch}
      columns={[
        { header: "Identificador", key: "name", render: (p) => <span style={{ fontWeight: 600, color: "#f8fafc" }}>{p.name}</span> },
        { header: "Sexo", key: "gender", render: (p) => <span style={{ color: p.gender === "Feminino" ? "#f472b6" : "#60a5fa" }}>{p.gender}</span> },
        { header: "Faixa Etária", key: "ageGroup", render: (p) => <span>{p.ageGroup}</span> },
        { header: "Escolaridade", key: "education", render: (p) => <span style={{ color: "#94a3b8" }}>{p.education}</span> },
        { header: "Renda", key: "income", render: (p) => <span style={{ color: "#facc15" }}>{p.income}</span> },
        { header: "Bairro / Distrito", key: "district", render: (p) => <span style={{ fontWeight: 600 }}>{p.district}</span> },
        { header: "Região", key: "region", render: (p) => <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "6px", backgroundColor: "#1e293b" }}>{p.region}</span> },
      ]}
      data={filtered}
      keyExtractor={(p) => String(p.id)}
    />
  );
}
