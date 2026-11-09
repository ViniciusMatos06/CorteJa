export const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
export const WEEKDAYS_LONG = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
export const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

/** "09:00:00" -> "09:00" */
export const hhmm = (time: string | null | undefined) => (time ? time.slice(0, 5) : '')

/** "2026-11-07" -> "sáb., 7 de novembro de 2026" */
export function formatDateLong(iso: string) {
  return parseISODate(iso).toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

/** "2026-11-07" -> "07/11/2026" */
export function formatDateShort(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export function formatCurrency(value: number | null | undefined) {
  if (value == null) return ''
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** Máscara de digitação: (31) 99999-9999 */
export function maskPhone(value: string) {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/** "5531999998888" -> "(31) 99999-8888" */
export function displayPhone(stored: string) {
  const local = stored.startsWith('55') && stored.length >= 12 ? stored.slice(2) : stored
  return maskPhone(local)
}

export function whatsappLink(stored: string, message?: string) {
  const text = message ? `?text=${encodeURIComponent(message)}` : ''
  return `https://wa.me/${stored.replace(/\D/g, '')}${text}`
}

// -------- datas sem fuso (YYYY-MM-DD) --------

export function parseISODate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function toISODate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addDays(iso: string, days: number) {
  const date = parseISODate(iso)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

/** Data de hoje no fuso do negócio (padrão America/Sao_Paulo). */
export function todayIn(timeZone = 'America/Sao_Paulo') {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}
