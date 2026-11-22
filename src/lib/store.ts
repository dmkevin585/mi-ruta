// Guardado en el teléfono (localStorage) + importar/exportar respaldo.
import { useSyncExternalStore } from 'react'
import { DEFAULT_CONFIG, type Config, type Movimiento, type Pedido, type Pcts } from './engine'

export interface Jornada {
  id: string
  inicio: number
  fin: number | null
}

export interface Datos {
  version: 2
  pedidos: Pedido[]
  movimientos: Movimiento[]
  jornadas: Jornada[]
  config: Config
}

const KEY = 'mi-ruta-v2'
const vacio = (): Datos => ({ version: 2, pedidos: [], movimientos: [], jornadas: [], config: structuredClone(DEFAULT_CONFIG) })

function mergeConfig(c: Partial<Config> | undefined): Config {
  const d = structuredClone(DEFAULT_CONFIG)
  if (!c) return d
  return { ...d, ...c, fase1: { ...d.fase1, ...(c.fase1 || {}) }, fase2: { ...d.fase2, ...(c.fase2 || {}) } }
}

function cargar(): Datos {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return vacio()
    const j = JSON.parse(raw)
    return { version: 2, pedidos: j.pedidos || [], movimientos: j.movimientos || [], jornadas: j.jornadas || [], config: mergeConfig(j.config) }
  } catch {
    return vacio()
  }
}

let datos: Datos = cargar()
const subs = new Set<() => void>()

export function setDatos(fn: (d: Datos) => Datos) {
  datos = fn(datos)
  try {
    localStorage.setItem(KEY, JSON.stringify(datos))
  } catch {
    /* sin espacio o modo privado */
  }
  subs.forEach((s) => s())
}

export function useDatos() {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb)
      return () => subs.delete(cb)
    },
    () => datos,
  )
}

export const nuevoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

/* ---------- respaldo ---------- */
export function descargar(nombre: string, contenido: string, tipo: string) {
  const blob = new Blob([contenido], { type: tipo })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/* ---------- importar (JSON de esta app, de la versión anterior, o CSV) ---------- */
const pad = (n: string | number) => String(n).padStart(2, '0')
function normFecha(v: unknown): string | null {
  const s = String(v ?? '').trim()
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`
  m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/)
  if (m) return `${m[3].length === 2 ? '20' + m[3] : m[3]}-${pad(m[2])}-${pad(m[1])}`
  return null
}
function num(v: unknown): number {
  if (typeof v === 'number') return v
  let s = String(v ?? '').replace(/\$|\s/g, '')
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '')
  return parseFloat(s.replace(',', '.')) || 0
}
function pick(r: Record<string, unknown>, keys: string[]) {
  for (const k of Object.keys(r)) {
    const kk = k.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    if (keys.some((x) => kk === x || kk.includes(x))) return r[k]
  }
  return ''
}

export interface Importado {
  pedidos: Pedido[]
  movimientos?: Movimiento[]
  config?: Config
}

export function parsearImport(texto: string): Importado {
  const t = texto.trim()
  let filas: Record<string, unknown>[] = []
  let movimientos: Movimiento[] | undefined
  let config: Config | undefined
  if (/^[[{]/.test(t)) {
    const j = JSON.parse(t)
    if (Array.isArray(j)) filas = j
    else {
      filas = j.pedidos || j.orders || j.data || []
      const mv = j.movimientos || j.moves
      if (Array.isArray(mv))
        movimientos = mv.map((m: Record<string, unknown>) => ({
          id: String(m.id || nuevoId()),
          tipo: (m.tipo as Movimiento['tipo']) || 'gasto',
          bolsillo: (m.bolsillo || m.bucket) as Movimiento['bolsillo'],
          monto: num(m.monto),
          litros: m.litros ? num(m.litros) : undefined,
          fecha: normFecha(m.fecha) || '',
          nota: String(m.nota || ''),
        })).filter((m: Movimiento) => m.fecha)
      const c = j.config || j.cfg
      if (c && c.fase1) config = mergeConfig(c)
      else if (c && c.p1) config = mergeConfig({ cuota: c.cuota, diaCorte: c.corte, costoKm: c.cpk })
    }
  } else {
    const lineas = t.split(/\r?\n/).filter(Boolean)
    const sep = (lineas[0].match(/;/g) || []).length > (lineas[0].match(/,/g) || []).length ? ';' : ','
    const cab = lineas[0].split(sep).map((h) => h.trim().toLowerCase().replace(/"/g, ''))
    filas = lineas.slice(1).map((l) => {
      const c = l.split(sep)
      return Object.fromEntries(cab.map((h, i) => [h, (c[i] || '').replace(/"/g, '').trim()]))
    })
  }
  const pedidos: Pedido[] = []
  filas.forEach((r, i) => {
    if (!r || typeof r !== 'object') return
    const f = pick(r, ['fecha', 'date', 'dia'])
    let h = String(pick(r, ['hora', 'time']) || '')
    if (!h && /T\d{2}:\d{2}/.test(String(f))) h = String(f).split('T')[1].slice(0, 5)
    const fecha = normFecha(f)
    if (!fecha) return
    const app = String(pick(r, ['plataforma', 'app', 'empresa', 'origen', 'platform', 'servicio'])).toLowerCase()
    const hm = h.match(/(\d{1,2}):(\d{2})/)
    pedidos.push({
      id: typeof r.id === 'string' && r.id ? r.id : nuevoId() + i,
      app: app.includes('uber') ? 'uber' : 'pya',
      monto: num(pick(r, ['monto', 'total', 'ganancia', 'precio', 'valor', 'amount'])),
      propina: num(pick(r, ['propina', 'tip'])),
      bono: num(pick(r, ['bono', 'bonus', 'incentivo'])),
      descuento: num(pick(r, ['descuento', 'desc', 'comision'])),
      km: num(pick(r, ['km', 'kilometr', 'distancia'])),
      minutos: num(pick(r, ['minutos', 'tiempo', 'min', 'duracion'])),
      fecha,
      hora: hm ? `${pad(hm[1])}:${hm[2]}` : '12:00',
    })
  })
  return { pedidos, movimientos, config }
}

export const sumaPcts = (p: Pcts) => p.cuota + p.personal + p.mant + p.ahorro + p.inv
