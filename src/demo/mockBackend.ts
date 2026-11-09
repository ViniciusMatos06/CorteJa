// =============================================================================
// MODO DEMONSTRAÇÃO
// Intercepta as chamadas do supabase-js e responde com um "banco" em memória
// que reproduz as regras de supabase/schema.sql. Só é incluído no build quando
// VITE_DEMO_MODE=true — nunca vai para o build de produção.
// =============================================================================
import type { Appointment, BlockedSlot, BreakRule, BusinessSettings, Service } from '@/types'
import { addDays, todayIn } from '@/lib/format'
import { EMPTY_ADDRESS, UFS, formatAddress, type AddressFields } from '@/lib/address'

const TZ = 'America/Sao_Paulo'
const today = todayIn(TZ)
const uid = () => crypto.randomUUID()

// ---------------------------------------------------------------- "tabelas"
const db = {
  settings: {
    id: 1, business_name: 'Cabeleireiro a Domicílio', timezone: TZ, work_days: [1, 2, 3, 4, 5, 6],
    day_start: '09:00:00', day_end: '19:00:00', slot_minutes: 60, min_notice_minutes: 60, booking_window_days: 30,
  } as BusinessSettings,
  services: [
    { id: uid(), name: 'Corte masculino', description: 'Tesoura e/ou máquina com finalização', price: 70, active: true, sort_order: 0 },
    { id: uid(), name: 'Corte feminino', description: 'Corte com lavagem e finalização', price: 80, active: true, sort_order: 1 },
    { id: uid(), name: 'Corte infantil', description: 'Para crianças até 12 anos', price: 70, active: true, sort_order: 2 },
  ] as Service[],
  breaks: [{ id: uid(), label: 'Almoço', weekday: null, start_time: '12:00:00', end_time: '13:00:00' }] as BreakRule[],
  blocks: [] as BlockedSlot[],
  appointments: [] as Appointment[],
}

function nextWorkday(from: string, skip = 0) {
  let d = from
  let found = -1
  for (let i = 0; i < 60; i++) {
    d = addDays(d, 1)
    if (db.settings.work_days.includes(new Date(d + 'T12:00').getDay()) && ++found === skip) return d
  }
  return d
}

function seed() {
  const mk = (name: string, phone: string, address: [string, string, string], svc: Service, date: string, start: string, status: Appointment['status']): Appointment => ({
    id: uid(), client_name: name, client_whatsapp: phone,
    ...addressColumns({ ...EMPTY_ADDRESS, cep: '30000000', street: address[0], number: address[1], neighborhood: address[2], city: 'Belo Horizonte', state: 'MG' }),
    service_id: svc.id, service_name: svc.name, service_price: svc.price,
    appointment_date: date, start_time: start, end_time: `${String(Number(start.slice(0, 2)) + 1).padStart(2, '0')}:00:00`,
    status, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  })
  const [masculino, feminino, infantil] = db.services
  db.appointments.push(
    mk('Exemplo — Cliente A', '5531900000001', ['Rua Exemplo', '100', 'Centro'], feminino, nextWorkday(today, 0), '10:00:00', 'pending'),
    mk('Exemplo — Cliente B', '5531900000002', ['Av. Demonstração', '250', 'Savassi'], masculino, nextWorkday(today, 0), '15:00:00', 'confirmed'),
    mk('Exemplo — Cliente C', '5531900000003', ['Rua Fictícia', '42', 'Lourdes'], infantil, nextWorkday(today, 1), '09:00:00', 'confirmed'),
  )
  db.blocks.push({ id: uid(), block_date: nextWorkday(today, 4), start_time: null, end_time: null, reason: 'Folga (exemplo)' })
}
seed()

