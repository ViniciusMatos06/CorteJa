// Validações do formulário público. O banco repete todas elas
// (request_appointment), então isto serve apenas para dar feedback rápido.
import { UFS, type AddressFields } from './address'

export interface ClientFields extends AddressFields {
  name: string
  whatsapp: string
}

export type ClientErrors = Partial<Record<keyof ClientFields, string>>

const clean = (s: string) => s.trim().replace(/\s+/g, ' ')

export function validateClient(fields: ClientFields): ClientErrors {
  const errors: ClientErrors = {}
  const name = clean(fields.name)
  const digits = fields.whatsapp.replace(/\D/g, '')

  if (name.length < 3) errors.name = 'Informe seu nome completo.'
  else if (!name.includes(' ')) errors.name = 'Informe nome e sobrenome.'
  else if (name.length > 120) errors.name = 'Nome muito longo.'

  if (digits.length < 10 || digits.length > 11 || digits[0] === '0') {
    errors.whatsapp = 'Informe um WhatsApp válido com DDD.'
  }

  if (fields.cep.replace(/\D/g, '').length !== 8) errors.cep = 'Informe o CEP com 8 números.'

  const street = clean(fields.street)
  if (street.length < 2) errors.street = 'Informe a rua.'
  else if (street.length > 150) errors.street = 'Nome da rua muito longo.'

  const number = clean(fields.number)
  if (!number) errors.number = 'Informe o número ou S/N.'
  else if (number.length > 20) errors.number = 'Número muito longo.'

  if (clean(fields.complement).length > 80) errors.complement = 'Complemento muito longo.'

  const hood = clean(fields.neighborhood)
  if (hood.length < 2) errors.neighborhood = 'Informe o bairro.'
  else if (hood.length > 80) errors.neighborhood = 'Bairro muito longo.'

  const city = clean(fields.city)
  if (city.length < 2) errors.city = 'Informe a cidade.'
  else if (city.length > 80) errors.city = 'Cidade muito longa.'

  if (!(UFS as readonly string[]).includes(fields.state.trim().toUpperCase())) errors.state = 'Escolha o estado.'

  return errors
}
