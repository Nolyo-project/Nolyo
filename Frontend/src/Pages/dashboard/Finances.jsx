import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { isProPlan } from '../../data/plans'
import { fieldClass, formatDay, formatMoney, formatMonthLabel, monthKey, shiftMonthKey, dateInMonth, monthInputBounds, toDateInput } from './format'
import { ProLock } from './UpgradeWall'
import { EmptyState, Modal, PageHeader, PageShell, Surface, primaryBtn, quietBtn } from './ui'
import { MoneyTable } from './MoneyTable'

const empty = { kind: 'income', label: '', amount: '', date: toDateInput(), category: '' }

function Finances() {
  const { user } = useAuth()
  const isPro = isProPlan(user)
  const [month, setMonth] = useState(() => monthKey())
  const [transactions, setTransactions] = useState([])
  const [totals, setTotals] = useState(null)
  const [form, setForm] = useState(empty)
  const [editingId, setEditingId] = useState(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const gains = useMemo(
    () => transactions.filter((item) => item.kind === 'income'),
    [transactions],
  )
  const expenses = useMemo(
    () => transactions.filter((item) => item.kind === 'expense'),
    [transactions],
  )

  async function load() {
    const data = await api(`/api/workspace/transactions?month=${encodeURIComponent(month)}`)
    setTransactions(data.transactions)
    setTotals(data.totals)
  }

  useEffect(() => {
    load().catch((err) => setError(err.message))
  }, [month])

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  function openCreate(kind = 'income') {
    setEditingId(null)
    setForm({ ...empty, kind: !isPro && kind === 'expense' ? 'income' : kind, date: dateInMonth(month) })
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
    const body = {
      ...form,
      kind: isPro ? form.kind : 'income',
      amount: Number(form.amount),
    }
    try {
      if (editingId) {
        await api(`/api/workspace/transactions/${editingId}`, { method: 'PATCH', body })
      } else {
        await api('/api/workspace/transactions', { method: 'POST', body })
      }
      closeForm()
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  async function handleDelete(id) {
    await api(`/api/workspace/transactions/${id}`, { method: 'DELETE' })
    if (editingId === id) closeForm()
    await load()
  }

  return (
    <PageShell>
      <PageHeader
        kicker="Trésorerie"
        title="Chiffre d’affaires"
        description={
          isPro
            ? 'Les gains et les dépenses, un mois à la fois. Les cotisations sont indicatives.'
            : 'Saisissez vos gains, un mois à la fois. Cotisations et dépenses sont inclus dans Nolyo Pro.'
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-full bg-cream p-1 ring-1 ring-ink/8">
              <button
                type="button"
                className={`${quietBtn} px-3`}
                aria-label="Mois précédent"
                onClick={() => setMonth((current) => shiftMonthKey(current, -1))}
              >
                ‹
              </button>
              <p className="min-w-40 px-2 text-center text-sm font-medium">{formatMonthLabel(month)}</p>
              <button
                type="button"
                className={`${quietBtn} px-3`}
                aria-label="Mois suivant"
                onClick={() => setMonth((current) => shiftMonthKey(current, 1))}
              >
                ›
              </button>
            </div>
            <button
              type="button"
              className={`${quietBtn} disabled:opacity-40`}
              disabled={month === monthKey()}
              onClick={() => setMonth(monthKey())}
            >
              Aujourd’hui
            </button>
            <button type="button" onClick={() => openCreate('income')} className={primaryBtn}>
              Nouvelle ligne
            </button>
          </div>
        }
      />

      {totals ? (
        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Surface className="h-full p-5">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">Chiffre d’affaires</p>
            <p className="mt-2 font-display text-3xl">{formatMoney(totals.income)}</p>
          </Surface>
          <ProLock isPro={isPro} title="Cotisations indicatives" className="h-full">
            <Surface className="h-full p-5">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">Cotisations</p>
              <p className="mt-2 font-display text-3xl">{formatMoney(totals.cotisationEstimate)}</p>
              <p className="mt-2 text-sm font-medium">Après cotisations : {formatMoney(totals.afterCotisation)}</p>
              <p className="mt-1 text-sm text-ink-soft">
                {Math.round(totals.cotisationRate * 100)} % du chiffre d’affaires, à titre indicatif
              </p>
            </Surface>
          </ProLock>
          <ProLock isPro={isPro} title="Suivi des dépenses" className="h-full">
            <Surface className="h-full p-5">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">Dépenses</p>
              <p className="mt-2 font-display text-3xl">{formatMoney(totals.expense)}</p>
            </Surface>
          </ProLock>
          <ProLock isPro={isPro} title="Résultat net" className="h-full">
            <Surface className="h-full !bg-moss p-5 text-cream !ring-moss">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-cream/55 uppercase">Total</p>
              <p className="mt-2 font-display text-3xl">{formatMoney(totals.netAfterCotisation)}</p>
              <p className="mt-1 text-sm text-cream/70">Après cotisations et dépenses</p>
            </Surface>
          </ProLock>
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
        <ProLock isPro={isPro} title="Les dépenses sont dans Nolyo Pro" className="min-h-[18rem]">
          <MoneyTable
            title="Dépenses"
            items={expenses}
            emptyText="Aucune dépense ce mois-ci."
            addLabel="Ajouter une dépense"
            onAdd={() => openCreate('expense')}
            onEdit={startEdit}
            onDelete={handleDelete}
          />
        </ProLock>
      </section>

      {open ? (
        <Modal onClose={closeForm} panelClassName="max-w-lg">
          <form onSubmit={handleSubmit}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs tracking-[0.18em] text-ink-soft uppercase">Trésorerie</p>
                <h2 className="font-display text-3xl">
                  {editingId
                    ? 'Modifier la ligne'
                    : form.kind === 'expense'
                      ? 'Nouvelle dépense'
                      : 'Nouveau gain'}
                </h2>
              </div>
              <button type="button" onClick={closeForm} className="text-sm text-ink-soft underline">
                Fermer
              </button>
            </div>
            <div className="mt-6 space-y-3">
              <label className="block text-sm font-medium">
                Type
                <select className={fieldClass} name="kind" value={form.kind} onChange={update} disabled={!isPro}>
                  <option value="income">Gain</option>
                  {isPro ? <option value="expense">Dépense</option> : null}
                </select>
              </label>
              <label className="block text-sm font-medium">
                Libellé
                <input className={fieldClass} name="label" value={form.label} onChange={update} required />
              </label>
              <label className="block text-sm font-medium">
                Montant (€)
                <input
                  className={fieldClass}
                  type="number"
                  min="0"
                  step="0.01"
                  name="amount"
                  value={form.amount}
                  onChange={update}
                  required
                />
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
              {editingId ? (
                <button
                  type="button"
                  className={`${quietBtn} ml-auto`}
                  onClick={() => handleDelete(editingId)}
                >
                  Retirer
                </button>
              ) : null}
            </div>
          </form>
        </Modal>
      ) : null}
    </PageShell>
  )
}

export default Finances
