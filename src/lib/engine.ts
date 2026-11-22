// Motor de reparto: decide a qué bolsillo va cada peso de cada pedido.
// Es puro (sin React ni almacenamiento) para poder probarlo con `npm test`.

export type App = 'uber' | 'pya'
export type BolsilloKey = 'cuota' | 'personal' | 'mant' | 'ahorro' | 'inv'
export type Pcts = Record<BolsilloKey, number>

export interface Pedido {
  id: string
  app: App
  monto: number
  propina: number
  bono: number
  descuento: number
  km: number
  minutos: number
  fecha: string // YYYY-MM-DD
  hora: string // HH:MM
}

export interface Movimiento {
  id: string
  tipo: 'bencina' | 'cuota' | 'gasto'
  bolsillo?: BolsilloKey // solo para 'gasto'
  monto: number
  litros?: number
  fecha: string
  nota: string
}

export interface Config {
  cuota: number
  diaCorte: number // día del mes en que parte el ciclo (1–28)
  modoCuota: 'auto' | 'fijo'
  diaObjetivo: number // día del ciclo en que la cuota debería estar lista (21 = 3 semanas)
  pctMin: number // % mínimo a la cuota en modo auto
  pctMax: number // % máximo a la cuota en modo auto
  semanaEstimada: number // ingreso bruto semanal estimado, se usa mientras no hay historial
  metaSemanal: number
  costoKmModo: 'auto' | 'fijo'
  costoKm: number
  fase1: Pcts // mientras falta la cuota
  fase2: Pcts // cuota lista: 'cuota' = adelanto para la próxima
}

export const BOLSILLOS: { key: BolsilloKey; nombre: string; color: string; desc: string }[] = [
  { key: 'cuota', nombre: 'Cuota moto', color: '#1F4FFF', desc: 'Para pagar la moto' },
  { key: 'personal', nombre: 'Personal', color: '#00A88F', desc: 'Tu sueldo, libre' },
  { key: 'mant', nombre: 'Mantención', color: '#F28C28', desc: 'Aceite, cadena, frenos' },
  { key: 'ahorro', nombre: 'Ahorro', color: '#7B5CFF', desc: 'No se toca' },
  { key: 'inv', nombre: 'Inversión', color: '#E5487D', desc: 'Para crecer' },
]
export const COLOR_BENCINA = '#E2B100'

export const DEFAULT_CONFIG: Config = {
  cuota: 160000,
  diaCorte: 1,
  modoCuota: 'auto',
  diaObjetivo: 21,
  pctMin: 55,
  pctMax: 85,
  semanaEstimada: 90000,
  metaSemanal: 90000,
  costoKmModo: 'auto',
  costoKm: 46.01,
  fase1: { cuota: 72, personal: 15, mant: 8, ahorro: 5, inv: 0 },
  fase2: { cuota: 15, personal: 40, mant: 10, ahorro: 20, inv: 15 },
}

/* ---------- fechas ---------- */
const pad = (n: number) => String(n).padStart(2, '0')
export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const fromISO = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const addDays = (s: string, n: number) => {
  const d = fromISO(s)
  d.setDate(d.getDate() + n)
  return toISO(d)
}
export const daysBetween = (a: string, b: string) => Math.round((fromISO(b).getTime() - fromISO(a).getTime()) / 864e5)

export function cicloDe(fecha: string, diaCorte: number) {
  const c = Math.min(28, Math.max(1, Math.round(diaCorte) || 1))
  const d = fromISO(fecha)
  let inicio = new Date(d.getFullYear(), d.getMonth(), c)
  if (d.getDate() < c) inicio = new Date(d.getFullYear(), d.getMonth() - 1, c)
  const fin = new Date(inicio.getFullYear(), inicio.getMonth() + 1, c - 1)
  return { inicio: toISO(inicio), fin: toISO(fin) }
}

/* ---------- pedidos ---------- */
export const ingreso = (p: Pedido) => (p.monto || 0) + (p.propina || 0) + (p.bono || 0) - (p.descuento || 0)
export const ordenar = (ps: Pedido[]) => [...ps].sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))

/** Costo de bencina por km: real (cargas ÷ km entre la primera y la última carga) o fijo. */
export function costoKm(cfg: Config, pedidos: Pedido[], movs: Movimiento[]) {
  const cargas = movs.filter((m) => m.tipo === 'bencina').sort((a, b) => a.fecha.localeCompare(b.fecha))
  let real: number | null = null
  let km = 0
  if (cargas.length >= 2) {
    const desde = cargas[0].fecha
    const hasta = cargas[cargas.length - 1].fecha
    const gastado = cargas.slice(0, -1).reduce((a, m) => a + m.monto, 0)
    km = pedidos.filter((p) => p.fecha >= desde && p.fecha < hasta).reduce((a, p) => a + (p.km || 0), 0)
    if (km >= 30) real = gastado / km
  }
  const usado = cfg.costoKmModo === 'auto' && real ? real : cfg.costoKm
  return { usado, real, km, cargas: cargas.length }
}

