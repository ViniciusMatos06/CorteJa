// Serviços usados pela página pública (sem autenticação).
import { supabase } from '@/lib/supabase'
import { toAppError } from '@/lib/errors'
import type { BookingRequest, BusinessSettings, Service, TimeSlot } from '@/types'

export async function fetchPublicSettings(): Promise<BusinessSettings> {
  const { data, error } = await supabase.from('business_settings').select('*').eq('id', 1).single()
  if (error) throw toAppError(error, 'Não foi possível carregar as configurações.')
  return data as BusinessSettings
}

export async function fetchActiveServices(): Promise<Service[]> {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('active', true)
    .order('sort_order')
    .order('name')
  if (error) throw toAppError(error, 'Não foi possível carregar os serviços.')
  return data as Service[]
}

export async function fetchAvailableDates(from: string, to: string): Promise<Set<string>> {
  const { data, error } = await supabase.rpc('get_available_dates', { p_from: from, p_to: to })
  if (error) throw toAppError(error, 'Não foi possível carregar as datas disponíveis.')
  return new Set((data as string[]) ?? [])
}

export async function fetchAvailableSlots(date: string): Promise<TimeSlot[]> {
  const { data, error } = await supabase.rpc('get_available_slots', { p_date: date })
  if (error) throw toAppError(error, 'Não foi possível carregar os horários.')
  return (data as TimeSlot[]) ?? []
}

export async function requestAppointment(req: BookingRequest): Promise<string> {
  const { data, error } = await supabase.rpc('request_appointment', {
    p_client_name: req.clientName,
    p_client_whatsapp: req.clientWhatsapp,
    p_client_address: req.clientAddress,
    p_service_id: req.serviceId,
    p_date: req.date,
    p_start_time: req.startTime,
  })
  if (error) throw toAppError(error, 'Não foi possível enviar sua solicitação.')
  return data as string
}
