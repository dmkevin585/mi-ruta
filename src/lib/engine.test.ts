import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, calcular, addDays, type Pedido, type Config } from './engine'

// Simula un mes: `dias` días de reparto por semana, `semanal` de ingreso bruto por semana.
function simular(semanal: number, diasSemana: number[], cfg: Config = DEFAULT_CONFIG, meses = 1) {
  const pedidos: Pedido[] = []
  let id = 0
  const inicio = '2026-11-01' // domingo
  for (let d = 0; d < 30 * meses; d++) {
    const fecha = addDays(inicio, d)
    const dow = new Date(fecha + 'T12:00').getDay()
    if (!diasSemana.includes(dow)) continue
    const porDia = semanal / diasSemana.length
    for (let i = 0; i < 6; i++) {
      pedidos.push({ id: String(id++), app: i % 2 ? 'uber' : 'pya', monto: porDia / 6, propina: 0, bono: 0, descuento: 0, km: 4, minutos: 20, fecha, hora: `${12 + i}:00` })
    }
  }
  return { r: calcular(cfg, pedidos, []), pedidos }
}

describe('reparto con cuota de $160.000', () => {
  it('con $90.000 a la semana (4 días) la cuota queda lista cerca del día 21', () => {
    const { r } = simular(90000, [4, 5, 6, 0])
    const c = r.ciclos['2026-11-01']
    expect(c.listaEl).not.toBeNull()
    const dia = Number(c.listaEl!.slice(8))
    expect(dia).toBeGreaterThanOrEqual(16)
    expect(dia).toBeLessThanOrEqual(23)
  })

  it('con $80.000 a la semana (3 días) igual se completa dentro del mes', () => {
    const { r } = simular(80000, [5, 6, 0])
    const c = r.ciclos['2026-11-01']
    expect(c.listaEl).not.toBeNull()
    expect(Number(c.listaEl!.slice(8))).toBeLessThanOrEqual(26)
  })

  it('nunca junta más que la cuota en el ciclo; lo extra va a adelanto', () => {
    const { r } = simular(150000, [1, 2, 3, 4, 5])
    const c = r.ciclos['2026-11-01']
    expect(c.pagado).toBeCloseTo(160000, 0)
    expect(c.adelanto).toBeGreaterThan(0)
  })

  it('cada peso del neto termina en algún bolsillo', () => {
    const { r } = simular(90000, [4, 5, 6, 0])
    for (const a of Object.values(r.asign)) {
      const suma = a.cuota + a.adelanto + a.personal + a.mant + a.ahorro + a.inv
      expect(suma).toBeCloseTo(a.neto, 6)
    }
  })

  it('el adelanto pasa al mes siguiente como cuota ya pagada', () => {
    const { r } = simular(120000, [1, 2, 3, 4, 5], DEFAULT_CONFIG, 2)
    const nov = r.ciclos['2026-11-01']
    const dic = r.ciclos['2026-12-01']
    expect(dic.arrastre).toBeCloseTo(Math.min(nov.adelanto, 160000), 0)
  })

  it('modo fijo usa exactamente el % de fase 1', () => {
    const cfg = { ...DEFAULT_CONFIG, modoCuota: 'fijo' as const }
    const { r } = simular(90000, [4, 5, 6, 0], cfg)
    const primero = Object.values(r.asign)[0]
    expect(primero.cuota / primero.neto).toBeCloseTo(0.72, 6)
  })
})
