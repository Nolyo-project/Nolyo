import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api/client'
import {
  dateInMonth,
  fieldClass,
  formatDay,
  formatMoney,
  formatMonthLabel,
  monthInputBounds,
  monthKey,
  shiftMonthKey,
  toDateInput,
} from '../dashboard/format'
import { EmptyState, Modal, PageShell, Surface, primaryBtn, quietBtn } from '../dashboard/ui'

const empty = { kind: 'income', label: '', amount: '', date: toDateInput(), category: '' }

function MoneyTable({ title, items, emptyText, addLabel, onAdd, onEdit, onDelete }) {
  return (
    <Surface className="overflow-hidden p-0">
      <div className="flex items-end justify-between gap-3 px-6 py-5">
        <div>
          <h2 className="font-display text-2xl">{title}</h2>
          <p className="mt-0.5 text-sm text-ink-soft">
            {items.length
              ? `${items.length} ligne${items.length > 1 ? 's' : ''} · ${formatMoney(
                  items.reduce((sum, item) => sum + item.amount, 0),
                )}`
              : 'Aucune ligne pour l’instant'}
          </p>
        </div>
        <button type="button" onClick={onAdd} className={quietBtn}>
          {addLabel}
        </button>
      </div>
      {items.length === 0 ? (
        <div className="px-5 pb-5">
          <EmptyState>{emptyText}</EmptyState>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-t border-ink/8 bg-paper/60 text-[11px] font-semibold tracking-wide text-ink-soft uppercase">
                <th className="px-6 py-3.5 font-semibold">Date</th>
                <th className="px-6 py-3.5 font-semibold">Libellé</th>
                <th className="px-6 py-3.5 font-semibold">Catégorie</th>
                <th className="px-6 py-3.5 text-right font-semibold">Montant</th>
                <th className="px-6 py-3.5 text-right font-semibold">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id} className="border-t border-ink/8">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-soft">{formatDay(item.date)}</td>
                  <td className="px-6 py-4 font-medium">{item.label}</td>
                  <td className="px-6 py-4 text-sm text-ink-soft">{item.category || '—'}</td>
                  <td className="px-6 py-4 text-right font-display text-lg whitespace-nowrap">{formatMoney(item.amount)}</td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <button type="button" className={quietBtn} onClick={() => onEdit(item)}>
                      Modifier
                    </button>
                    <button type="button" className={`${quietBtn} ml-3`} onClick={() => onDelete(item._id)}>
                      Retirer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Surface>
  )
}

function FinancesView() {
  const [month, setMonth] = useState(() => monthKey())
  const [transactions, setTransactions] = useState([])
  const [totals, setTotals] = useState(null)
  const [form, setForm] = useState(empty)
  const [editingId, setEditingId] = useState(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const gains = useMemo(() => transactions.filter((item) => item.kind === 'income'), [transactions])
  const expenses = useMemo(() => transactions.filter((item) => item.kind === 'expense'), [transactions])

  async function load() {
    const data = await api(`/api/president/transactions?month=${encodeURIComponent(month)}`)
    setTransactions(data.transactions || [])
    setTotals(data.totals || null)
  }

  useEffect(() => {
    load().catch((err) => setError(err.message))
  }, [month])

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  function openCreate(kind = 'income') {
    setEditingId(null)
    setForm({ ...empty, kind, date: dateInMonth(month) })
    setError('')
    setOpen(true)
  }

  function startEdit(item) {
    setEditingId(item._id)
    setForm({
      kind: item.kind,
      label: item.label,
      amount: String(item.amount),
      date: toDateInput(item.date),
      category: item.category || '',
    })
    setError('')
    setOpen(true)
  }

  function closeForm() {
    setOpen(false)
    setEditingId(null)
    setForm({ ...empty, date: toDateInput() })
    setError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setPending(true)
    const body = { ...form, amount: Number(form.amount) }
    try {
      if (editingId) await api(`/api/president/transactions/${editingId}`, { method: 'PATCH', body })
      else await api('/api/president/transactions', { method: 'POST', body })
      closeForm()
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  async function handleDelete(id) {
    await api(`/api/president/transactions/${id}`, { method: 'DELETE' })
    if (editingId === id) closeForm()
    await load()
  }

  return (
    <PageShell className="!px-0 !py-0">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <p className="max-w-xl text-sm text-ink-soft">Les gains et les dépenses de Nolyo, un mois à la fois.</p>
        <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-full bg-cream p-1 ring-1 ring-ink/8">
              <button type="button" className={`${quietBtn} px-3`} onClick={() => setMonth((current) => shiftMonthKey(current, -1))}>
                ‹
              </button>
              <p className="min-w-40 px-2 text-center text-sm font-medium">{formatMonthLabel(month)}</p>
              <button type="button" className={`${quietBtn} px-3`} onClick={() => setMonth((current) => shiftMonthKey(current, 1))}>
                ›
              </button>
            </div>
            <button type="button" className={`${quietBtn} disabled:opacity-40`} disabled={month === monthKey()} onClick={() => setMonth(monthKey())}>
              Aujourd’hui
            </button>
            <button type="button" onClick={() => openCreate('income')} className={primaryBtn}>
              Nouvelle ligne
            </button>
        </div>
      </div>

      {totals ? (
        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <Surface className="p-5">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">Gains</p>
            <p className="mt-2 font-display text-3xl">{formatMoney(totals.income)}</p>
          </Surface>
          <Surface className="p-5">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">Dépenses</p>
            <p className="mt-2 font-display text-3xl">{formatMoney(totals.expense)}</p>
          </Surface>
          <Surface className="bg-moss p-5 text-cream ring-moss">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-cream/55 uppercase">Résultat</p>
            <p className="mt-2 font-display text-3xl">{formatMoney(totals.balance)}</p>
          </Surface>
        </section>
      ) : null}

      {error && !open ? <p className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}

      <section className="mt-8 grid gap-8 lg:grid-cols-2">
        <MoneyTable
          title="Gains"
          items={gains}
          emptyText="Aucun gain ce mois-ci."
          addLabel="Ajouter un gain"
          onAdd={() => openCreate('income')}
          onEdit={startEdit}
          onDelete={handleDelete}
        />
        <MoneyTable
          title="Dépenses"
          items={expenses}
          emptyText="Aucune dépense ce mois-ci."
          addLabel="Ajouter une dépense"
          onAdd={() => openCreate('expense')}
          onEdit={startEdit}
          onDelete={handleDelete}
        />
      </section>

      {open ? (
        <Modal onClose={closeForm} panelClassName="max-w-lg">
          <form onSubmit={handleSubmit}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs tracking-[0.18em] text-ink-soft uppercase">Trésorerie</p>
                <h2 className="font-display text-3xl">
                  {editingId ? 'Modifier la ligne' : form.kind === 'expense' ? 'Nouvelle dépense' : 'Nouveau gain'}
                </h2>
              </div>
              <button type="button" onClick={closeForm} className="text-sm text-ink-soft underline">
                Fermer
              </button>
            </div>
            <div className="mt-6 space-y-3">
              <label className="block text-sm font-medium">
                Type
                <select className={fieldClass} name="kind" value={form.kind} onChange={update}>
                  <option value="income">Gain</option>
                  <option value="expense">Dépense</option>
                </select>
              </label>
              <label className="block text-sm font-medium">
                Libellé
                <input className={fieldClass} name="label" value={form.label} onChange={update} required />
              </label>
              <label className="block text-sm font-medium">
                Montant (€)
                <input className={fieldClass} type="number" min="0" step="0.01" name="amount" value={form.amount} onChange={update} required />
              </label>
              <label className="block text-sm font-medium">
                Date
                <input
                  className={fieldClass}
                  type="date"
                  name="date"
                  value={form.date}
                  min={monthInputBounds(month).min}
                  max={monthInputBounds(month).max}
                  onChange={update}
                  required
                />
              </label>
              <label className="block text-sm font-medium">
                Catégorie
                <input className={fieldClass} name="category" value={form.category} onChange={update} />
              </label>
            </div>
            {error ? <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button type="submit" disabled={pending} className={primaryBtn}>
                {pending ? 'Enregistrement…' : editingId ? 'Enregistrer' : 'Ajouter'}
              </button>
              <button type="button" onClick={closeForm} className="text-sm underline">
                Annuler
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </PageShell>
  )
}

export default FinancesView