export interface Asignacion {
  bencina: number
  neto: number
  cuota: number // a la cuota del ciclo actual
  adelanto: number // guardado para la cuota siguiente
  personal: number
  mant: number
  ahorro: number
  inv: number
  fase: 1 | 2
  pctCuota: number // % del neto que fue a la cuota en este pedido
}

export interface Ciclo {
  inicio: string
  fin: string
  objetivo: string // fecha en que la cuota debería estar lista
  arrastre: number // adelanto que venía del ciclo anterior
  pagado: number // cuota juntada (incluye arrastre)
  adelanto: number // juntado en fase 2 para el próximo ciclo
  listaEl: string | null
  ingreso: number
  neto: number
  pedidos: number
  dias: string[]
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

/** Neto diario esperado: promedio real de los últimos 28 días (si hay 2+ semanas de historial) o la estimación. */
function netoDiarioEsperado(cfg: Config, historial: { fecha: string; neto: number }[], fecha: string) {
  const desde = addDays(fecha, -28)
  const prev = historial.filter((h) => h.fecha >= desde && h.fecha < fecha)
  const primero = historial[0]?.fecha
  if (primero && daysBetween(primero, fecha) >= 14 && prev.length) {
    const span = Math.min(28, daysBetween(primero, fecha))
    return prev.reduce((a, h) => a + h.neto, 0) / span
  }
  return (cfg.semanaEstimada * 0.9) / 7 // ~10% se va en bencina
}

/** % de la cuota que corresponde hoy en fase 1. */
export function pctCuotaFase1(cfg: Config, falta: number, fecha: string, objetivo: string, netoDia: number) {
  if (cfg.modoCuota === 'fijo') return cfg.fase1.cuota
  const diasRestantes = Math.max(1, daysBetween(fecha, objetivo) + 1)
  const esperado = netoDia * diasRestantes
  const pct = esperado > 0 ? (falta / esperado) * 100 : cfg.pctMax
  return clamp(pct, cfg.pctMin, cfg.pctMax)
}

function repartirResto(monto: number, base: Pcts, out: Asignacion) {
  const keys: BolsilloKey[] = ['personal', 'mant', 'ahorro', 'inv']
  const total = keys.reduce((a, k) => a + base[k], 0)
  if (total <= 0) {
    out.personal += monto
    return
  }
  for (const k of keys) out[k] += (monto * base[k]) / total
}

export function calcular(cfg: Config, pedidos: Pedido[], movs: Movimiento[]) {
  const ck = costoKm(cfg, pedidos, movs).usado
  const asign: Record<string, Asignacion> = {}
  const ciclos: Record<string, Ciclo> = {}
  const historial: { fecha: string; neto: number }[] = []
  let actual: Ciclo | null = null

  for (const p of ordenar(pedidos)) {
    const c = cicloDe(p.fecha, cfg.diaCorte)
    if (!actual || actual.inicio !== c.inicio) {
      const traer: number = actual ? actual.adelanto : 0
      const arrastre = Math.min(traer, cfg.cuota)
      actual = {
        inicio: c.inicio,
        fin: c.fin,
        objetivo: addDays(c.inicio, Math.max(1, cfg.diaObjetivo) - 1),
        arrastre,
        pagado: arrastre,
        adelanto: traer - arrastre,
        listaEl: arrastre >= cfg.cuota && cfg.cuota > 0 ? c.inicio : null,
        ingreso: 0,
        neto: 0,
        pedidos: 0,
        dias: [],
      }
      ciclos[c.inicio] = actual
    }
    const C = actual
    const g = ingreso(p)
    const bencina = Math.min(Math.max(g, 0), (p.km || 0) * ck)
    const neto = Math.max(0, g - bencina)
    const a: Asignacion = { bencina, neto, cuota: 0, adelanto: 0, personal: 0, mant: 0, ahorro: 0, inv: 0, fase: 1, pctCuota: 0 }

    const falta = cfg.cuota - C.pagado
    let n1 = 0
    let n2 = neto
    let pct = 0
    if (falta > 0) {
      pct = pctCuotaFase1(cfg, falta, p.fecha, C.objetivo, netoDiarioEsperado(cfg, historial, p.fecha))
      const necesario = pct > 0 ? falta / (pct / 100) : Infinity
      n1 = Math.min(neto, necesario)
      n2 = neto - n1
    }
    // parte en fase 1
    a.cuota = (n1 * pct) / 100
    repartirResto(n1 - a.cuota, cfg.fase1, a)
    // parte en fase 2 (cuota ya cubierta)
    if (n2 > 0) {
      a.adelanto = (n2 * cfg.fase2.cuota) / 100
      a.personal += (n2 * cfg.fase2.personal) / 100
      a.mant += (n2 * cfg.fase2.mant) / 100
      a.ahorro += (n2 * cfg.fase2.ahorro) / 100
      a.inv += (n2 * cfg.fase2.inv) / 100
      a.fase = n1 > 0 ? 1 : 2
    }
    a.pctCuota = neto ? ((a.cuota + a.adelanto) / neto) * 100 : 0

    C.pagado += a.cuota
    C.adelanto += a.adelanto
    if (!C.listaEl && C.pagado >= cfg.cuota - 0.5 && cfg.cuota > 0) C.listaEl = p.fecha
    C.ingreso += g
    C.neto += neto
    C.pedidos++
    if (!C.dias.includes(p.fecha)) C.dias.push(p.fecha)
    historial.push({ fecha: p.fecha, neto })
    asign[p.id] = a
  }

  const asignado = { bencina: 0, cuota: 0, adelanto: 0, personal: 0, mant: 0, ahorro: 0, inv: 0 }
  for (const a of Object.values(asign)) {
    asignado.bencina += a.bencina
    asignado.cuota += a.cuota
    asignado.adelanto += a.adelanto
    asignado.personal += a.personal
    asignado.mant += a.mant
    asignado.ahorro += a.ahorro
    asignado.inv += a.inv
  }
  const gastado = { bencina: 0, cuota: 0, personal: 0, mant: 0, ahorro: 0, inv: 0 }
  for (const m of movs) {
    if (m.tipo === 'bencina') gastado.bencina += m.monto
    else if (m.tipo === 'cuota') gastado.cuota += m.monto
    else gastado[m.bolsillo || 'personal'] += m.monto
  }
  const saldos = {
    bencina: asignado.bencina - gastado.bencina,
    cuota: asignado.cuota + asignado.adelanto - gastado.cuota,
    personal: asignado.personal - gastado.personal,
    mant: asignado.mant - gastado.mant,
    ahorro: asignado.ahorro - gastado.ahorro,
    inv: asignado.inv - gastado.inv,
  }
  return { costoKm: ck, asign, ciclos, asignado, gastado, saldos, historial }
}

export type Resultado = ReturnType<typeof calcular>

/** Ciclo de una fecha, aunque todavía no tenga pedidos (trae el adelanto del ciclo anterior). */
export function cicloActual(cfg: Config, r: Resultado, hoy: string): Ciclo {
  const c = cicloDe(hoy, cfg.diaCorte)
  if (r.ciclos[c.inicio]) return r.ciclos[c.inicio]
  const prev = Object.keys(r.ciclos).filter((k) => k < c.inicio).sort().pop()
  const traer = prev ? r.ciclos[prev].adelanto : 0
  const arrastre = Math.min(traer, cfg.cuota)
  return {
    inicio: c.inicio,
    fin: c.fin,
    objetivo: addDays(c.inicio, Math.max(1, cfg.diaObjetivo) - 1),
    arrastre,
    pagado: arrastre,
    adelanto: traer - arrastre,
    listaEl: arrastre >= cfg.cuota && cfg.cuota > 0 ? c.inicio : null,
    ingreso: 0,
    neto: 0,
    pedidos: 0,
    dias: [],
  }
}

/** % que iría hoy a la cuota con un pedido nuevo (para mostrar en Inicio). */
export function pctHoy(cfg: Config, r: Resultado, hoy: string) {
  const C = cicloActual(cfg, r, hoy)
  const falta = cfg.cuota - C.pagado
  if (falta <= 0) return { fase: 2 as const, pct: cfg.fase2.cuota }
  return { fase: 1 as const, pct: pctCuotaFase1(cfg, falta, hoy, C.objetivo, netoDiarioEsperado(cfg, r.historial, addDays(hoy, 1))) }
}

/** Semanas del ciclo (de 7 días desde el inicio) con lo que fue a cuota y a lo demás. */
export function semanasCiclo(C: Ciclo, pedidos: Pedido[], r: Resultado) {
  const n = Math.ceil((daysBetween(C.inicio, C.fin) + 1) / 7)
  const semanas = Array.from({ length: n }, (_, i) => {
    const desde = addDays(C.inicio, i * 7)
    const hasta = i === n - 1 ? C.fin : addDays(desde, 6)
    return { n: i + 1, desde, hasta, ingreso: 0, bencina: 0, cuota: 0, adelanto: 0, personal: 0, otros: 0, pedidos: 0 }
  })
  for (const p of pedidos) {
    if (p.fecha < C.inicio || p.fecha > C.fin) continue
    const i = Math.min(n - 1, Math.floor(daysBetween(C.inicio, p.fecha) / 7))
    const a = r.asign[p.id]
    const s = semanas[i]
    s.ingreso += ingreso(p)
    s.pedidos++
    if (!a) continue
    s.bencina += a.bencina
    s.cuota += a.cuota
    s.adelanto += a.adelanto
    s.personal += a.personal
    s.otros += a.mant + a.ahorro + a.inv
  }
  return semanas
}
