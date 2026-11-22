import { useState } from 'react'
import { ingreso, ordenar, type App, type Pedido, type Resultado } from '../lib/engine'
import { nuevoId, setDatos, type Datos } from '../lib/store'
import { ahoraHM, clp, hoyISO } from '../lib/format'
import { toast } from '../App'
import { Confirmar, Sheet } from './Sheet'

type Campo = 'monto' | 'km' | 'minutos' | 'propina' | 'bono' | 'descuento'
const CAMPOS: { k: Campo; label: string; dec?: boolean }[] = [
  { k: 'monto', label: 'Monto del pedido' },
  { k: 'km', label: 'Kilómetros', dec: true },
  { k: 'minutos', label: 'Tiempo (min)' },
  { k: 'propina', label: 'Propina' },
  { k: 'bono', label: 'Bono' },
  { k: 'descuento', label: 'Descuento' },
]

export default function PedidoSheet({ pedido, r, datos, cerrar }: { pedido?: Pedido; r: Resultado; datos: Datos; cerrar: () => void }) {
  const editando = !!pedido
  const ultimaApp = ordenar(datos.pedidos).pop()?.app || 'pya'
  const [app, setApp] = useState<App>(pedido?.app || ultimaApp)
  const [v, setV] = useState<Record<Campo, string>>(() => {
    const o = {} as Record<Campo, string>
    for (const c of CAMPOS) o[c.k] = pedido && pedido[c.k] ? String(pedido[c.k]) : ''
    return o
  })
  const [fecha, setFecha] = useState(pedido?.fecha || hoyISO())
  const [hora, setHora] = useState(pedido?.hora || ahoraHM())
  const [extra, setExtra] = useState(!!(pedido && (pedido.propina || pedido.bono || pedido.descuento)))
  const [confirmar, setConfirmar] = useState(false)

  const p: Pedido = {
    id: pedido?.id || nuevoId(),
    app,
    monto: parseFloat(v.monto) || 0,
    km: parseFloat(v.km.replace(',', '.')) || 0,
    minutos: parseFloat(v.minutos) || 0,
    propina: parseFloat(v.propina) || 0,
    bono: parseFloat(v.bono) || 0,
    descuento: parseFloat(v.descuento) || 0,
    fecha,
    hora,
  }
  const g = ingreso(p)
  const bencina = Math.min(Math.max(g, 0), p.km * r.costoKm)

  const guardar = (e: React.FormEvent) => {
    e.preventDefault()
    if (g <= 0) return toast('Ingresa el monto del pedido')
    setDatos((d) => ({ ...d, pedidos: editando ? d.pedidos.map((x) => (x.id === p.id ? p : x)) : [...d.pedidos, p] }))
    toast(editando ? 'Pedido actualizado' : `Pedido registrado · ${clp(g)}`)
    cerrar()
  }

  if (confirmar)
    return (
      <Confirmar
        texto={`Se eliminará el pedido de ${clp(ingreso(pedido!))}.`}
        accion="Eliminar"
        cerrar={cerrar}
        si={() => {
          setDatos((d) => ({ ...d, pedidos: d.pedidos.filter((x) => x.id !== pedido!.id) }))
          toast('Pedido eliminado')
        }}
      />
    )

  const inp = (c: (typeof CAMPOS)[number]) => (
    <label className="field" key={c.k}>
      <span>{c.label}</span>
      <input
        id={'p-' + c.k}
        type="number"
        inputMode={c.dec ? 'decimal' : 'numeric'}
        step={c.dec ? '0.1' : '1'}
        min="0"
        value={v[c.k]}
        onChange={(e) => setV({ ...v, [c.k]: e.target.value })}
        placeholder="0"
        autoFocus={c.k === 'monto' && !editando}
      />
    </label>
  )

  return (
    <Sheet titulo={editando ? 'Editar pedido' : 'Nuevo pedido'} cerrar={cerrar}>
      <form onSubmit={guardar}>
        <div className="seg-app">
          <button type="button" className="uber" aria-pressed={app === 'uber'} onClick={() => setApp('uber')}>
            Uber Eats
          </button>
          <button type="button" className="pya" aria-pressed={app === 'pya'} onClick={() => setApp('pya')}>
            PedidosYa
          </button>
        </div>
        <div className="grid2">{CAMPOS.slice(0, 3).map(inp)}</div>
        {extra ? (
          <div className="grid2">{CAMPOS.slice(3).map(inp)}</div>
        ) : (
          <button type="button" className="link" onClick={() => setExtra(true)}>
            + Propina, bono o descuento
          </button>
        )}
        <div className="grid2">
          <label className="field">
            <span>Fecha</span>
            <input id="p-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
          </label>
          <label className="field">
            <span>Hora</span>
            <input id="p-hora" type="time" value={hora} onChange={(e) => setHora(e.target.value)} required />
          </label>
        </div>
        <div className="preview">
          <div>
            <span className="muted">Te queda (sin bencina)</span>
            <b className="money">{clp(g - bencina)}</b>
          </div>
          <div className="preview-meta">
            {clp(g)} − bencina {clp(bencina)}
            {p.km > 0 && <> · {clp(g / p.km)}/km</>}
            {p.minutos > 0 && <> · {clp(g / (p.minutos / 60))}/h</>}
          </div>
        </div>
        <div className="acciones">
          {editando && (
            <button type="button" className="btn danger" onClick={() => setConfirmar(true)} style={{ marginRight: 'auto' }}>
              Eliminar
            </button>
          )}
          <button type="submit" className="btn primary grow">
            {editando ? 'Guardar cambios' : 'Registrar pedido'}
          </button>
        </div>
      </form>
    </Sheet>
  )
}