// ---------------------------------------------------------------- regras (espelho do SQL)
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}:00`
const overlaps = (a1: number, a2: number, b1: number, b2: number) => a1 < b2 && a2 > b1

function nowMinutesSP() {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())
  return toMin(p)
}

function getAvailableSlots(date: string) {
  const s = db.settings
  const dow = new Date(date + 'T12:00').getDay()
  if (date < today || date > addDays(today, s.booking_window_days) || !s.work_days.includes(dow)) return []
  if (db.blocks.some((b) => b.block_date === date && !b.start_time)) return []
  const out: { slot_start: string; slot_end: string }[] = []
  const len = s.slot_minutes
  // minutos desde o início de hoje até o início do dia escolhido
  const dayOffset = Math.round((new Date(date + 'T12:00').getTime() - new Date(today + 'T12:00').getTime()) / 86_400_000) * 1440
  const threshold = nowMinutesSP() + s.min_notice_minutes
  for (let st = toMin(s.day_start); st + len <= toMin(s.day_end); st += len) {
    const en = st + len
    if (dayOffset + st < threshold) continue
    if (db.breaks.some((b) => (b.weekday == null || b.weekday === dow) && overlaps(st, en, toMin(b.start_time), toMin(b.end_time)))) continue
    if (db.blocks.some((b) => b.block_date === date && b.start_time && overlaps(st, en, toMin(b.start_time), toMin(b.end_time!)))) continue
    if (db.appointments.some((a) => a.appointment_date === date && (a.status === 'pending' || a.status === 'confirmed') && overlaps(st, en, toMin(a.start_time), toMin(a.end_time)))) continue
    out.push({ slot_start: toTime(st), slot_end: toTime(en) })
  }
  return out
}

class PgError extends Error {
  constructor(message: string, public code = 'P0001', public hint?: string) { super(message) }
}

/** Colunas do endereço como o banco grava (espelho de request_appointment). */
function addressColumns(a: AddressFields) {
  const clean = (s: string) => s.trim().replace(/\s+/g, ' ')
  const parts = {
    cep: a.cep.replace(/\D/g, ''), street: clean(a.street), number: clean(a.number), complement: clean(a.complement),
    neighborhood: clean(a.neighborhood), city: clean(a.city), state: a.state.trim().toUpperCase(),
  }
  return {
    client_address: formatAddress(parts),
    address_cep: parts.cep, address_street: parts.street, address_number: parts.number,
    address_complement: parts.complement || null, address_neighborhood: parts.neighborhood,
    address_city: parts.city, address_state: parts.state,
  }
}

function requestAppointment(p: Record<string, string>) {
  const name = (p.p_client_name ?? '').trim().replace(/\s+/g, ' ')
  let phone = (p.p_client_whatsapp ?? '').replace(/\D/g, '')
  const addr = addressColumns({
    cep: p.p_address_cep ?? '', street: p.p_address_street ?? '', number: p.p_address_number ?? '',
    complement: p.p_address_complement ?? '', neighborhood: p.p_address_neighborhood ?? '',
    city: p.p_address_city ?? '', state: p.p_address_state ?? '',
  })
  if (name.length < 3) throw new PgError('Informe seu nome completo.')
  if (phone.length === 10 || phone.length === 11) phone = '55' + phone
  if (!/^55[1-9][0-9]{9,10}$/.test(phone)) throw new PgError('Informe um WhatsApp válido com DDD.')
  const len = (s: string | null, min: number, max: number) => (s ?? '').length >= min && (s ?? '').length <= max
  if (!/^[0-9]{8}$/.test(addr.address_cep)) throw new PgError('Informe um CEP válido com 8 números.')
  if (!len(addr.address_street, 2, 150)) throw new PgError('Informe a rua do atendimento.')
  if (!len(addr.address_number, 1, 20)) throw new PgError('Informe o número (ou S/N).')
  if (!len(addr.address_complement, 0, 80)) throw new PgError('Complemento muito longo.')
  if (!len(addr.address_neighborhood, 2, 80)) throw new PgError('Informe o bairro.')
  if (!len(addr.address_city, 2, 80)) throw new PgError('Informe a cidade.')
  if (!(UFS as readonly string[]).includes(addr.address_state)) throw new PgError('Informe um estado (UF) válido.')
  const svc = db.services.find((s) => s.id === p.p_service_id && s.active)
  if (!svc) throw new PgError('O serviço selecionado não está disponível.')
  if (db.appointments.filter((a) => a.client_whatsapp === phone && a.status === 'pending' && a.appointment_date >= today).length >= 3)
    throw new PgError('Você já possui solicitações aguardando confirmação. Aguarde o retorno do cabeleireiro.')
  const slot = getAvailableSlots(p.p_date).find((s) => s.slot_start.slice(0, 5) === p.p_start_time.slice(0, 5))
  if (!slot) throw new PgError('Este horário não está mais disponível. Escolha outro horário.', 'P0001', 'SLOT_UNAVAILABLE')
  const now = new Date().toISOString()
  const a: Appointment = {
    id: uid(), client_name: name, client_whatsapp: phone, ...addr,
    service_id: svc.id, service_name: svc.name, service_price: svc.price,
    appointment_date: p.p_date, start_time: slot.slot_start, end_time: slot.slot_end,
    status: 'pending', created_at: now, updated_at: now,
  }
  db.appointments.push(a)
  return a.id
}

// ---------------------------------------------------------------- mini PostgREST
type Row = Record<string, unknown>

function applyFilters(rows: Row[], params: URLSearchParams) {
  let out = [...rows]
  for (const [key, raw] of params) {
    if (['select', 'order', 'limit', 'columns'].includes(key)) continue
    const dot = raw.indexOf('.')
    const op = raw.slice(0, dot)
    const val = raw.slice(dot + 1)
    out = out.filter((r) => {
      const v = r[key] as string | number | boolean | null
      switch (op) {
        case 'eq': return String(v) === val
        case 'gte': return v != null && String(v) >= val
        case 'lte': return v != null && String(v) <= val
        case 'in': return val.replace(/[()]/g, '').split(',').map((x) => x.replace(/"/g, '')).includes(String(v))
        default: return true
      }
    })
  }
  const order = params.get('order')
  if (order) {
    const keys = order.split(',').map((o) => o.split('.')[0]).reverse()
    for (const k of keys) out.sort((a, b) => String(a[k] ?? '').localeCompare(String(b[k] ?? ''), undefined, { numeric: true }))
  }
  const limit = params.get('limit')
  if (limit) out = out.slice(0, Number(limit))
  return out
}

const TABLES: Record<string, () => Row[]> = {
  business_settings: () => [db.settings as unknown as Row],
  services: () => db.services as unknown as Row[],
  breaks: () => db.breaks as unknown as Row[],
  blocked_slots: () => db.blocks as unknown as Row[],
  appointments: () => db.appointments as unknown as Row[],
}

function setTable(name: string, rows: Row[]) {
  if (name === 'services') db.services = rows as unknown as Service[]
  if (name === 'breaks') db.breaks = rows as unknown as BreakRule[]
  if (name === 'blocked_slots') db.blocks = rows as unknown as BlockedSlot[]
  if (name === 'appointments') db.appointments = rows as unknown as Appointment[]
}

const TRANSITIONS: Record<string, string[]> = { pending: ['confirmed', 'declined'], confirmed: ['cancelled'] }

function json(body: unknown, status = 200) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json' },
  })
}

const DEMO_USER = { id: 'demo-admin', email: 'cabeleireiro@demo', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() }
const session = () => ({
  access_token: 'demo-token', refresh_token: 'demo-refresh', token_type: 'bearer',
  expires_in: 3600 * 24, expires_at: Math.floor(Date.now() / 1000) + 3600 * 24, user: DEMO_USER,
})

async function handle(url: URL, init: RequestInit = {}, headers: Headers): Promise<Response> {
  const method = (init.method ?? 'GET').toUpperCase()
  const body = typeof init.body === 'string' && init.body ? JSON.parse(init.body) : undefined
  const path = url.pathname

  // Auth
  if (path.startsWith('/auth/v1/token')) {
    if (!body?.email || !body?.password) return json({ error: 'invalid_grant', error_description: 'Invalid login credentials', msg: 'Invalid login credentials' }, 400)
    return json(session())
  }
  if (path.startsWith('/auth/v1/user')) return json(DEMO_USER)
  if (path.startsWith('/auth/v1/logout')) return json(undefined, 204)

  // RPC
  if (path.startsWith('/rest/v1/rpc/')) {
    const fn = path.split('/').pop()
    try {
      if (fn === 'get_available_slots') return json(getAvailableSlots(body.p_date))
      if (fn === 'get_available_dates') {
        const dates: string[] = []
        for (let d = body.p_from; d <= body.p_to; d = addDays(d, 1)) if (getAvailableSlots(d).length) dates.push(d)
        return json(dates)
      }
      if (fn === 'request_appointment') return json(requestAppointment(body))
      if (fn === 'is_admin') return json(true)
    } catch (e) {
      const err = e as PgError
      return json({ message: err.message, code: err.code, hint: err.hint ?? null, details: null }, 400)
    }
    return json({ message: 'função desconhecida' }, 404)
  }

  // Tabelas
  const table = path.replace('/rest/v1/', '')
  const getter = TABLES[table]
  if (!getter) return json({ message: 'tabela desconhecida' }, 404)
  const params = url.searchParams
  const single = headers.get('Accept')?.includes('vnd.pgrst.object')

  if (method === 'GET') {
    const rows = applyFilters(getter(), params)
    return json(single ? rows[0] : rows)
  }

  if (method === 'POST') {
    const items = (Array.isArray(body) ? body : [body]).map((r: Row) => ({ id: uid(), created_at: new Date().toISOString(), ...r }))
    setTable(table, [...getter(), ...items])
    return json(undefined, 201)
  }

  if (method === 'PATCH') {
    if (table === 'business_settings') {
      db.settings = { ...db.settings, ...body }
      return json(undefined, 204)
    }
    const targets = new Set(applyFilters(getter(), params).map((r) => r.id))
    try {
      setTable(table, getter().map((r) => {
        if (!targets.has(r.id)) return r
        if (table === 'appointments') {
          if (body.status !== r.status && !TRANSITIONS[r.status as string]?.includes(body.status))
            throw new PgError(`Mudança de status não permitida (${r.status} → ${body.status}).`)
          return { ...r, status: body.status, updated_at: new Date().toISOString() }
        }
        return { ...r, ...body }
      }))
    } catch (e) {
      return json({ message: (e as Error).message, code: 'P0001' }, 400)
    }
    return json(undefined, 204)
  }

  if (method === 'DELETE') {
    const targets = new Set(applyFilters(getter(), params).map((r) => r.id))
    setTable(table, getter().filter((r) => !targets.has(r.id)))
    return json(undefined, 204)
  }

  return json({ message: 'método não suportado' }, 405)
}

export const DEMO_SUPABASE_URL = 'https://demo.supabase.local'

export function installMockBackend() {
  const realFetch = window.fetch.bind(window)
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
    if (url.origin !== DEMO_SUPABASE_URL) return realFetch(input, init)
    await new Promise((r) => setTimeout(r, 180)) // latência simulada para mostrar os estados de carregamento
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined))
    return handle(url, init, headers)
  }
}
