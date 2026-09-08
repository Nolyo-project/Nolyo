export const PAYMENT_METHODS = [
  { id: 'cash', label: 'Espèces' },
  { id: 'card', label: 'Carte' },
  { id: 'cheque', label: 'Chèque' },
  { id: 'transfer', label: 'Virement' },
]

export function paymentMethodLabel(id) {
  return PAYMENT_METHODS.find((item) => item.id === id)?.label || ''
}
