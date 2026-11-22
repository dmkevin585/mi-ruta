import { fromISO, toISO } from './engine'

export const clp = (n: number) => (n < 0 ? '−' : '') + '$' + Math.round(Math.abs(n)).toLocaleString('es-CL')
export const num = (n: number, d = 0) => Number(n || 0).toLocaleString('es-CL', { maximumFractionDigits: d })
export const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
export const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
export const DIAS_LARGO = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
export const hoyISO = () => toISO(new Date())
export const ahoraHM = () => {
  const d = new Date()
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
}
export const fechaCorta = (s: string) => {
  const d = fromISO(s)
  return `${d.getDate()} ${MESES[d.getMonth()]}`
}
export const fechaLarga = (s: string) => {
  const d = fromISO(s)
  const hoy = hoyISO()
  if (s === hoy) return 'Hoy'
  const ayer = new Date()
  ayer.setDate(ayer.getDate() - 1)
  if (s === toISO(ayer)) return 'Ayer'
  return `${DIAS_LARGO[d.getDay()][0].toUpperCase()}${DIAS_LARGO[d.getDay()].slice(1)} ${d.getDate()} ${MESES[d.getMonth()]}`
}
export const saludo = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches'
}
