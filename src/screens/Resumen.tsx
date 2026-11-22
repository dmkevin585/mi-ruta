import { useState } from 'react'
import { BOLSILLOS, COLOR_BENCINA, addDays, cicloActual, cicloDe, costoKm, ingreso, semanasCiclo, type Pedido } from '../lib/engine'
import { clp, DIAS, fechaCorta, hoyISO, num } from '../lib/format'
import type { Ctx } from '../App'
import { Icon } from '../components/Icon'

const C_ADEL = '#8FA8FF'
const C_OTROS = '#7B5CFF'

function stats(ps: Pedido[]) {
  const ing = ps.reduce((a, p) => a + ingreso(p), 0)
  const km = ps.reduce((a, p) => a + p.km, 0)
  const min = ps.reduce((a, p) => a + p.minutos, 0)
  const prop = ps.reduce((a, p) => a + p.propina, 0)
  return { n: ps.length, ing, km, min, prop, porPedido: ps.length ? ing / ps.length : 0, porKm: km ? ing / km : 0, porHora: min ? ing / (min / 60) : 0 }
}

export default function Resumen({ datos, r }: Ctx) {
  const cfg = datos.config
  const [ancla, setAncla] = useState(hoyISO())
  const c = cicloDe(ancla, cfg.diaCorte)
  const C = r.ciclos[c.inicio] || cicloActual(cfg, r, ancla)
  const semanas = semanasCiclo(C, datos.pedidos, r)
  const max = Math.max(1, ...semanas.map((s) => s.ingreso))
  const ps = datos.pedidos.filter((p) => p.fecha >= C.inicio && p.fecha <= C.fin)
  const st = stats(ps)
  const u = stats(ps.filter((p) => p.app === 'uber'))
  const y = stats(ps.filter((p) => p.app === 'pya'))
  const horasJornada = datos.jornadas.filter((j) => {
    const d = new Date(j.inicio)
    const f = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return f >= C.inicio && f <= C.fin
  }).reduce((a, j) => a + ((j.fin || Date.now()) - j.inicio) / 36e5, 0)

  // franjas de 2 horas
  const franjas: Record<number, { n: number; s: number }> = {}
  for (const p of ps) {
    const h = Math.floor(parseInt(p.hora) / 2) * 2
    franjas[h] ||= { n: 0, s: 0 }
    franjas[h].n++
    franjas[h].s += ingreso(p)
  }
  const fk = Object.keys(franjas).map(Number).sort((a, b) => a - b)
  const fmax = Math.max(1, ...fk.map((k) => franjas[k].s / franjas[k].n))

  // días de la semana
  const dias: Record<number, { s: number; d: Set<string> }> = {}
  for (const p of ps) {
    const d = new Date(p.fecha + 'T12:00').getDay()
    dias[d] ||= { s: 0, d: new Set() }
    dias[d].s += ingreso(p)
    dias[d].d.add(p.fecha)
  }

  const consejos: string[] = []
  if (u.n >= 3 && y.n >= 3) {
    const [m, o, nm, no] = u.porKm >= y.porKm ? [u, y, 'Uber Eats', 'PedidosYa'] : [y, u, 'PedidosYa', 'Uber Eats']
    consejos.push(`${nm} te paga más por km (${clp(m.porKm)} contra ${clp(o.porKm)} en ${no}). Si te llegan dos pedidos a la vez, prioriza ${nm}.`)
  }
  const buenas = fk.filter((k) => franjas[k].n >= 3)
  if (buenas.length >= 2) {
    const b = buenas.reduce((a, k) => (franjas[k].s / franjas[k].n > franjas[a].s / franjas[a].n ? k : a))
    consejos.push(`Tu mejor franja es de ${b} a ${b + 2} h: ${clp(franjas[b].s / franjas[b].n)} por pedido.`)
  }
  if (st.km) {
    const lim = st.porKm * 0.6
    const malos = ps.filter((p) => p.km && ingreso(p) / p.km < lim).length
    if (malos) consejos.push(`${malos} de ${st.n} pedidos pagaron menos de ${clp(lim)} por km. Úsalo como regla para rechazar viajes largos y mal pagados.`)
  }
  const ck = costoKm(cfg, datos.pedidos, datos.movimientos)
  if (r.saldos.bencina < 0) consejos.push(`Gastas más bencina de la que apartas. Tu costo real es ${clp(ck.real || ck.usado)}/km: revisa Ajustes.`)
  if (C.listaEl) consejos.push(`Cuota lista el ${fechaCorta(C.listaEl)}. Desde ahí, solo el ${cfg.fase2.cuota}% va a adelanto y el ${cfg.fase2.personal}% es para ti.`)

  return (
    <div className="screen">
      <header className="top">
        <h1>Resumen</h1>
      </header>
      <div className="period-nav">
        <button className="icon-btn" type="button" onClick={() => setAncla(addDays(c.inicio, -1))} aria-label="Ciclo anterior">
          <Icon n="left" />
        </button>
        <b>
          Ciclo {fechaCorta(C.inicio)} – {fechaCorta(C.fin)}
        </b>
        <button className="icon-btn" type="button" onClick={() => setAncla(addDays(c.fin, 1))} aria-label="Ciclo siguiente">
          <Icon n="right" />
        </button>
      </div>

      <section className="card">
        <b>Cómo se repartió cada semana</b>
        <p className="muted small">Primero se junta la cuota; cuando está lista, sube lo que va para ti.</p>
        <div className="weeks">
          {semanas.map((s) => {
            const partes = [
              { v: s.bencina, c: COLOR_BENCINA, n: 'Bencina' },
              { v: s.cuota, c: BOLSILLOS[0].color, n: 'Cuota' },
              { v: s.adelanto, c: C_ADEL, n: 'Adelanto' },
              { v: s.personal, c: BOLSILLOS[1].color, n: 'Personal' },
              { v: s.otros, c: C_OTROS, n: 'Mant., ahorro e inversión' },
            ]
            return (
              <div key={s.n} className="week">
                <div className="week-label">
                  <b>Semana {s.n}</b>
                  <small className="muted">
                    {fechaCorta(s.desde)} – {fechaCorta(s.hasta)}
                  </small>
                </div>
                <div className="week-bar" style={{ width: Math.max(4, (s.ingreso / max) * 100) + '%' }}>
                  {s.ingreso > 0 ? partes.filter((x) => x.v > 0).map((x) => <i key={x.n} title={`${x.n}: ${clp(x.v)}`} style={{ flex: x.v, background: x.c }} />) : <i style={{ flex: 1, background: 'var(--line)' }} />}
                </div>
                <div className="week-nums">
                  <b className="money">{clp(s.ingreso)}</b>
                  <small className="muted">{s.ingreso ? `para ti ${clp(s.personal)}` : 'sin pedidos'}</small>
                </div>
              </div>
            )
          })}
        </div>
        <div className="legend">
          {[
            ['Bencina', COLOR_BENCINA],
            ['Cuota', BOLSILLOS[0].color],
            ['Adelanto', C_ADEL],
            ['Personal', BOLSILLOS[1].color],
            ['Mant., ahorro, inversión', C_OTROS],
          ].map(([n, c]) => (
            <span key={n}>
              <i style={{ background: c }} />
              {n}
            </span>
          ))}
        </div>
      </section>

      <div className="stat-grid">
        <div className="card stat">
          <small>Ingreso</small>
          <b>{clp(st.ing)}</b>
        </div>
        <div className="card stat">
          <small>Por día trabajado</small>
          <b>{C.dias.length ? clp(st.ing / C.dias.length) : '—'}</b>
        </div>
        <div className="card stat">
          <small>Por pedido</small>
          <b>{clp(st.porPedido)}</b>
        </div>
        <div className="card stat">
          <small>{horasJornada > 0.2 ? 'Por hora conectado' : 'Por hora en pedido'}</small>
          <b>{horasJornada > 0.2 ? clp(st.ing / horasJornada) : st.min ? clp(st.porHora) : '—'}</b>
        </div>
      </div>

      <section className="card">
        <b>Uber Eats vs PedidosYa</b>
        <table className="cmp">
          <thead>
            <tr>
              <th />
              <th>Uber</th>
              <th>PedidosYa</th>
            </tr>
          </thead>
          <tbody>
            {(
              [
                ['Pedidos', (x: typeof u) => String(x.n)],
                ['Ingreso', (x: typeof u) => clp(x.ing)],
                ['Por pedido', (x: typeof u) => clp(x.porPedido)],
                ['Por km', (x: typeof u) => clp(x.porKm)],
                ['Por hora', (x: typeof u) => clp(x.porHora)],
                ['Km promedio', (x: typeof u) => (x.n ? num(x.km / x.n, 1) : '—')],
                ['Propinas', (x: typeof u) => clp(x.prop)],
              ] as const
            ).map(([l, f]) => (
              <tr key={l}>
                <td>{l}</td>
                <td>{f(u)}</td>
                <td>{f(y)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <b>Mejores horarios</b>
        <p className="muted small">Promedio por pedido en cada franja</p>
        {fk.length ? (
          fk.map((k) => (
            <div key={k} className="hbar">
              <span>
                {k}–{k + 2} h
              </span>
              <span className="track">
                <i style={{ width: ((franjas[k].s / franjas[k].n) / fmax) * 100 + '%' }} />
              </span>
              <span className="money small">
                {clp(franjas[k].s / franjas[k].n)} <small className="muted">· {franjas[k].n}</small>
              </span>
            </div>
          ))
        ) : (
          <p className="empty">Sin datos todavía.</p>
        )}
        {Object.keys(dias).length > 0 && (
          <>
            <p className="muted small" style={{ marginTop: 16 }}>
              Promedio por día de la semana
            </p>
            <div className="chips">
              {[1, 2, 3, 4, 5, 6, 0]
                .filter((d) => dias[d])
                .map((d) => (
                  <span key={d} className="chip static">
                    {DIAS[d]} <b>{clp(dias[d].s / dias[d].d.size)}</b>
                  </span>
                ))}
            </div>
          </>
        )}
      </section>

      <section className="card">
        <div className="row">
          <Icon n="bulb" />
          <b className="grow">Consejos según tus números</b>
        </div>
        {consejos.length ? (
          <ul className="tips">
            {consejos.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        ) : (
          <p className="empty">Registra algunos pedidos más para ver consejos.</p>
        )}
      </section>
    </div>
  )
}
