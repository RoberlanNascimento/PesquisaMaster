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

function normalizeGender(raw: unknown): "Feminino" | "Masculino" | "Não informado" {
  const val = String(raw ?? "").trim().toLowerCase();
  if (val === "f" || val === "feminino" || val === "mulher") return "Feminino";
  if (val === "m" || val === "masculino" || val === "homem") return "Masculino";
  return "Não informado";
}

export function VoterRespondentsFeature(): React.JSX.Element {
  const [people, setPeople] = useState<readonly PersonRecord[]>([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("TODOS");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/v1/pesquisas-tabelas/pessoas", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then((items: unknown) => {
        if (Array.isArray(items)) {
          setPeople(
            items.map((p: any) => ({
              id: Number(p.id_pessoa ?? 0),
              name: `Entrevistado #${p.id_pessoa ?? "?"}`,
              gender: normalizeGender(p.sexo),
              ageGroup: String(p.faixa_etaria || "Não informada"),
              education: String(p.escolaridade || "Não informada"),
              income: String(p.faixa_renda || "Não informada"),
              religion: String(p.religiao || "Não declarada"),
              district: String(p.bairro_distrito || "Não informado"),
              region: String(p.regiao_geografica || "Não informada"),
            }))
          );
        } else {
          setPeople([]);
        }
      })
      .catch(() => setPeople([]));
  }, []);

  const filtered = useMemo(() => {
    return people.filter((p) => {
      if (activeTab === "FEMININO" && p.gender !== "Feminino") return false;
      if (activeTab === "MASCULINO" && p.gender !== "Masculino") return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.district.toLowerCase().includes(q) ||
          p.education.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [people, activeTab, search]);

  const distinctDistricts = useMemo(
    () => new Set(people.map((p) => p.district).filter((d) => d && d !== "Não informado")).size,
    [people]
  );

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
        { id: "kpi-voter-lgpd", label: "Anonimização LGPD", value: "Ativa", helperText: "Identificação mascarada", variant: "success" },
        { id: "kpi-voter-districts", label: "Bairros Cobertos", value: distinctDistricts, helperText: "Distribuição", variant: "default" },
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
