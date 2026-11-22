# Mi Ruta

App para repartidores en moto (Uber Eats y PedidosYa). Registras cada pedido y la app reparte la plata sola entre **bencina**, **cuota de la moto** y tus bolsillos (**personal, mantención, ahorro, inversión**).

Funciona en el celular como app instalable (PWA), sin internet, y los datos quedan guardados en el teléfono.

## Cómo reparte cada pedido

1. **Ingreso** = monto + propina + bono − descuento.
2. **Bencina primero:** km del pedido × costo por km. El costo se calcula solo con tus cargas de bencina (o usas un valor fijo).
3. **El resto (neto) se divide en dos fases:**

| Bolsillo | Fase 1 · juntando cuota | Fase 2 · cuota lista |
|---|---|---|
| Cuota moto | **automático 55–85 %** (72 % en modo fijo) | **15 %** adelanto para el mes siguiente |
| Personal | 15 % | **40 %** |
| Mantención | 8 % | 10 % |
| Ahorro | 5 % | 20 % |
| Inversión | 0 % | 15 % |

En fase 1, con el modo **automático**, cada pedido mira cuánto falta para los $160.000 y cuántos días quedan para el **día 21 del ciclo**, y ajusta el % de cuota entre 55 % y 85 %. Si vas adelantado baja, si vas atrasado sube. Lo que no va a la cuota se reparte en la proporción de la fase 1 (15:8:5:0).

El pedido que completa la cuota se divide: una parte con fase 1 y el resto con fase 2. El **adelanto** se suma al mes siguiente, que parte con esa plata ya abonada.

Con $80.000–$100.000 brutos a la semana (3–4 días), la simulación de `src/lib/engine.test.ts` deja la cuota lista alrededor del **día 20–21**, y en la **semana 4** lo que va para ti casi se triplica.

Todo se cambia en **Ajustes**.

## Pantallas

- **Inicio:** saldo total, avance de la cuota con fecha meta, bolsillos, semana actual y últimos pedidos. Botón + para registrar.
- **Pedidos:** por día, semana, mes o ciclo, filtro por app, editar y eliminar.
- **Resumen:** cómo se repartió cada semana, Uber vs PedidosYa, mejores horarios y consejos.
- **Ajustes:** cuota, día de pago, modo automático, %, bencina, respaldo e importación.
- Al tocar un bolsillo: saldo, movimientos y acción (pagar cuota, cargar bencina, registrar gasto).

## Desarrollo

```bash
npm install
npm run dev      # abre en http://localhost:5173
npm test         # pruebas del motor de reparto
npm run build    # genera dist/
```

## Publicar gratis (GitHub Pages)

1. En GitHub: **Settings → Pages → Source: GitHub Actions**.
2. Cada push a `main` corre las pruebas, compila y publica en `https://<tu-usuario>.github.io/mi-ruta/`.
3. En el celular abre ese link y elige **Agregar a pantalla de inicio** (Chrome: menú ⋮ → Instalar app).

## Estructura

```
src/lib/engine.ts      motor de reparto (puro, con pruebas)
src/lib/store.ts       guardado en el teléfono, importar/exportar
src/screens/           Inicio, Pedidos, Resumen, Ajustes
src/components/        hojas de pedido, movimiento y bolsillo
```
