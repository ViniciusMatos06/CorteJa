// Serviços do painel administrativo. Todas as consultas dependem de um
// usuário autenticado presente em admin_users (garantido pelo RLS).
import { isDemoMode, supabase } from '@/lib/supabase'
import { toAppError } from '@/lib/errors'
import type {
  Appointment, AppointmentStatus, BlockedSlot, BreakRule, BusinessSettings, Service,
} from '@/types'

// ---------------- Autenticação ----------------

export const BARBER_EMAIL = 'marciojvi@gmail.com'

export async function signIn(email: string, password: string) {
  if (!isDemoMode && email.trim().toLowerCase() !== BARBER_EMAIL) {
    throw new Error('Este e-mail não está autorizado a acessar o painel.')
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    throw toAppError(
      error,
      error.message.includes('Invalid login')
        ? 'E-mail ou senha incorretos.'
        : error.message.toLowerCase().includes('not confirmed')
          ? 'Confirme seu e-mail pelo link que enviamos antes de entrar.'
          : 'Não foi possível entrar.',
    )
  }
}

/**
 * Cria a conta do cabeleireiro. O banco recusa qualquer e-mail fora de
 * admin_allowlist; a checagem aqui é só para dar resposta rápida.
 * Retorna true quando é preciso confirmar o e-mail antes de entrar.
 */
export async function signUp(email: string, password: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase()
  if (!isDemoMode && normalized !== BARBER_EMAIL) {
    throw new Error('Este e-mail não tem permissão para criar conta.')
  }

  const { data, error } = await supabase.auth.signUp({
    email: normalized,
    password,
    options: { emailRedirectTo: `${window.location.origin}/admin/login` },
  })
  if (error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('already registered')) throw new Error('Já existe uma conta com este e-mail. Entre com sua senha.')
    if (msg.includes('database error')) throw new Error('Este e-mail não tem permissão para criar conta.')
    if (msg.includes('password')) throw new Error('Senha fraca. Use pelo menos 8 caracteres, misturando letras e números.')
    if (msg.includes('signups not allowed') || msg.includes('signup is disabled')) {
      throw new Error('O cadastro está desligado no Supabase. Ative-o para criar a conta.')
    }
    throw toAppError(error, 'Não foi possível criar a conta.')
  }
  return !data.session
}

export async function signOut() {
  await supabase.auth.signOut()
}

export async function checkIsAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_admin')
  if (error) return false
  return data === true
}

// ---------------- Agendamentos ----------------

export interface AppointmentFilters {
  from?: string
  to?: string
  status?: AppointmentStatus[]
  limit?: number
}

export async function fetchAppointments(filters: AppointmentFilters = {}): Promise<Appointment[]> {
  let query = supabase
    .from('appointments')
    .select('*')
    .order('appointment_date')
    .order('start_time')
  if (filters.from) query = query.gte('appointment_date', filters.from)
  if (filters.to) query = query.lte('appointment_date', filters.to)
  if (filters.status?.length) query = query.in('status', filters.status)
  if (filters.limit) query = query.limit(filters.limit)

  const { data, error } = await query
  if (error) throw toAppError(error, 'Não foi possível carregar os agendamentos.')
  return data as Appointment[]
}

export async function updateAppointmentStatus(id: string, status: AppointmentStatus) {
  const { error } = await supabase.from('appointments').update({ status }).eq('id', id)
  if (error) throw toAppError(error, 'Não foi possível atualizar o agendamento.')
}

// ---------------- Configurações ----------------

export async function fetchSettings(): Promise<BusinessSettings> {
  const { data, error } = await supabase.from('business_settings').select('*').eq('id', 1).single()
  if (error) throw toAppError(error, 'Não foi possível carregar as configurações.')
  return data as BusinessSettings
}

export type SettingsInput = Omit<BusinessSettings, 'id' | 'timezone'>

export async function saveSettings(input: SettingsInput) {
  const { error } = await supabase.from('business_settings').update(input).eq('id', 1)
  if (error) throw toAppError(error, 'Não foi possível salvar. Confira os valores informados.')
}

// ---------------- Intervalos ----------------

export async function fetchBreaks(): Promise<BreakRule[]> {
  const { data, error } = await supabase.from('breaks').select('*').order('start_time')
  if (error) throw toAppError(error, 'Não foi possível carregar os intervalos.')
  return data as BreakRule[]
}

export async function createBreak(input: Omit<BreakRule, 'id'>) {
  const { error } = await supabase.from('breaks').insert(input)
  if (error) throw toAppError(error, 'Não foi possível criar o intervalo. Confira os horários.')
}

export async function deleteBreak(id: string) {
  const { error } = await supabase.from('breaks').delete().eq('id', id)
  if (error) throw toAppError(error, 'Não foi possível remover o intervalo.')
}

// ---------------- Bloqueios ----------------

export async function fetchBlocks(fromDate: string): Promise<BlockedSlot[]> {
  const { data, error } = await supabase
    .from('blocked_slots')
    .select('*')
    .gte('block_date', fromDate)
    .order('block_date')
    .order('start_time', { nullsFirst: true })
  if (error) throw toAppError(error, 'Não foi possível carregar os bloqueios.')
  return data as BlockedSlot[]
}

export async function createBlock(input: Omit<BlockedSlot, 'id'>) {
  const { error } = await supabase.from('blocked_slots').insert(input)
  if (error) throw toAppError(error, 'Não foi possível criar o bloqueio. Confira os horários.')
}

export async function deleteBlock(id: string) {
  const { error } = await supabase.from('blocked_slots').delete().eq('id', id)
  if (error) throw toAppError(error, 'Não foi possível remover o bloqueio.')
}

// ---------------- Serviços ----------------

export async function fetchAllServices(): Promise<Service[]> {
  const { data, error } = await supabase.from('services').select('*').order('sort_order').order('name')
  if (error) throw toAppError(error, 'Não foi possível carregar os serviços.')
  return data as Service[]
}

export type ServiceInput = Omit<Service, 'id'>

export async function saveService(input: ServiceInput, id?: string) {
  const { error } = id
    ? await supabase.from('services').update(input).eq('id', id)
    : await supabase.from('services').insert(input)
  if (error) throw toAppError(error, 'Não foi possível salvar o serviço.')
}

export async function deleteService(id: string) {
  const { error } = await supabase.from('services').delete().eq('id', id)
  if (error) throw toAppError(error, 'Não foi possível remover o serviço.')
}
