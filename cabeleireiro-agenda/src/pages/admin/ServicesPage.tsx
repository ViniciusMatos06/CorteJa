import { useEffect, useState, type FormEvent } from 'react'
import { Pencil, Plus, Scissors, Trash2 } from 'lucide-react'
import type { Service } from '@/types'
import { deleteService, fetchAllServices, saveService } from '@/services/adminService'
import { useToast } from '@/context/ToastContext'
import { toAppError } from '@/lib/errors'
import { formatCurrency } from '@/lib/format'
import { PageHeader } from '@/components/admin/AdminLayout'
import { EmptyState } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { PageLoader } from '@/components/ui/Spinner'
import { cn } from '@/components/ui/cn'

const EMPTY = { name: '', description: '', price: '', active: true, sort_order: 0 }

export default function ServicesPage() {
  const toast = useToast()
  const [items, setItems] = useState<Service[] | null>(null)
  const [editing, setEditing] = useState<Service | 'new' | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [nameError, setNameError] = useState<string>()
  const [toDelete, setToDelete] = useState<Service | null>(null)

  const load = () => fetchAllServices().then(setItems).catch((e) => toast.error(toAppError(e).message))
  useEffect(() => { load() }, [])

  function openEditor(s: Service | 'new') {
    setNameError(undefined)
    setEditing(s)
    setForm(
      s === 'new'
        ? { ...EMPTY, sort_order: items?.length ?? 0 }
        : { name: s.name, description: s.description ?? '', price: s.price?.toString() ?? '', active: s.active, sort_order: s.sort_order },
    )
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (form.name.trim().length < 2) return setNameError('Informe o nome do serviço.')
    const price = form.price === '' ? null : Number(form.price.replace(',', '.'))
    if (price != null && (Number.isNaN(price) || price < 0)) return toast.error('Preço inválido.')
    setSaving(true)
    try {
      await saveService(
        { name: form.name.trim(), description: form.description.trim() || null, price, active: form.active, sort_order: form.sort_order },
        editing !== 'new' && editing ? editing.id : undefined,
      )
      toast.success('Serviço salvo.')
      setEditing(null)
      await load()
    } catch (err) {
      toast.error(toAppError(err).message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(s: Service) {
    try {
      await saveService(
        { name: s.name, description: s.description, price: s.price, active: !s.active, sort_order: s.sort_order },
        s.id,
      )
      await load()
    } catch (err) {
      toast.error(toAppError(err).message)
    }
  }

  async function confirmDelete() {
    if (!toDelete) return
    try {
      await deleteService(toDelete.id)
      toast.success('Serviço removido.')
      setToDelete(null)
      await load()
    } catch (err) {
      toast.error(toAppError(err).message)
    }
  }

  return (
    <>
      <PageHeader
        title="Serviços"
        subtitle="O que os clientes podem escolher ao agendar."
        actions={<Button size="sm" className="h-10" icon={<Plus className="size-4" />} onClick={() => openEditor('new')}>Novo serviço</Button>}
      />

      {items === null ? (
        <PageLoader />
      ) : items.length === 0 ? (
        <EmptyState icon={<Scissors className="size-6" />} title="Nenhum serviço cadastrado">
          Cadastre ao menos um serviço para liberar a página de agendamento.
        </EmptyState>
      ) : (
        <div className="space-y-2">
          {items.map((s) => (
            <div key={s.id} className={cn('flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 animate-fade-in', !s.active && 'opacity-60')}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{s.name}</span>
                  {s.price != null && <span className="text-sm text-brand-600">{formatCurrency(s.price)}</span>}
                  {!s.active && <span className="rounded-full bg-tint px-2 py-0.5 text-xs text-fg-muted">Oculto</span>}
                </div>
                {s.description && <p className="mt-0.5 truncate text-sm text-fg-muted">{s.description}</p>}
              </div>
              <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs text-fg-muted">
                <input type="checkbox" checked={s.active} onChange={() => toggleActive(s)} className="size-4 accent-[var(--color-brand-600)]" />
                <span className="hidden sm:inline">Ativo</span>
              </label>
              <button onClick={() => openEditor(s)} className="rounded-lg p-2 text-fg-muted hover:bg-tint hover:text-fg" aria-label="Editar">
                <Pencil className="size-4" />
              </button>
              <button onClick={() => setToDelete(s)} className="rounded-lg p-2 text-fg-muted hover:bg-red-50 hover:text-red-700" aria-label="Excluir">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={editing !== null}
        title={editing === 'new' ? 'Novo serviço' : 'Editar serviço'}
        onClose={() => !saving && setEditing(null)}
      >
        <form onSubmit={handleSave} className="space-y-4" noValidate>
          <Input label="Nome" value={form.name} maxLength={80} error={nameError} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Textarea label="Descrição (opcional)" value={form.description} maxLength={300} rows={2} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Preço (R$)" inputMode="decimal" placeholder="Opcional" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            <Input label="Ordem" type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
          </div>
          <label className="flex items-center gap-2.5 text-sm text-fg-soft">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="size-4 accent-[var(--color-brand-600)]" />
            Visível para clientes
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button type="submit" loading={saving}>Salvar</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={toDelete !== null}
        title="Excluir serviço"
        onClose={() => setToDelete(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setToDelete(null)}>Voltar</Button>
            <Button variant="danger" onClick={confirmDelete}>Excluir</Button>
          </>
        }
      >
        <p className="text-sm text-fg-soft">
          Excluir <strong className="text-fg">{toDelete?.name}</strong>? Agendamentos antigos continuam guardando o nome do serviço.
          Se quiser apenas esconder dos clientes, desmarque “Ativo”.
        </p>
      </Modal>
    </>
  )
}
