import { useState } from 'react'
import { BOLSILLOS, COLOR_BENCINA, costoKm, type BolsilloKey, type Movimiento } from '../lib/engine'
import { setDatos } from '../lib/store'
import { clp, fechaCorta, num } from '../lib/format'
import type { Ctx } from '../App'
import { Icon, ICONO_BOLSILLO } from './Icon'
import { Confirmar, Sheet } from './Sheet'

const NOMBRE_MOV = { bencina: 'Carga de bencina', cuota: 'Pago de cuota', gasto: 'Gasto' }

export default function BolsilloSheet({ k, datos, r, abrir, cerrar }: Ctx & { k: BolsilloKey | 'bencina'; cerrar: () => void }) {
  const [borrar, setBorrar] = useState<Movimiento | null>(null)
  const info = k === 'bencina' ? { nombre: 'Bencina', color: COLOR_BENCINA, desc: 'Se aparta por cada km' } : BOLSILLOS.find((b) => b.key === k)!
  const saldo = r.saldos[k]
  const asignado = k === 'cuota' ? r.asignado.cuota + r.asignado.adelanto : r.asignado[k]
  const gastado = r.gastado[k]
  const movs = datos.movimientos
    .filter((m) => (k === 'bencina' ? m.tipo === 'bencina' : k === 'cuota' ? m.tipo === 'cuota' : m.tipo === 'gasto' && (m.bolsillo || 'personal') === k))
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
  const ck = costoKm(datos.config, datos.pedidos, datos.movimientos)

  if (borrar)
    return (
      <Confirmar
        texto={`Se borrará este movimiento de ${clp(borrar.monto)}.`}
        accion="Borrar"
        cerrar={() => setBorrar(null)}
        si={() => setDatos((d) => ({ ...d, movimientos: d.movimientos.filter((m) => m.id !== borrar.id) }))}
      />
    )

  const accion = k === 'bencina' ? { t: 'Cargar bencina', mov: 'bencina' as const } : k === 'cuota' ? { t: 'Pagar cuota', mov: 'cuota' as const } : { t: 'Registrar gasto', mov: 'gasto' as const }

  return (
    <Sheet titulo={info.nombre} cerrar={cerrar}>
      <div className="bol-hero" style={{ ['--c' as string]: info.color }}>
        <span className="bol-ico">
          <Icon n={ICONO_BOLSILLO[k]} />
        </span>
        <span className="muted">Disponible</span>
        <b className={'money big' + (saldo < 0 ? ' neg' : '')}>{clp(saldo)}</b>
        <div className="bol-split">
          <span>
            Entró <b>{clp(asignado)}</b>
          </span>
          <span>
            Salió <b>{clp(gastado)}</b>
          </span>
        </div>
      </div>
      {k === 'cuota' && r.asignado.adelanto > 0 && <p className="note">Incluye {clp(r.asignado.adelanto)} adelantados para las próximas cuotas.</p>}
      {k === 'bencina' && (
        <p className="note">
          Costo usado: <b>{clp(ck.usado)}/km</b>.{' '}
          {ck.real ? `Calculado con tus ${ck.cargas} cargas y ${num(ck.km, 1)} km (incluye los km sin pedido).` : 'Registra 2 cargas o más para calcular tu costo real.'}
          {saldo < 0 && ' Estás gastando más de lo que apartas: revisa el costo por km en Ajustes.'}
        </p>
      )}
      <button
        className="btn primary full"
        type="button"
        onClick={() => {
          cerrar()
          abrir({ tipo: 'mov', mov: accion.mov, bolsillo: k === 'bencina' ? undefined : k })
        }}
      >
        {accion.t}
      </button>
      <h3 className="sub-title">Movimientos</h3>
      {movs.length ? (
        <ul className="tx-list">
          {movs.map((m) => (
            <li key={m.id} className="tx">
              <span className="tx-ico out">
                <Icon n={m.tipo === 'bencina' ? 'fuel' : m.tipo === 'cuota' ? 'bike' : 'wallet'} size={18} />
              </span>
              <span className="tx-main">
                <b>{m.nota || NOMBRE_MOV[m.tipo]}</b>
                <small>
                  {fechaCorta(m.fecha)}
                  {m.litros ? ` · ${num(m.litros, 1)} L` : ''}
                </small>
              </span>
              <span className="tx-amt out">−{clp(m.monto)}</span>
              <button className="icon-btn sm" type="button" aria-label="Borrar movimiento" onClick={() => setBorrar(m)}>
                <Icon n="trash" size={16} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty">Todavía no hay movimientos.</p>
      )}
    </Sheet>
  )
}
