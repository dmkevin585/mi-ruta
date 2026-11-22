import { useEffect, type ReactNode } from 'react'
import { Icon } from './Icon'

export function Sheet({ titulo, cerrar, children }: { titulo: string; cerrar: () => void; children: ReactNode }) {
  useEffect(() => {
    const on = (e: KeyboardEvent) => e.key === 'Escape' && cerrar()
    addEventListener('keydown', on)
    document.body.style.overflow = 'hidden'
    return () => {
      removeEventListener('keydown', on)
      document.body.style.overflow = ''
    }
  }, [cerrar])
  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && cerrar()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="sheet-head">
          <h2>{titulo}</h2>
          <button className="icon-btn" type="button" onClick={cerrar} aria-label="Cerrar">
            <Icon n="x" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Confirmar({ texto, accion, si, cerrar }: { texto: string; accion: string; si: () => void; cerrar: () => void }) {
  return (
    <Sheet titulo="¿Seguro?" cerrar={cerrar}>
      <p className="muted">{texto}</p>
      <div className="acciones">
        <button className="btn" type="button" onClick={cerrar}>
          Cancelar
        </button>
        <button
          className="btn danger-fill"
          type="button"
          onClick={() => {
            cerrar()
            si()
          }}
        >
          {accion}
        </button>
      </div>
    </Sheet>
  )
}
