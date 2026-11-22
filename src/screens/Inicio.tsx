import { BOLSILLOS, COLOR_BENCINA, addDays, cicloActual, daysBetween, fromISO, ingreso, ordenar, pctHoy, type Pedido } from '../lib/engine'
import { nuevoId, setDatos } from '../lib/store'
import { clp, fechaCorta, fechaLarga, hoyISO, num, saludo } from '../lib/format'
import { toast, type Ctx } from '../App'
import { Icon, ICONO_BOLSILLO } from '../components/Icon'

export function PedidoFila({ p, r, abrir, conFecha }: { p: Pedido; r: Ctx['r']; abrir: Ctx['abrir']; conFecha?: boolean }) {
  const a = r.asign[p.id]
  return (
    <li>
      <button className="tx" type="button" onClick={() => abrir({ tipo: 'pedido', pedido: p })}>
        <span className={'tx-ico ' + p.app}>{p.app === 'uber' ? 'U' : 'PY'}</span>
        <span className="tx-main">
          <b>{p.app === 'uber' ? 'Uber Eats' : 'PedidosYa'}</b>
          <small>
            {conFecha ? fechaCorta(p.fecha) + ' · ' : ''}
            {p.hora} · {num(p.km, 1)} km{p.minutos ? ` · ${num(p.minutos)} min` : ''}
            {p.propina ? ` · propina ${clp(p.propina)}` : ''}
          </small>
        </span>
        <span className="tx-amt">
          +{clp(ingreso(p))}
          {a && <small>{a.fase === 1 ? `${Math.round(a.pctCuota)}% a cuota` : 'fase ganancia'}</small>}
        </span>
      </button>
    </li>
  )
}

