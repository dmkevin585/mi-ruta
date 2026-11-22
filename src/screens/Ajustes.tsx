import { useState } from 'react'
import { BOLSILLOS, DEFAULT_CONFIG, costoKm, ingreso, ordenar, type BolsilloKey, type Config } from '../lib/engine'
import { descargar, parsearImport, setDatos, sumaPcts, type Importado } from '../lib/store'
import { clp, fechaCorta, hoyISO } from '../lib/format'
import { toast, type Ctx } from '../App'
import { Confirmar, Sheet } from '../components/Sheet'

function Num({ id, label, value, onChange, step, suf }: { id: string; label: string; value: number; onChange: (n: number) => void; step?: string; suf?: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <div className="with-suf">
        <input id={id} type="number" inputMode={step ? 'decimal' : 'numeric'} step={step || '1'} min="0" value={Number.isFinite(value) ? value : ''} onChange={(e) => onChange(parseFloat(e.target.value))} />
        {suf && <em>{suf}</em>}
      </div>
    </label>
  )
}

export default function Ajustes({ datos, r }: Ctx) {
  const [c, setC] = useState<Config>(() => structuredClone(datos.config))
  const [texto, setTexto] = useState('')
  const [prev, setPrev] = useState<Importado | null>(null)
  const [borrar, setBorrar] = useState(false)
  const set = (p: Partial<Config>) => setC({ ...c, ...p })
  const setPct = (fase: 'fase1' | 'fase2', k: BolsilloKey, v: number) => setC({ ...c, [fase]: { ...c[fase], [k]: v || 0 } })
  const s1 = sumaPcts(c.fase1)
  const s2 = sumaPcts(c.fase2)
  const ck = costoKm(datos.config, datos.pedidos, datos.movimientos)
  const cambiado = JSON.stringify(c) !== JSON.stringify(datos.config)

  const guardar = () => {
    if (s1 !== 100 || s2 !== 100) return toast('Cada fase debe sumar 100%')
    const cfg = { ...c, diaCorte: Math.min(28, Math.max(1, Math.round(c.diaCorte || 1))), pctMin: Math.min(c.pctMin, c.pctMax) }
    setDatos((d) => ({ ...d, config: cfg }))
    setC(cfg)
    toast('Ajustes guardados')
  }

  const revisar = (t: string) => {
    try {
      const res = parsearImport(t)
      if (!res.pedidos.length) return toast('No encontré pedidos con fecha')
      setPrev(res)
    } catch {
      toast('No pude leer el archivo. Debe ser JSON o CSV.')
    }
  }

  return (
    <div className="screen">
      <header className="top">
        <h1>Ajustes</h1>
      </header>

      <section className="card">
        <b>Cuota de la moto</b>
        <div className="grid2">
          <Num id="c-cuota" label="Cuota mensual" value={c.cuota} onChange={(n) => set({ cuota: n })} suf="CLP" />
          <Num id="c-corte" label="Día de pago (inicio del ciclo)" value={c.diaCorte} onChange={(n) => set({ diaCorte: n })} />
        </div>
        <label className="field">
          <span>Cuánto va a la cuota mientras falta</span>
          <select id="c-modo" value={c.modoCuota} onChange={(e) => set({ modoCuota: e.target.value as Config['modoCuota'] })}>
            <option value="auto">Automático (meta por fecha)</option>
            <option value="fijo">Fijo (siempre el % de fase 1)</option>
          </select>
        </label>
        {c.modoCuota === 'auto' && (
          <>
            <div className="grid2">
              <Num id="c-obj" label="Tener la cuota lista el día" value={c.diaObjetivo} onChange={(n) => set({ diaObjetivo: n })} suf="del ciclo" />
              <Num id="c-sem" label="Lo que haces por semana (aprox.)" value={c.semanaEstimada} onChange={(n) => set({ semanaEstimada: n })} suf="CLP" />
              <Num id="c-min" label="Mínimo a la cuota" value={c.pctMin} onChange={(n) => set({ pctMin: n })} suf="%" />
              <Num id="c-max" label="Máximo a la cuota" value={c.pctMax} onChange={(n) => set({ pctMax: n })} suf="%" />
            </div>
            <p className="note">
              Cada pedido calcula cuánto falta y cuántos días quedan hasta el día {c.diaObjetivo}, y ajusta el % entre {c.pctMin}% y {c.pctMax}%. Si vas adelantado baja; si vas atrasado sube. Con 2 semanas de pedidos usa tu promedio real en vez de la estimación.
            </p>
          </>
        )}
      </section>

      <section className="card">
        <b>Reparto · fase 1 (juntando cuota)</b>
        <p className="muted small">{c.modoCuota === 'auto' ? 'En automático el % de cuota cambia solo; lo demás se reparte en esta proporción.' : 'Se usa tal cual mientras falta la cuota.'}</p>
        <div className="pcts">
          {BOLSILLOS.map((b) => (
            <Num key={b.key} id={`f1-${b.key}`} label={b.nombre} value={c.fase1[b.key]} onChange={(n) => setPct('fase1', b.key, n)} suf="%" />
          ))}
        </div>
        <p className={'sum' + (s1 !== 100 ? ' bad' : '')}>Suma {s1}%</p>
        <b>Reparto · fase 2 (cuota lista)</b>
        <p className="muted small">"Cuota moto" aquí es adelanto: se guarda y el próximo mes empieza con eso abonado.</p>
        <div className="pcts">
          {BOLSILLOS.map((b) => (
            <Num key={b.key} id={`f2-${b.key}`} label={b.key === 'cuota' ? 'Adelanto' : b.nombre} value={c.fase2[b.key]} onChange={(n) => setPct('fase2', b.key, n)} suf="%" />
          ))}
        </div>
        <p className={'sum' + (s2 !== 100 ? ' bad' : '')}>Suma {s2}%</p>
        <button className="link" type="button" onClick={() => setC({ ...c, fase1: { ...DEFAULT_CONFIG.fase1 }, fase2: { ...DEFAULT_CONFIG.fase2 }, pctMin: DEFAULT_CONFIG.pctMin, pctMax: DEFAULT_CONFIG.pctMax, diaObjetivo: DEFAULT_CONFIG.diaObjetivo })}>
          Volver a los valores sugeridos
        </button>
      </section>

      <section className="card">
        <b>Bencina y metas</b>
        <label className="field">
          <span>Costo por km</span>
          <select id="c-ckm" value={c.costoKmModo} onChange={(e) => set({ costoKmModo: e.target.value as Config['costoKmModo'] })}>
            <option value="auto">Automático con mis cargas</option>
            <option value="fijo">Fijo</option>
          </select>
        </label>
        <div className="grid2">
          <Num id="c-ck" label="Valor fijo por km" value={c.costoKm} onChange={(n) => set({ costoKm: n })} step="0.01" suf="CLP" />
          <Num id="c-meta" label="Meta semanal" value={c.metaSemanal} onChange={(n) => set({ metaSemanal: n })} suf="CLP" />
        </div>
        <p className="note">{ck.real ? `Según tus cargas, hoy te cuesta ${clp(ck.real)} por km.` : 'Con 2 cargas de bencina o más se calcula tu costo real.'}</p>
      </section>

      {cambiado && (
        <div className="save-bar">
          <button className="btn" type="button" onClick={() => setC(structuredClone(datos.config))}>
            Descartar
          </button>
          <button className="btn primary grow" type="button" onClick={guardar}>
            Guardar ajustes
          </button>
        </div>
      )}

      <section className="card">
        <b>Respaldo</b>
        <p className="muted small">Tus datos viven en este teléfono. Descarga un respaldo cada tanto.</p>
        <div className="acciones start">
          <button className="btn" type="button" onClick={() => descargar(`mi-ruta-${hoyISO()}.json`, JSON.stringify(datos, null, 1), 'application/json')}>
            Respaldo completo (JSON)
          </button>
          <button
            className="btn"
            type="button"
            onClick={() =>
              descargar(
                `mi-ruta-pedidos-${hoyISO()}.csv`,
                ['fecha,hora,plataforma,monto,propina,bono,descuento,km,minutos,ingreso,bencina,neto', ...ordenar(datos.pedidos).map((p) => { const a = r.asign[p.id]; return [p.fecha, p.hora, p.app === 'uber' ? 'Uber Eats' : 'PedidosYa', p.monto, p.propina, p.bono, p.descuento, p.km, p.minutos, ingreso(p), Math.round(a?.bencina || 0), Math.round(a?.neto || 0)].join(',') })].join('\n'),
                'text/csv',
              )
            }
          >
            Pedidos (CSV)
          </button>
        </div>
        <b style={{ marginTop: 18 }}>Importar</b>
        <p className="muted small">Acepta el respaldo de esta app, el de la versión anterior, o un CSV con columnas como fecha, hora, monto, km, tiempo, propina y plataforma.</p>
        <label className="field">
          <span>Archivo</span>
          <input id="imp-file" type="file" accept=".json,.csv,.txt" onChange={async (e) => { const f = e.target.files?.[0]; if (f) revisar(await f.text()) }} />
        </label>
        <label className="field">
          <span>…o pega el contenido</span>
          <textarea id="imp-text" rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} />
        </label>
        <button className="btn" type="button" disabled={!texto.trim()} onClick={() => revisar(texto)}>
          Revisar
        </button>
      </section>

      <section className="card">
        <b>Borrar todo</b>
        <p className="muted small">Elimina pedidos, movimientos y jornadas de este teléfono. Los ajustes se mantienen.</p>
        <button className="btn danger" type="button" onClick={() => setBorrar(true)}>
          Borrar mis datos
        </button>
      </section>
      <p className="foot muted">Mi Ruta · versión 1.0</p>

      {prev && (
        <Sheet titulo="Importar pedidos" cerrar={() => setPrev(null)}>
          {(() => {
            const fs = prev.pedidos.map((p) => p.fecha).sort()
            const tot = prev.pedidos.reduce((a, p) => a + ingreso(p), 0)
            return (
              <p>
                Encontré <b>{prev.pedidos.length} pedidos</b> del {fechaCorta(fs[0])} al {fechaCorta(fs[fs.length - 1])} por <b>{clp(tot)}</b>
                {prev.movimientos?.length ? `, y ${prev.movimientos.length} movimientos` : ''}. Se suman a los que ya tienes; si alguno ya existe, se reemplaza.
              </p>
            )
          })()}
          <div className="acciones">
            <button className="btn" type="button" onClick={() => setPrev(null)}>
              Cancelar
            </button>
            <button
              className="btn primary grow"
              type="button"
              onClick={() => {
                const ids = new Set(prev.pedidos.map((p) => p.id))
                const mids = new Set((prev.movimientos || []).map((m) => m.id))
                setDatos((d) => ({
                  ...d,
                  pedidos: [...d.pedidos.filter((p) => !ids.has(p.id)), ...prev.pedidos],
                  movimientos: [...d.movimientos.filter((m) => !mids.has(m.id)), ...(prev.movimientos || [])],
                }))
                setPrev(null)
                setTexto('')
                toast('Datos importados')
              }}
            >
              Importar
            </button>
          </div>
        </Sheet>
      )}
      {borrar && (
        <Confirmar
          texto="Se borrarán todos tus pedidos, movimientos y jornadas. No se puede deshacer: descarga un respaldo antes."
          accion="Borrar todo"
          cerrar={() => setBorrar(false)}
          si={() => {
            setDatos((d) => ({ ...d, pedidos: [], movimientos: [], jornadas: [] }))
            toast('Datos borrados')
          }}
        />
      )}
    </div>
  )
}
