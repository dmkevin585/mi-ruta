import { useEffect, useMemo, useState } from 'react'
import { calcular, type BolsilloKey, type Movimiento, type Pedido } from './lib/engine'
import { useDatos } from './lib/store'
import Inicio from './screens/Inicio'
import Pedidos from './screens/Pedidos'
import Resumen from './screens/Resumen'
import Ajustes from './screens/Ajustes'
import PedidoSheet from './components/PedidoSheet'
import MovimientoSheet from './components/MovimientoSheet'
import BolsilloSheet from './components/BolsilloSheet'
import { Icon } from './components/Icon'

export type Tab = 'inicio' | 'pedidos' | 'resumen' | 'ajustes'
export type Abierto =
  | { tipo: 'pedido'; pedido?: Pedido }
  | { tipo: 'mov'; mov: Movimiento['tipo']; bolsillo?: BolsilloKey }
  | { tipo: 'bolsillo'; key: BolsilloKey | 'bencina' }
  | null

const TABS: Tab[] = ['inicio', 'pedidos', 'resumen', 'ajustes']
const tabDeHash = (): Tab => {
  const h = location.hash.slice(1) as Tab
  return TABS.includes(h) ? h : 'inicio'
}

let toastTimer: ReturnType<typeof setTimeout>
export function toast(msg: string) {
  const el = document.getElementById('toast')
  if (!el) return
  el.textContent = msg
  el.classList.add('on')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => el.classList.remove('on'), 2600)
}

export default function App() {
  const datos = useDatos()
  const [tab, setTab] = useState<Tab>(tabDeHash)
  const [abierto, setAbierto] = useState<Abierto>(null)
  const r = useMemo(() => calcular(datos.config, datos.pedidos, datos.movimientos), [datos])

  useEffect(() => {
    const on = () => {
      setTab(tabDeHash())
      window.scrollTo(0, 0)
    }
    addEventListener('hashchange', on)
    return () => removeEventListener('hashchange', on)
  }, [])

  const ctx = { datos, r, abrir: setAbierto }

  return (
    <>
      <main className="app">
        {tab === 'inicio' && <Inicio {...ctx} />}
        {tab === 'pedidos' && <Pedidos {...ctx} />}
        {tab === 'resumen' && <Resumen {...ctx} />}
        {tab === 'ajustes' && <Ajustes {...ctx} />}
      </main>

      <nav className="tabbar" aria-label="Secciones">
        <a href="#inicio" aria-current={tab === 'inicio' ? 'page' : undefined}>
          <Icon n="home" />
          Inicio
        </a>
        <a href="#pedidos" aria-current={tab === 'pedidos' ? 'page' : undefined}>
          <Icon n="list" />
          Pedidos
        </a>
        <button className="fab" type="button" aria-label="Registrar pedido" onClick={() => setAbierto({ tipo: 'pedido' })}>
          <Icon n="plus" />
        </button>
        <a href="#resumen" aria-current={tab === 'resumen' ? 'page' : undefined}>
          <Icon n="chart" />
          Resumen
        </a>
        <a href="#ajustes" aria-current={tab === 'ajustes' ? 'page' : undefined}>
          <Icon n="gear" />
          Ajustes
        </a>
      </nav>

      {abierto?.tipo === 'pedido' && <PedidoSheet pedido={abierto.pedido} r={r} datos={datos} cerrar={() => setAbierto(null)} />}
      {abierto?.tipo === 'mov' && <MovimientoSheet tipo={abierto.mov} bolsillo={abierto.bolsillo} cerrar={() => setAbierto(null)} />}
      {abierto?.tipo === 'bolsillo' && <BolsilloSheet k={abierto.key} {...ctx} cerrar={() => setAbierto(null)} />}
      <div id="toast" className="toast" role="status" />
    </>
  )
}

export type Ctx = { datos: ReturnType<typeof useDatos>; r: ReturnType<typeof calcular>; abrir: (a: Abierto) => void }