export default function Inicio({ datos, r, abrir }: Ctx) {
  const cfg = datos.config
  const hoy = hoyISO()
  const C = cicloActual(cfg, r, hoy)
  const lista = C.pagado >= cfg.cuota - 0.5 && cfg.cuota > 0
  const pct = cfg.cuota ? Math.min(1, C.pagado / cfg.cuota) : 0
  const ph = pctHoy(cfg, r, hoy)
  const saldoTotal = Object.values(r.saldos).reduce((a, b) => a + b, 0)

  // semana actual (lunes a domingo)
  const dow = (fromISO(hoy).getDay() + 6) % 7
  const lunes = addDays(hoy, -dow)
  const semana = datos.pedidos.filter((p) => p.fecha >= lunes && p.fecha <= hoy)
  const ingSemana = semana.reduce((a, p) => a + ingreso(p), 0)
  const diasSemana = new Set(semana.map((p) => p.fecha)).size
  const hoyPedidos = semana.filter((p) => p.fecha === hoy)
  const ingHoy = hoyPedidos.reduce((a, p) => a + ingreso(p), 0)

  const ultimos = ordenar(datos.pedidos).reverse().slice(0, 6)
  const activa = datos.jornadas.find((j) => !j.fin)
  const diasObjetivo = daysBetween(hoy, C.objetivo)

  const jornada = () => {
    if (activa) {
      setDatos((d) => ({ ...d, jornadas: d.jornadas.map((j) => (j.id === activa.id ? { ...j, fin: Date.now() } : j)) }))
      const m = Math.round((Date.now() - activa.inicio) / 6e4)
      toast(`Jornada terminada · ${Math.floor(m / 60)} h ${m % 60} min`)
    } else {
      setDatos((d) => ({ ...d, jornadas: [...d.jornadas, { id: nuevoId(), inicio: Date.now(), fin: null }] }))
      toast('Jornada iniciada')
    }
  }

  let estado: string
  if (lista) estado = C.listaEl && C.listaEl !== C.inicio ? `Lista el ${fechaCorta(C.listaEl)} · ya llevas ${clp(C.adelanto)} para la próxima` : `Cubierta con adelanto del mes anterior`
  else if (diasObjetivo >= 0) estado = `Faltan ${clp(cfg.cuota - C.pagado)} · meta: ${fechaCorta(C.objetivo)} (${diasObjetivo === 0 ? 'hoy' : `en ${diasObjetivo} días`})`
  else estado = `Faltan ${clp(cfg.cuota - C.pagado)} · se pasó la fecha meta, va el máximo a la cuota`

  return (
    <div className="screen">
      <header className="top">
        <div>
          <span className="muted">{saludo()}</span>
          <h1>Mi Ruta</h1>
        </div>
        <button className={'chip' + (activa ? ' on' : '')} type="button" onClick={jornada}>
          <Icon n={activa ? 'stop' : 'play'} size={14} />
          {activa ? 'En jornada' : 'Iniciar jornada'}
        </button>
      </header>

      <section className="hero">
        <span>Saldo total en tus bolsillos</span>
        <b className="money hero-num">{clp(saldoTotal)}</b>
        <div className="hero-row">
          <span>
            Hoy <b>{clp(ingHoy)}</b> · {hoyPedidos.length} pedidos
          </span>
          <span>
            Ciclo <b>{clp(C.ingreso)}</b>
          </span>
        </div>
      </section>

      <button className="card cuota-card" type="button" onClick={() => abrir({ tipo: 'bolsillo', key: 'cuota' })}>
        <div className="row">
          <span className="bol-ico" style={{ ['--c' as string]: BOLSILLOS[0].color }}>
            <Icon n="bike" />
          </span>
          <span className="grow">
            <b>Cuota de la moto</b>
            <small className="muted">{lista ? 'Fase ganancia' : 'Juntando cuota'}</small>
          </span>
          <span className={'pill' + (lista ? ' ok' : '')}>{lista ? `${ph.pct}% adelanto` : `${Math.round(ph.pct)}% a cuota`}</span>
        </div>
        <div className="cuota-nums">
          <b className="money">{clp(Math.min(C.pagado, cfg.cuota))}</b>
          <span className="muted">de {clp(cfg.cuota)}</span>
        </div>
        <div className="progress">
          <i style={{ width: pct * 100 + '%' }} />
          {cfg.cuota > 0 && <em style={{ left: Math.min(100, (cfg.diaObjetivo / (daysBetween(C.inicio, C.fin) + 1)) * 100) + '%' }} title="Fecha meta" />}
        </div>
        <small className="muted">{estado}</small>
      </button>

      <div className="bolsillos">
        {[...BOLSILLOS.slice(1), { key: 'bencina' as const, nombre: 'Bencina', color: COLOR_BENCINA, desc: '' }].map((b) => (
          <button key={b.key} className={'card bol' + (b.key === 'personal' ? ' wide' : '')} type="button" onClick={() => abrir({ tipo: 'bolsillo', key: b.key })} style={{ ['--c' as string]: b.color }}>
            <span className="bol-ico">
              <Icon n={ICONO_BOLSILLO[b.key]} size={20} />
            </span>
            <span className="bol-name">{b.nombre}</span>
            <b className={'money' + (r.saldos[b.key] < 0 ? ' neg' : '')}>{clp(r.saldos[b.key])}</b>
          </button>
        ))}
      </div>

      <section className="card">
        <div className="row">
          <b className="grow">Esta semana</b>
          <span className="muted">
            {diasSemana} {diasSemana === 1 ? 'día' : 'días'} · {semana.length} pedidos
          </span>
        </div>
        <div className="cuota-nums">
          <b className="money">{clp(ingSemana)}</b>
          <span className="muted">de {clp(cfg.metaSemanal)}</span>
        </div>
        <div className="progress green">
          <i style={{ width: Math.min(100, cfg.metaSemanal ? (ingSemana / cfg.metaSemanal) * 100 : 0) + '%' }} />
        </div>
      </section>

      <div className="row section-head">
        <h3>Últimos pedidos</h3>
        <a href="#pedidos">Ver todos</a>
      </div>
      {ultimos.length ? (
        <ul className="tx-list card">
          {ultimos.map((p) => (
            <PedidoFila key={p.id} p={p} r={r} abrir={abrir} conFecha={p.fecha !== hoy} />
          ))}
        </ul>
      ) : (
        <div className="card empty-card">
          <b>Aún no hay pedidos</b>
          <p className="muted">Toca el botón + para registrar tu primer pedido, o importa los datos de tu app anterior en Ajustes.</p>
          <a className="btn" href="#ajustes">
            Importar datos
          </a>
        </div>
      )}
      <p className="foot muted">{fechaLarga(hoy)} · ciclo {fechaCorta(C.inicio)} – {fechaCorta(C.fin)}</p>
    </div>
  )
}
