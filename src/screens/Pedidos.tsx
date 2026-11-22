import { useState } from 'react'
import { addDays, cicloDe, fromISO, ingreso, ordenar, toISO } from '../lib/engine'
import { clp, fechaLarga, hoyISO, MESES, num } from '../lib/format'
import type { Ctx } from '../App'
import { Icon } from '../components/Icon'
import { PedidoFila } from './Inicio'

type Periodo = 'dia' | 'semana' | 'mes' | 'ciclo'

function rango(p: Periodo, ancla: string, corte: number) {
  if (p === 'dia') return { desde: ancla, hasta: ancla, label: fechaLarga(ancla) }
  if (p === 'semana') {
    const w = (fromISO(ancla).getDay() + 6) % 7
    const desde = addDays(ancla, -w)
    const hasta = addDays(desde, 6)
    const a = fromISO(desde)
    const b = fromISO(hasta)
    return { desde, hasta, label: `${a.getDate()} ${MESES[a.getMonth()]} – ${b.getDate()} ${MESES[b.getMonth()]}` }
  }
  if (p === 'mes') {
    const d = fromISO(ancla)
    return { desde: toISO(new Date(d.getFullYear(), d.getMonth(), 1)), hasta: toISO(new Date(d.getFullYear(), d.getMonth() + 1, 0)), label: `${MESES[d.getMonth()]} ${d.getFullYear()}` }
  }
  const c = cicloDe(ancla, corte)
  const a = fromISO(c.inicio)
  const b = fromISO(c.fin)
  return { desde: c.inicio, hasta: c.fin, label: `Ciclo ${a.getDate()} ${MESES[a.getMonth()]} – ${b.getDate()} ${MESES[b.getMonth()]}` }
}

export default function Pedidos({ datos, r, abrir }: Ctx) {
  const [periodo, setPeriodo] = useState<Periodo>('semana')
  const [ancla, setAncla] = useState(hoyISO())
  const [app, setApp] = useState<'all' | 'uber' | 'pya'>('all')
  const rg = rango(periodo, ancla, datos.config.diaCorte)
  const lista = ordenar(datos.pedidos.filter((p) => p.fecha >= rg.desde && p.fecha <= rg.hasta && (app === 'all' || p.app === app))).reverse()

  const ing = lista.reduce((a, p) => a + ingreso(p), 0)
  const neto = lista.reduce((a, p) => a + (r.asign[p.id]?.neto || 0), 0)
  const km = lista.reduce((a, p) => a + p.km, 0)

  const mover = (d: number) => {
    const a = fromISO(ancla)
    if (periodo === 'dia') a.setDate(a.getDate() + d)
    else if (periodo === 'semana') a.setDate(a.getDate() + 7 * d)
    else a.setMonth(a.getMonth() + d)
    setAncla(toISO(a))
  }

  const porDia: Record<string, typeof lista> = {}
  for (const p of lista) (porDia[p.fecha] ||= []).push(p)

  return (
    <div className="screen">
      <header className="top">
        <h1>Pedidos</h1>
      </header>
      <div className="tabs-seg" role="tablist">
        {(['dia', 'semana', 'mes', 'ciclo'] as Periodo[]).map((k) => (
          <button key={k} type="button" role="tab" aria-selected={periodo === k} onClick={() => setPeriodo(k)}>
            {{ dia: 'Día', semana: 'Semana', mes: 'Mes', ciclo: 'Ciclo' }[k]}
          </button>
        ))}
      </div>
      <div className="period-nav">
        <button className="icon-btn" type="button" onClick={() => mover(-1)} aria-label="Anterior">
          <Icon n="left" />
        </button>
        <b>{rg.label}</b>
        <button className="icon-btn" type="button" onClick={() => mover(1)} aria-label="Siguiente">
          <Icon n="right" />
        </button>
      </div>
      <div className="chips">
        {(['all', 'uber', 'pya'] as const).map((k) => (
          <button key={k} type="button" className={'chip' + (app === k ? ' on' : '')} onClick={() => setApp(k)}>
            {{ all: 'Todas', uber: 'Uber Eats', pya: 'PedidosYa' }[k]}
          </button>
        ))}
      </div>

      <section className="hero light">
        <span>Ingreso del periodo</span>
        <b className="money hero-num">{clp(ing)}</b>
        <div className="stats">
          <div>
            <b>{clp(neto)}</b>
            <small>Neto sin bencina</small>
          </div>
          <div>
            <b>{lista.length}</b>
            <small>Pedidos</small>
          </div>
          <div>
            <b>{num(km, 1)} km</b>
            <small>Recorrido</small>
          </div>
          <div>
            <b>{km ? clp(ing / km) : '—'}</b>
            <small>Por km</small>
          </div>
        </div>
      </section>

      {Object.keys(porDia).length ? (
        Object.entries(porDia).map(([f, ps]) => (
          <div key={f}>
            <div className="row day-head">
              <b>{fechaLarga(f)}</b>
              <span className="muted">{clp(ps.reduce((a, p) => a + ingreso(p), 0))}</span>
            </div>
            <ul className="tx-list card">
              {ps.map((p) => (
                <PedidoFila key={p.id} p={p} r={r} abrir={abrir} />
              ))}
            </ul>
          </div>
        ))
      ) : (
        <p className="empty">Sin pedidos en este periodo.</p>
      )}
    </div>
  )
}
