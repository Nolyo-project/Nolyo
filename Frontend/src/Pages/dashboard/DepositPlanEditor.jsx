import { Link } from 'react-router-dom'
import {
  DEPOSIT_TEMPLATES,
  depositPercentsKey,
  depositPlanTotal,
  fieldClass,
  formatMoney,
  splitDepositAmounts,
} from './format'
import { quietBtn } from './ui'

export function DepositPlanEditor({ plan, onChange }) {
  const total = depositPlanTotal(plan)
  const activeKey = depositPercentsKey(plan)

  function updateStep(index, patch) {
    onChange(plan.map((step, i) => (i === index ? { ...step, ...patch } : step)))
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {DEPOSIT_TEMPLATES.map((item) => {
          const active = depositPercentsKey(item.steps) === activeKey
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.steps.map((step) => ({ ...step })))}
              className={`rounded-full px-4 py-2 text-sm transition ${
                active ? 'bg-moss font-medium text-cream' : 'bg-paper text-ink-soft hover:bg-cream hover:text-ink'
              }`}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      <ul className="mt-6 space-y-4">
        {plan.map((step, index) => (
          <li key={index} className="rounded-2xl bg-paper px-4 py-4 sm:px-5">
            <div className="grid items-end gap-4 sm:grid-cols-[minmax(0,1fr)_7rem_auto]">
              <label className="block text-sm font-medium">
                Libellé
                <input
                  className={fieldClass}
                  value={step.label || ''}
                  onChange={(event) => updateStep(index, { label: event.target.value })}
                  placeholder={index === 0 ? 'Acompte' : 'Solde'}
                />
              </label>
              <label className="block text-sm font-medium">
                Part
                <span className="relative block">
                  <input
                    className={`${fieldClass} pr-8`}
                    type="number"
                    min="0"
                    max="100"
                    value={step.percent ?? 0}
                    onChange={(event) => updateStep(index, { percent: Number(event.target.value) || 0 })}
                  />
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-ink-soft">
                    %
                  </span>
                </span>
              </label>
              {plan.length > 1 ? (
                <button
                  type="button"
                  className={`${quietBtn} pb-3 text-left sm:text-right`}
                  onClick={() => onChange(plan.filter((_, i) => i !== index))}
                >
                  Retirer
                </button>
              ) : (
                <span />
              )}
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          className={quietBtn}
          onClick={() =>
            onChange([...plan, { label: plan.length === 1 ? 'Solde' : `Échéance ${plan.length + 1}`, percent: 0 }])
          }
        >
          Ajouter une échéance
        </button>
        <p className={`text-sm ${total === 100 ? 'text-ink-soft' : 'text-copper'}`}>
          {total === 100 ? 'Répartition à 100 %' : `Total ${total} % — ajustez pour arriver à 100`}
        </p>
      </div>
    </div>
  )
}

export function DepositTracker({ plan, price, onTogglePaid, canToggle = false, lockHint = '' }) {
  const rows = splitDepositAmounts(price, plan)
  const showMoney = price !== undefined && price !== '' && Number(price) > 0

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-sm font-medium">Acomptes</p>
        <Link to="/dashboard/parametres" className={quietBtn}>
          Dans Paramètres
        </Link>
      </div>
      {lockHint ? <p className="mt-1 text-xs text-ink-soft">{lockHint}</p> : null}
      <ul className="mt-3 space-y-2">
        {rows.map((step, index) => (
          <li key={index} className="flex flex-col gap-2 rounded-2xl bg-cream px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium">{step.label}</p>
              <p className="text-sm text-ink-soft">
                {step.percent} %{showMoney ? ` · ${formatMoney(step.amount)}` : ''}
                {step.paid ? ' · encaissé' : ''}
              </p>
            </div>
            {canToggle ? (
              <button
                type="button"
                onClick={() => onTogglePaid?.(index, !step.paid)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  step.paid
                    ? 'bg-moss text-cream hover:bg-ink'
                    : 'bg-paper text-ink ring-1 ring-ink/10 hover:bg-cream'
                }`}
              >
                {step.paid ? 'Payé' : 'Marquer payé'}
              </button>
            ) : step.paid ? (
              <span className="shrink-0 text-sm font-medium text-moss">Payé</span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
