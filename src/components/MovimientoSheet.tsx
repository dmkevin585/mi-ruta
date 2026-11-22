import { useState } from 'react'
import { BOLSILLOS, type BolsilloKey, type Movimiento } from '../lib/engine'
import { nuevoId, setDatos } from '../lib/store'
import { clp, hoyISO } from '../lib/format'
import { toast } from '../App'
import { Sheet } from './Sheet'

const TITULO = { bencina: 'Cargar bencina', cuota: 'Pagar cuota', gasto: 'Registrar gasto' }

export default function MovimientoSheet({ tipo, bolsillo, cerrar }: { tipo: Movimiento['tipo']; bolsillo?: BolsilloKey; cerrar: () => void }) {
  const [monto, setMonto] = useState('')
  const [litros, setLitros] = useState('')
  const [b, setB] = useState<BolsilloKey>(bolsillo && bolsillo !== 'cuota' ? bolsillo : 'mant')
  const [fecha, setFecha] = useState(hoyISO())
  const [nota, setNota] = useState('')

  const guardar = (e: React.FormEvent) => {
    e.preventDefault()
    const m = parseFloat(monto) || 0
    if (m <= 0) return toast('Ingresa el monto')
    const mov: Movimiento = { id: nuevoId(), tipo, monto: m, fecha, nota: nota.trim() }
    if (tipo === 'bencina' && litros) mov.litros = parseFloat(litros.replace(',', '.')) || undefined
    if (tipo === 'gasto') mov.bolsillo = b
    setDatos((d) => ({ ...d, movimientos: [...d.movimientos, mov] }))
    toast(`${TITULO[tipo]} · ${clp(m)}`)
    cerrar()
  }

  return (
    <Sheet titulo={TITULO[tipo]} cerrar={cerrar}>
      <form onSubmit={guardar}>
        <div className="grid2">
          <label className="field">
            <span>Monto</span>
            <input id="m-monto" type="number" inputMode="numeric" min="1" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0" autoFocus required />
          </label>
          {tipo === 'bencina' && (
            <label className="field">
              <span>Litros (opcional)</span>
              <input id="m-litros" type="number" inputMode="decimal" step="0.1" min="0" value={litros} onChange={(e) => setLitros(e.target.value)} placeholder="0" />
            </label>
          )}
          {tipo === 'gasto' && (
            <label className="field">
              <span>Sale de</span>
              <select id="m-bolsillo" value={b} onChange={(e) => setB(e.target.value as BolsilloKey)}>
                {BOLSILLOS.filter((x) => x.key !== 'cuota').map((x) => (
                  <option key={x.key} value={x.key}>
                    {x.nombre}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="field">
            <span>Fecha</span>
            <input id="m-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
          </label>
          <label className="field">
            <span>Nota</span>
            <input id="m-nota" type="text" maxLength={60} value={nota} onChange={(e) => setNota(e.target.value)} placeholder={tipo === 'gasto' ? 'Ej: cambio de aceite' : ''} />
          </label>
        </div>
        <div className="acciones">
          <button type="submit" className="btn primary grow">
            Guardar
          </button>
        </div>
      </form>
    </Sheet>
  )
}
