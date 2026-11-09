// Endereço do atendimento em partes, com preenchimento automático pelo CEP.
// O banco (request_appointment) valida tudo de novo e monta o texto completo
// no mesmo formato de formatAddress().

export interface AddressFields {
  cep: string
  street: string
  number: string
  complement: string
  neighborhood: string
  city: string
  state: string
}

export const EMPTY_ADDRESS: AddressFields = {
  cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '',
}

export const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const

/** 00000-000 enquanto o usuário digita. */
export function maskCep(value: string) {
  const d = value.replace(/\D/g, '').slice(0, 8)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

const clean = (s: string) => s.trim().replace(/\s+/g, ' ')

/** Texto completo: "Rua X, 10 - Apto 2 - Bairro, Cidade - UF, CEP 00000-000". Partes vazias são omitidas. */
export function formatAddress(a: AddressFields) {
  const cep = a.cep.replace(/\D/g, '')
  const line1 = [clean(a.street), clean(a.number)].filter(Boolean).join(', ')
  const parts = [line1, clean(a.complement), clean(a.neighborhood)].filter(Boolean).join(' - ')
  const cityUf = [clean(a.city), a.state.trim().toUpperCase()].filter(Boolean).join(' - ')
  return [parts, cityUf, cep.length === 8 ? `CEP ${maskCep(cep)}` : ''].filter(Boolean).join(', ')
}

export type CepResult = Pick<AddressFields, 'street' | 'neighborhood' | 'city' | 'state'>

/**
 * Consulta o CEP no ViaCEP (serviço público e gratuito, sem chave).
 * Retorna null se o CEP não existir; lança erro se o serviço não responder.
 */
export async function lookupCep(cep: string, signal?: AbortSignal): Promise<CepResult | null> {
  const digits = cep.replace(/\D/g, '')
  if (digits.length !== 8) return null
  const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`, { signal })
  if (res.status === 400) return null
  if (!res.ok) throw new Error('Falha ao consultar o CEP.')
  const data = (await res.json()) as {
    erro?: boolean | string; logradouro?: string; bairro?: string; localidade?: string; uf?: string
  }
  if (data.erro) return null
  return {
    street: data.logradouro ?? '',
    neighborhood: data.bairro ?? '',
    city: data.localidade ?? '',
    state: data.uf ?? '',
  }
}
