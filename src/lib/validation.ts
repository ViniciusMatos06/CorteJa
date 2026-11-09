// Validações do formulário público. O banco repete todas elas
// (request_appointment), então isto serve apenas para dar feedback rápido.

export interface ClientFields {
  name: string
  whatsapp: string
  address: string
}

export type ClientErrors = Partial<Record<keyof ClientFields, string>>

export function validateClient(fields: ClientFields): ClientErrors {
  const errors: ClientErrors = {}
  const name = fields.name.trim().replace(/\s+/g, ' ')
  const digits = fields.whatsapp.replace(/\D/g, '')
  const address = fields.address.trim()

  if (name.length < 3) errors.name = 'Informe seu nome completo.'
  else if (!name.includes(' ')) errors.name = 'Informe nome e sobrenome.'
  else if (name.length > 120) errors.name = 'Nome muito longo.'

  if (digits.length < 10 || digits.length > 11 || digits[0] === '0') {
    errors.whatsapp = 'Informe um WhatsApp válido com DDD.'
  }

  if (address.length < 8) errors.address = 'Informe rua, número e bairro.'
  else if (address.length > 300) errors.address = 'Endereço muito longo.'

  return errors
}
