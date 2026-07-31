import { describe, expect, it } from 'vitest';
import { chavePixValida, cpfValido, telefoneValido } from './kyc-validate';

describe('kyc-validate', () => {
  it('valida CPF com dígitos verificadores', () => {
    expect(cpfValido('529.982.247-25')).toBe(true);
    expect(cpfValido('11111111111')).toBe(false);
    expect(cpfValido('123')).toBe(false);
  });

  it('valida telefone BR', () => {
    expect(telefoneValido('11999990000')).toBe(true);
    expect(telefoneValido('(11) 99999-0000')).toBe(true);
    expect(telefoneValido('123')).toBe(false);
  });

  it('valida chave Pix', () => {
    expect(chavePixValida('a@b.com')).toBe(true);
    expect(chavePixValida('52998224725')).toBe(true);
    expect(chavePixValida('11999990000')).toBe(true);
    expect(chavePixValida('x')).toBe(false);
  });
});
