import { useEffect, useRef, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Input, Select } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Spinner'
import { UFS, lookupCep, maskCep, type AddressFields } from '@/lib/address'
import type { ClientErrors } from '@/lib/validation'

type LookupState = 'idle' | 'loading' | 'found' | 'notfound' | 'failed'

interface Props {
  value: AddressFields
  onChange: (patch: Partial<AddressFields>) => void
  errors: ClientErrors
}

/** Endereço em partes. Ao completar o CEP, rua, bairro, cidade e UF são preenchidos sozinhos. */
export function AddressForm({ value, onChange, errors }: Props) {
  const [lookup, setLookup] = useState<LookupState>('idle')
  const streetRef = useRef<HTMLInputElement>(null)
  const numberRef = useRef<HTMLInputElement>(null)
  const lastCep = useRef('')
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const cepDigits = value.cep.replace(/\D/g, '')

  useEffect(() => {
    if (cepDigits.length !== 8) {
      lastCep.current = ''
      setLookup('idle')
      return
    }
    if (cepDigits === lastCep.current) return
    lastCep.current = cepDigits

    const ctrl = new AbortController()
    setLookup('loading')
    lookupCep(cepDigits, ctrl.signal)
      .then((r) => {
        if (!r) {
          setLookup('notfound')
          return
        }
        onChangeRef.current(r)
        setLookup('found')
        // CEP de cidade pequena pode não trazer a rua: leva o cursor ao que falta.
        requestAnimationFrame(() => (r.street ? numberRef.current : streetRef.current)?.focus())
      })
      .catch((e) => {
        if ((e as Error).name !== 'AbortError') setLookup('failed')
      })
    return () => ctrl.abort()
  }, [cepDigits])

  const cepHint =
    lookup === 'found' ? undefined
    : lookup === 'notfound' ? 'CEP não encontrado. Confira os números ou preencha o endereço abaixo.'
    : lookup === 'failed' ? 'Não foi possível buscar o CEP agora. Preencha o endereço abaixo.'
    : 'Preenchemos rua, bairro e cidade para você.'

  return (
    <div className="grid grid-cols-6 gap-4">
      <div className="relative col-span-6 sm:col-span-3">
        <Input
          label="CEP"
          inputMode="numeric"
          autoComplete="postal-code"
          placeholder="00000-000"
          value={value.cep}
          onChange={(e) => onChange({ cep: maskCep(e.target.value) })}
          error={errors.cep}
          hint={cepHint}
        />
        <span className="pointer-events-none absolute top-[38px] right-3.5 flex items-center" aria-live="polite">
          {lookup === 'loading' && <Spinner className="size-4 text-brand-600" />}
          {lookup === 'found' && (
            <CheckCircle2 className="size-4 text-brand-600 animate-pop" aria-label="Endereço encontrado" />
          )}
        </span>
      </div>

      <div className="col-span-6 sm:col-span-4">
        <Input
          ref={streetRef}
          label="Rua"
          autoComplete="address-line1"
          placeholder="Rua das Flores"
          value={value.street}
          maxLength={150}
          onChange={(e) => onChange({ street: e.target.value })}
          error={errors.street}
        />
      </div>
      <div className="col-span-2">
        <Input
          ref={numberRef}
          label="Número"
          autoComplete="address-line2"
          placeholder="123 ou S/N"
          value={value.number}
          maxLength={20}
          onChange={(e) => onChange({ number: e.target.value })}
          error={errors.number}
        />
      </div>
      <div className="col-span-4 sm:col-span-3">
        <Input
          label="Complemento (opcional)"
          placeholder="Apto 201, bloco B"
          value={value.complement}
          maxLength={80}
          onChange={(e) => onChange({ complement: e.target.value })}
          error={errors.complement}
        />
      </div>
      <div className="col-span-6 sm:col-span-3">
        <Input
          label="Bairro"
          autoComplete="address-level3"
          value={value.neighborhood}
          maxLength={80}
          onChange={(e) => onChange({ neighborhood: e.target.value })}
          error={errors.neighborhood}
        />
      </div>
      <div className="col-span-4">
        <Input
          label="Cidade"
          autoComplete="address-level2"
          value={value.city}
          maxLength={80}
          onChange={(e) => onChange({ city: e.target.value })}
          error={errors.city}
        />
      </div>
      <div className="col-span-2">
        <Select
          label="UF"
          autoComplete="address-level1"
          value={value.state}
          onChange={(e) => onChange({ state: e.target.value })}
          error={errors.state}
          aria-invalid={Boolean(errors.state)}
        >
          <option value="">—</option>
          {UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
        </Select>
      </div>
    </div>
  )
}
