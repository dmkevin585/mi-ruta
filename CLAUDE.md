# Mi Ruta — guía para Claude Code

App PWA (Vite + React 19 + TypeScript) para un repartidor en moto en Chile que trabaja con Uber Eats y PedidosYa. El dueño no es programador: explícale en español simple y muéstrale el resultado.

## Comandos
- `npm run dev` — servidor local
- `npm test` — pruebas del motor (`src/lib/engine.test.ts`); córrelas tras cualquier cambio en `engine.ts`
- `npm run build` — `tsc -b` + build; debe pasar sin errores antes de hacer commit

## Reglas del negocio (no romper)
- Montos en CLP enteros, formato `$160.000` (`clp()` en `src/lib/format.ts`).
- Ingreso = monto + propina + bono − descuento. La bencina (km × costo/km) se aparta antes del reparto.
- Fase 1 hasta juntar la cuota del ciclo; fase 2 después. En fase 2, `cuota` = adelanto que pasa al ciclo siguiente como arrastre.
- Modo auto: % de cuota = falta ÷ (neto diario esperado × días hasta `diaObjetivo`), limitado a [pctMin, pctMax].
- Todo el neto debe terminar en algún bolsillo (hay prueba para eso).
- Los datos viven en `localStorage` (clave `mi-ruta-v2`). Si cambias la forma de los datos, migra los existentes en `cargar()` de `store.ts`; nunca los borres.

## Estilo
- Diseño claro tipo app de banco: fondo `#F3F4F8`, tarjetas blancas, azul `#1F4FFF`, fuente Plus Jakarta Sans.
- Pensado primero para celular (390 px). Botones de al menos 44 px.
- Textos de la interfaz en español de Chile, cortos y directos.
