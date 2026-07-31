/** Validação KYC BR (CPF + telefone + Pix) — sem dependências externas. */

export function soDigitos(s: string): string {
  return s.replace(/\D/g, '');
}

/** Valida CPF (11 dígitos + dígitos verificadores). */
export function cpfValido(cpfRaw: string): boolean {
  const cpf = soDigitos(cpfRaw);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(cpf[i]) * (10 - i);
  let d1 = (sum * 10) % 11;
  if (d1 === 10) d1 = 0;
  if (d1 !== Number(cpf[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(cpf[i]) * (11 - i);
  let d2 = (sum * 10) % 11;
  if (d2 === 10) d2 = 0;
  return d2 === Number(cpf[10]);
}

/** Telefone BR: 10 ou 11 dígitos (DDD + número). */
export function telefoneValido(telRaw: string): boolean {
  const t = soDigitos(telRaw);
  return t.length === 10 || t.length === 11;
}

/**
 * Chave Pix: e-mail, telefone (+55…), CPF (11), CNPJ (14) ou EVP (UUID-like).
 */
export function chavePixValida(chaveRaw: string): boolean {
  const chave = chaveRaw.trim();
  if (!chave || chave.length > 77) return false;
  if (chave.includes('@') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(chave)) return true;
  const dig = soDigitos(chave);
  if (dig.length === 11 && cpfValido(dig)) return true;
  if (dig.length === 14) return true;
  if (dig.length >= 10 && dig.length <= 13) return true; // telefone
  // EVP aleatória
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chave)) {
    return true;
  }
  return chave.length >= 8;
}

export function formatarCpfDisplay(cpf: string): string {
  const d = soDigitos(cpf);
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}
