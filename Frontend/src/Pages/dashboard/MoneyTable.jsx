import { formatDay, formatMoney } from './format'
import { EmptyState, Surface, quietBtn } from './ui'

export function MoneyTable({ title, items, emptyText, addLabel, onAdd, onEdit, onDelete }) {
  return (
    <Surface className="overflow-hidden p-0">
      <div className="flex items-end justify-between gap-3 px-4 py-5 sm:px-6">
        <div className="min-w-0">
          <h2 className="font-display text-2xl">{title}</h2>
          <p className="mt-0.5 text-sm text-ink-soft">
            {items.length
              ? `${items.length} ligne${items.length > 1 ? 's' : ''} · ${formatMoney(
                  items.reduce((sum, item) => sum + item.amount, 0),
                )}`
              : 'Aucune ligne pour l’instant'}
          </p>
        </div>
        <button type="button" onClick={onAdd} className={`${quietBtn} shrink-0`}>
          {addLabel}
        </button>
      </div>
      {items.length === 0 ? (
        <div className="px-4 pb-5 sm:px-5">
          <EmptyState>{emptyText}</EmptyState>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-ink/8 md:hidden">
            {items.map((item) => (
              <li key={item._id} className="flex items-start justify-between gap-3 px-4 py-4">
                <div className="min-w-0">
                  <p className="font-medium wrap-break-word">{item.label}</p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {formatDay(item.date)}
                    {item.category ? ` · ${item.category}` : ''}
                  </p>
                  <div className="mt-2 flex gap-3">
                    <button type="button" className={quietBtn} onClick={() => onEdit(item)}>
                      Modifier
                    </button>
                    <button type="button" className={quietBtn} onClick={() => onDelete(item._id)}>
                      Retirer
                    </button>
                  </div>
                </div>
                <p className="shrink-0 font-display text-lg">{formatMoney(item.amount)}</p>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto md:block">
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
                    <td className="px-6 py-4 text-right font-display text-lg whitespace-nowrap">
                      {formatMoney(item.amount)}
                    </td>
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
        </>
      )}
    </Surface>
  )
}
