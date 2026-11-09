import type { AddressFields } from '@/lib/address'

export type AppointmentStatus = 'pending' | 'confirmed' | 'declined' | 'cancelled'

export interface Appointment {
  id: string
  client_name: string
  client_whatsapp: string
  /** Texto completo montado pelo banco a partir das partes abaixo. */
  client_address: string
  // Partes do endereço; nulas em agendamentos criados antes da divisão.
  address_cep: string | null
  address_street: string | null
  address_number: string | null
  address_complement: string | null
  address_neighborhood: string | null
  address_city: string | null
  address_state: string | null
  service_id: string | null
  service_name: string
  service_price: number | null
  appointment_date: string // YYYY-MM-DD
  start_time: string // HH:MM:SS
  end_time: string
  status: AppointmentStatus
  created_at: string
  updated_at: string
}

export interface Service {
  id: string
  name: string
  description: string | null
  price: number | null
  active: boolean
  sort_order: number
}

export interface BusinessSettings {
  id: number
  business_name: string
  timezone: string
  work_days: number[] // 0 = domingo ... 6 = sábado
  day_start: string
  day_end: string
  slot_minutes: number
  min_notice_minutes: number
  booking_window_days: number
}

export interface BreakRule {
  id: string
  label: string
  weekday: number | null
  start_time: string
  end_time: string
}

export interface BlockedSlot {
  id: string
  block_date: string
  start_time: string | null
  end_time: string | null
  reason: string | null
}

export interface TimeSlot {
  slot_start: string
  slot_end: string
}

export interface BookingRequest {
  clientName: string
  clientWhatsapp: string
  address: AddressFields
  serviceId: string
  date: string
  startTime: string
}
