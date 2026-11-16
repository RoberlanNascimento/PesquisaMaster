import React, { useState } from "react";
import type { ClientCompanyRecord } from "../../lib/store";

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: "6px",
  border: "1px solid #cbd5e1",
  fontSize: "13px",
  boxSizing: "border-box",
};

const LABEL_STYLE: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  fontWeight: 600,
  marginBottom: "4px",
};

export function ClientCompanyForm({
  onSubmit,
}: {
  readonly onSubmit: (company: Omit<ClientCompanyRecord, "id">) => void;
}): React.JSX.Element {
  const [corporateName, setCorporateName] = useState<string>("");
  const [tradeName, setTradeName] = useState<string>("");
  const [cnpj, setCnpj] = useState<string>("");
  const [tseOriginFunds, setTseOriginFunds] =
    useState<ClientCompanyRecord["tseOriginFunds"]>("RECURSOS_PROPRIOS");
  const [legalRepresentative, setLegalRepresentative] = useState<string>("");
  const [contactEmail, setContactEmail] = useState<string>("");
  const [cityUf, setCityUf] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!corporateName.trim() || !cnpj.trim()) {
      setErrorMsg("Preencha ao menos a Razão Social e o CNPJ do contratante.");
      return;
    }
    setErrorMsg(null);
    onSubmit({
      corporateName: corporateName.trim(),
      tradeName: tradeName.trim() || corporateName.trim(),
      cnpj: cnpj.trim(),
      tseOriginFunds,
      legalRepresentative: legalRepresentative.trim() || "Não informado",
      contactEmail: contactEmail.trim() || "contato@empresa.com.br",
      cityUf: cityUf.trim() || "Brasília / DF",
    });

    setCorporateName("");
    setTradeName("");
    setCnpj("");
    setLegalRepresentative("");
    setContactEmail("");
    setCityUf("");
  };

  return (
    <form
      data-testid="form-client-company"
      onSubmit={handleSubmit}
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "12px",
        marginBottom: "18px",
        padding: "16px",
        backgroundColor: "#1b1c1c",
        borderRadius: "16px",
        border: "1px solid #353535",
      }}
    >
      <div>
        <label style={LABEL_STYLE}>Razão Social *</label>
        <input
          data-testid="input-corporate-name"
          type="text"
          placeholder="Ex: Instituto Brasil Dados Ltda"
          value={corporateName}
          onChange={(e) => setCorporateName(e.target.value)}
          style={INPUT_STYLE}
        />
      </div>

      <div>
        <label style={LABEL_STYLE}>Nome Fantasia</label>
        <input
          data-testid="input-trade-name"
          type="text"
          placeholder="Ex: Brasil Dados"
          value={tradeName}
          onChange={(e) => setTradeName(e.target.value)}
          style={INPUT_STYLE}
        />
      </div>

      <div>
        <label style={LABEL_STYLE}>CNPJ (Contratante PesqEle) *</label>
        <input
          data-testid="input-cnpj"
          type="text"
          placeholder="00.000.000/0001-00"
          value={cnpj}
          onChange={(e) => setCnpj(e.target.value)}
          style={INPUT_STYLE}
        />
      </div>

      <div>
        <label style={LABEL_STYLE}>Origem dos Recursos (TSE)</label>
        <select
          data-testid="select-origin-funds"
          value={tseOriginFunds}
          onChange={(e) =>
            setTseOriginFunds(e.target.value as ClientCompanyRecord["tseOriginFunds"])
          }
          style={INPUT_STYLE}
        >
          <option value="RECURSOS_PROPRIOS">Recursos Próprios</option>
          <option value="FUNDO_PARTIDARIO">Fundo Partidário</option>
          <option value="FEFC">FEFC (Fundo Especial de Campanha)</option>
        </select>
      </div>

      <div>
        <label style={LABEL_STYLE}>Representante Legal</label>
        <input
          data-testid="input-legal-rep"
          type="text"
          placeholder="Nome do responsável"
          value={legalRepresentative}
          onChange={(e) => setLegalRepresentative(e.target.value)}
          style={INPUT_STYLE}
        />
      </div>

      <div>
        <label style={LABEL_STYLE}>E-mail Corporativo / Nota Fiscal</label>
        <input
          data-testid="input-contact-email"
          type="email"
          placeholder="financeiro@cliente.com.br"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          style={INPUT_STYLE}
        />
      </div>

      <div>
        <label style={LABEL_STYLE}>Município / UF</label>
        <input
          data-testid="input-city-uf"
          type="text"
          placeholder="Ex: São Paulo / SP"
          value={cityUf}
          onChange={(e) => setCityUf(e.target.value)}
          style={INPUT_STYLE}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
        {errorMsg && (
          <span style={{ fontSize: "11px", color: "#e11d48", marginBottom: "4px" }}>
            {errorMsg}
          </span>
        )}
        <button
          data-testid="btn-submit-client-company"
          type="submit"
          style={{
            width: "100%",
            padding: "10px 14px",
            borderRadius: "10px",
            border: "none",
            backgroundColor: "#8ab4f8",
            color: "#003061",
            fontWeight: 600,
            fontSize: "13px",
            cursor: "pointer",
          }}
        >
          + Cadastrar Empresa Cliente
        </button>
      </div>
    </form>
  );
}

