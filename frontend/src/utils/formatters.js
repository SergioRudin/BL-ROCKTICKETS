export function formatMoney(value) {
  return `₡${Number(value || 0).toLocaleString('es-CR')}`
}

export function formatEventDate(isoDate) {
  return new Intl.DateTimeFormat('es-CR', {
    dateStyle: 'full',
    timeStyle: 'short'
  }).format(new Date(isoDate))
}
