import { useState } from 'react'
import type { Appointment, AppointmentStatus } from '@/types'
import { updateAppointmentStatus } from '@/services/adminService'
import { useToast } from '@/context/ToastContext'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { formatDateLong, hhmm } from '@/lib/format'

const COPY: Record<Exclude<AppointmentStatus, 'pending'>, { title: string; verb: string; done: string; danger: boolean }> = {
  confirmed: { title: 'Aprovar agendamento', verb: 'Aprovar', done: 'Agendamento confirmado.', danger: false },
  declined: { title: 'Recusar solicitação', verb: 'Recusar', done: 'Solicitação recusada. O horário foi liberado.', danger: true },
  cancelled: { title: 'Cancelar agendamento', verb: 'Cancelar agendamento', done: 'Agendamento cancelado. O horário foi liberado.', danger: true },
}

/**
 * Centraliza a confirmação e a execução das mudanças de status.
 * Retorna a função `request` para os cards e o modal a ser renderizado.
 */
export function useAppointmentActions(onChanged: () => void) {
  const toast = useToast()
  const [pending, setPending] = useState<{ appointment: Appointment; status: AppointmentStatus } | null>(null)
  const [busy, setBusy] = useState(false)

  const request = (appointment: Appointment, status: AppointmentStatus) => setPending({ appointment, status })

  async function confirm() {
    if (!pending) return
    setBusy(true)
    try {
      await updateAppointmentStatus(pending.appointment.id, pending.status)
      toast.success(COPY[pending.status as keyof typeof COPY].done)
      setPending(null)
      onChanged()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const copy = pending ? COPY[pending.status as keyof typeof COPY] : null

  const modal = (
    <Modal
      open={Boolean(pending)}
      title={copy?.title ?? ''}
      onClose={() => !busy && setPending(null)}
      footer={
        <>
          <Button variant="ghost" onClick={() => setPending(null)} disabled={busy}>Voltar</Button>
          <Button variant={copy?.danger ? 'danger' : 'primary'} loading={busy} onClick={confirm}>
            {copy?.verb}
          </Button>
        </>
      }
    >
      {pending && (
        <p className="text-sm text-fg-soft">
          {copy?.verb} o atendimento de <strong className="text-fg">{pending.appointment.client_name}</strong> em{' '}
          {formatDateLong(pending.appointment.appointment_date)} às {hhmm(pending.appointment.start_time)}?
          {copy?.danger && ' O horário voltará a ficar disponível para outros clientes.'}
        </p>
      )}
    </Modal>
  )

  return { request, modal, busy }
}
