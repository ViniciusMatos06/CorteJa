interface MaybePgError {
  message?: string
  code?: string
  hint?: string
}

export class AppError extends Error {
  readonly code: string | undefined
  readonly slotUnavailable: boolean

  constructor(message: string, code?: string, slotUnavailable = false) {
    super(message)
    this.code = code
    this.slotUnavailable = slotUnavailable
  }
}

/** Converte erros do Supabase/PostgREST em mensagens amigáveis em português. */
export function toAppError(error: unknown, fallback = 'Algo deu errado. Tente novamente.'): AppError {
  if (error instanceof AppError) return error
  const e = (error ?? {}) as MaybePgError

  // Mensagens levantadas pelas nossas funções (RAISE ... ERRCODE P0001) já são amigáveis.
  if (e.code === 'P0001' && e.message) {
    return new AppError(e.message, e.code, e.hint === 'SLOT_UNAVAILABLE')
  }
  if (e.code === '23P01') {
    return new AppError('Este horário conflita com outro agendamento.', e.code, true)
  }
  if (e.code === '42501' || e.code === 'PGRST301') {
    return new AppError('Você não tem permissão para esta ação.', e.code)
  }
  if (e.message?.toLowerCase().includes('failed to fetch')) {
    return new AppError('Sem conexão com o servidor. Verifique sua internet.', e.code)
  }
  return new AppError(fallback, e.code)
}
