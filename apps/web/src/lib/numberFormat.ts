

/** Formata inteiros no padrão brasileiro com separador de milhares (ex: 1045522 -> "1.045.522"). */
export function formatIntegerPtBr(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("pt-BR");
}

/** Remove separadores e retorna apenas dígitos para estado/envio à API. */
export function parseIntegerDigits(value: string): string {
  return value.replace(/\D/g, "");
}
