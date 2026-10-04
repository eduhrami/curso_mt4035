# Simulador Logística y Última Milla — Casos de prueba

**Especificación de referencia:** [especificacion.md](./especificacion.md) (v0.1: 36 épocas mensuales, modo manual)
**Estado:** ⚠ borrador preliminar. Los umbrales y tolerancias numéricos son de calibración inicial y se ajustan cuando se fijen las constantes del motor.
**Uso:** (1) base para pruebas de código (unitarias, de propiedades y de integración) y (2) protocolo de **auto-juego** para validar la coherencia de los resultados antes de dárselo al alumno.

---

## 1. Convenciones

Las mismas del [simulador SCM](../simulador-scm-red/casos-de-prueba.md#1-convenciones): modo determinista vs. estocástico, prueba pareada con la misma semilla, Monte Carlo con N = 200 (N = 1,000 para frecuencias de eventos), prioridades P1/P2/P3.

**Precondición por omisión:** **Megalópolis Centro, crecimiento medio, estrategia confiabilidad, modo determinista**, con decisiones *as-is*: solo SFD, 3PL, día siguiente, ventana de todo el día, sin ETA, sin validación de dirección, rutas fijas manuales.

---

## 2. Ganchos de prueba que el motor debe exponer

Los mismos del simulador SCM (`setSeed`, `events`, `noise`, `overrideState`, `runEpoch`, `getIntermediates`, `replay`, `params`) más:

1. `getIntermediates()` por zona y franja: n_w, s, L, t_parada, h, σ_lleg, P(presente), P(dirección OK), t_frío, utilización de nodo.
2. `setReportMode("mean" | "p95")`, para probar que D-61 solo cambia la visualización.
3. `calendar.override(mes, magnitud)`, para fijar la magnitud de un pico (Buen Fin, Navidad).
4. `fixture("mini-caso-S5")`: territorio sintético con los parámetros del ejemplo resuelto de S5 (200 tiendas, 3 CD, 5,000 unidades/mes, 70% urbano y 30% suburbano).

---

## 3. Invariantes

| ID | Invariante | Traza | Prio |
|---|---|---|---|
| LOG-INV-01 | **Determinismo:** misma semilla + mismas decisiones ⇒ resultados idénticos bit a bit | §3 | P1 |
| LOG-INV-02 | Exactamente **36 épocas** (A1-M01 … A3-M12) con ticks diarios según el calendario real de cada mes (28–31 días) | §3 | P1 |
| LOG-INV-03 | El motor no avanza de época sin `confirm()` | §3 | P1 |
| LOG-INV-04 | **Conservación de pedidos** por día y zona: `pedidos_nuevos + backlog_ini = entregados + cancelados + backlog_fin`, y `intentos = entregados_1er_intento + fallidos` | §6 | P1 |
| LOG-INV-05 | `entregas exitosas ≤ intentos`; FADS, OTD, OTIF, ETA accuracy, utilización ∈ [0, 1] | §7.1 | P1 |
| LOG-INV-06 | `OTIF ≤ OTD` y `Perfect Order ≤ min(componentes)` (es un producto de proporciones) | K-02, K-04 | P1 |
| LOG-INV-07 | `CSAT ∈ [1, 5]`; `NPS ∈ [−100, 100]` | K-17, K-18 | P1 |
| LOG-INV-08 | **Cierre del CPD:** `CPD = Σ componentes del waterfall` (troncal, ruta, picking, reintentos, devoluciones) con tolerancia 1e-6 | K-05, §6.3 | P1 |
| LOG-INV-09 | Utilización de vehículo y de nodo ≤ 100%; el exceso de demanda va a backlog o se rechaza, no rompe la capacidad | §6.3 | P1 |
| LOG-INV-10 | `1 ≤ s ≤ límite` de capacidad, turno y ventana; una entrega en locker cuenta como una parada aunque lleve varios pedidos | §6.3, R-14 | P1 |
| LOG-INV-11 | El spoilage solo ocurre en pedidos con frescos o refrigerados; spoilage % ∈ [0, 1] | K-15 | P1 |
| LOG-INV-12 | **D-61 no cambia el motor:** la misma corrida con reporte "promedio" vs. "p95" produce estados y KPIs internos idénticos; solo cambia el dashboard | D-61, R-12 | P1 |
| LOG-INV-13 | El puntaje usa siempre los valores p95, sin importar D-61 | §7.3 | P1 |
| LOG-INV-14 | Todo evento produce un mensaje con fecha, impacto y ≥ 1 *driver*; toda regla disparada queda en el log | §8, §9 | P1 |
| LOG-INV-15 | Sin NaN, ∞ ni KPIs indefinidos, incluso con cero pedidos en una zona (p. ej. una zona rural sin demanda un día) | — | P1 |
| LOG-INV-16 | Decisiones fuera de rango o incompatibles se rechazan sin alterar el estado | §5 | P1 |
| LOG-INV-17 | Los picos del calendario caen en sus meses (mayo, agosto, noviembre, diciembre) con magnitud ∈ [1.3, 2.5] | E-21 | P1 |

---

## 4. Dirección causal (pruebas pareadas)

| ID | Territorio | Variante (cambio único) | Resultado esperado | Traza | Prio |
|---|---|---|---|---|---|
| LOG-CAU-01 | Megalópolis | Ventana todo el día → 4 h → 2 h → 1 h | FADS ↑ (monótono), paradas/ruta ↓ (monótono), CPD ↑ | D-21, §6.3 | P1 |
| LOG-CAU-02 | Megalópolis | Sin ETA → seguimiento en vivo | P(presente) ↑, FADS ↑, CSAT ↑, ETA accuracy ↑ | D-50 | P1 |
| LOG-CAU-03 | Norte vs. Bajío | Sin validación → geocodificación + referencias | FADS ↑ en ambos; **la mejora en Norte es mayor** (interacción con E-06 bajo) | D-51, E-06 | P1 |
| LOG-CAU-04 | Megalópolis | Buffer de promesa 0% → 20% | OTD ↑; pedidos ↓ levemente (percepción de lentitud, según E-23) | D-23 | P1 |
| LOG-CAU-05 | Megalópolis | 1 nivel de servicio → 3 niveles sin segmentar por zona | n_w ↓, paradas/ruta ↓, CPD ↑ | D-20, §6.3 | P1 |
| LOG-CAU-06 | Megalópolis | Igual que CAU-05 pero **segmentando por zona** (D-24) | El aumento de CPD es menor que en CAU-05 | D-24 | P2 |
| LOG-CAU-07 | Megalópolis | SFS 0% → 30% de tiendas en zonas densas | Distancia troncal ↓, OTD ↑ en zonas urbanas, CPD ↓ urbano | D-02 | P1 |
| LOG-CAU-08 | Megalópolis | SFS por encima del tope de horas de piso (D-12) | OSA de la tienda física ↓, Delivery Accuracy ↓ (R-05) | D-12, R-05 | P1 |
| LOG-CAU-09 | Megalópolis | Dark store en zona densa con volumen alto vs. bajo | Con volumen alto, CPD ↓ tras 3 meses; con volumen bajo, CPD ↑ (no alcanza su punto de equilibrio) | D-04 | P1 |
| LOG-CAU-10 | Megalópolis | MFC vs. dark store con el mismo volumen | El volumen de equilibrio del MFC es mayor; con volumen muy alto, el picking del MFC es más barato | D-05 | P2 |
| LOG-CAU-11 | Megalópolis | Lockers en zonas con E-07 bajo | FADS ↑, CPD ↓ (R-14) | D-06, R-14 | P1 |
| LOG-CAU-12 | Norte | Activar express (< 2 h) | Utilización de vehículo < 50%, CPD ↑↑; se dispara la alerta R-04 | D-20, R-04 | P1 |
| LOG-CAU-13 | Norte | Flota de combustión → EV | Costo de energía/km ↓; en rutas con tramos > autonomía, rutas/vehículos ↑ (restricción de rango) | D-31, E-04 | P2 |
| LOG-CAU-14 | Megalópolis | Sin equipo de frío → hieleras → refrigerado | t_frío efectivo ↓ y spoilage ↓ (monótono); costo de vehículo ↑ | D-32, R-01 | P1 |
| LOG-CAU-15 | Megalópolis | Secuencia de carga sin regla → frescos primero | t_frío ↓, spoilage ↓, sin cambio en km | D-45 | P2 |
| LOG-CAU-16 | Megalópolis | Rutas manuales → optimizador VRPTW, con datos de telemetría + tráfico | Route Efficiency ↑, ETA accuracy ↑, CPD ↓, σ_lleg ↓ | D-43, D-60 | P1 |
| LOG-CAU-17 | Megalópolis | Ruteo con IA con datos básicos vs. completos | Con datos básicos, la mejora ≤ 30% de la mejora con datos completos (R-08) | D-43, D-60, R-08 | P1 |
| LOG-CAU-18 | Megalópolis | Función de costo euclidiana → dependiente de la hora (D-44) | OTD ↑ (el plan se acerca a la realidad); T_estimado más cercano a T_real | D-44 | P2 |
| LOG-CAU-19 | Megalópolis | Re-zonificación trimestral → diaria, con datos básicos | Familiaridad ↓, paradas/hora −10% (R-07) | D-42, R-07 | P2 |
| LOG-CAU-20 | Megalópolis | Barrido k = 3…30 zonas | CPD con forma de **U** y mínimo interior | D-40 | P2 |
| LOG-CAU-21 | Megalópolis (MC) | Pago fijo → pago por parada | Paradas/hora ↑; frecuencia de X-09 ↑; entregas marcadas en falso ↑ (R-09) | D-35, R-09 | P2 |
| LOG-CAU-22 | Norte vs. Megalópolis | Eliminar pago contra entrega | Entregas fallidas ↓ en ambos; la caída de pedidos es mayor en Norte (E-12 = 30%) | D-53, E-12 | P1 |
| LOG-CAU-23 | Megalópolis | Devoluciones en rutas dedicadas → *backhaul* | Empty miles ↓, costo de devolución/unidad ↓, T_ruta ↑ (R-11) | D-56, R-11 | P2 |
| LOG-CAU-24 | Megalópolis | Tarifa de envío ↑ / umbral de envío gratis ↑ | Pedidos ↓, tamaño de canasta ↑, CPD por unidad ↓ | D-25, E-24 | P1 |
| LOG-CAU-25 | Megalópolis | Batching ATP de 240 → 5 min | Order Cycle Time ↓, costo de asignación ↑ (peor asignación de nodo) | D-11 | P3 |
| LOG-CAU-26 | Megalópolis | Asignación "más cercano" → "umbral de costo dinámico" | CPD ↓ y menor saturación de las tiendas más populares (utilización máxima de nodo ↓) | D-10 | P1 |
| LOG-CAU-27 | Megalópolis, Buen Fin | Sin slotting → con tope de pedidos por ventana | Backlog ↓, OTD p95 ↑, pedidos capturados ↓ | D-26, R-06 | P1 |
| LOG-CAU-28 | Megalópolis, Buen Fin | Flota spot vs. contratada con anticipación (misma capacidad) | Costo de flota de pico menor con contrato anticipado | D-36 | P2 |
| LOG-CAU-29 | Norte (MC) | *Crowdsourced* 20% → 60% | Costo fijo ↓; P(rutas sin cubrir) ↑, mayor que en Megalópolis (E-14 escaso) | D-30, R-10 | P2 |
| LOG-CAU-30 | Megalópolis | Sin seguridad → GPS + botón de pánico + horarios variables | Frecuencia y severidad de X-08 ↓ | D-62 | P2 |
| LOG-CAU-31 | Megalópolis | Mantenimiento correctivo → preventivo | Frecuencia de X-01 y X-09 ↓ | D-63 | P3 |

### 4.1 Matriz de signos (oráculo)

| Decisión ↑ | OTD | FADS | CPD | Utilización | Spoilage | CSAT | Pedidos |
|---|---|---|---|---|---|---|---|
| Angostura de ventana (D-21) | ± | + | + | − | 0 | + | + |
| Buffer de promesa (D-23) | + | 0 | 0 | 0 | 0 | + | − |
| % SFS (D-02, bajo el tope) | + | 0 | − | ± | − | + | 0 |
| Equipo de frío (D-32) | 0 | 0 | + | 0 | − | + | 0 |
| Madurez de datos (D-60) | + | + | − | + | 0 | + | 0 |
| Notificación de ETA (D-50) | 0 | + | − | 0 | 0 | + | 0 |
| Tarifa de envío (D-25) | 0 | 0 | − | ± | 0 | − | − |
| % *crowdsourced* (D-30) | − | − | ± | 0 | ± | − | 0 |
| N.º de niveles de servicio (D-20) | ± | 0 | + | − | 0 | ± | + |

---

## 5. Escenarios de referencia (calibración)

| ID | Condición | Resultado esperado | Traza | Prio |
|---|---|---|---|---|
| LOG-ESC-01 | Megalópolis *as-is* | FADS ∈ [78%, 85%] ("1 de cada 5 falla"); spoilage de frescos notable (> 3%); CSAT < 4.0 | Storytelling §2 | P1 |
| LOG-ESC-02 | Paradas por ruta por territorio *as-is* | Urbano denso: 25–70 paradas/día; rural disperso: 8–15 | K-10, slide 19 de S5 | P1 |
| LOG-ESC-03 | CPD por territorio con la misma política | Rural ≈ 4–5× urbano; todos dentro de USD 1.40–12 por paquete (Pahwa & Jaller, 2022). ⚠ Implementación: rural/urbano ∈ [3.5, 6.5]; urbano ∈ [1.40, 12]; rural *as-is* ≤ 25 (la zona rural de Norte está a 70–80 km del CD); los micro-hubs bajan el rural | K-05, §6.3 | P1 |
| LOG-ESC-04 | `fixture("mini-caso-S5")`: SFS vs. SFD en la zona urbana | Costo por pedido ≈ USD 8.00 (SFS) vs. 9.60 (SFD), ±10% | §13 especificación, slide 22 | P1 |
| LOG-ESC-05 | Mismo fixture con la recomendación segmentada (SFS urbano + SFD suburbano) | OTIF urbano ≈ +6 pp frente a solo SFD; CPD total ↓ | Slide 23 | P2 |
| LOG-ESC-06 | Bajío *as-is* | Mejor FADS que Megalópolis (direcciones de calidad, presencia media) | E-06, E-07 | P2 |
| LOG-ESC-07 | Crecimiento explosivo sin ampliar capacidad | Utilización de nodo > 85% antes de A2; el tiempo de espera crece de forma no lineal y el OTD cae | E-20, §6.3 | P2 |
| LOG-ESC-08 | Megalópolis con la competencia *quick commerce* activa (X-11) sin respuesta | Pedidos en zonas densas −10% sostenido | X-11 | P3 |

---

## 6. Reglas de causa–efecto (pruebas de umbral)

| ID | Regla | Debajo del umbral | Arriba del umbral | Prio |
|---|---|---|---|---|
| LOG-REG-01 | R-01 (ruta > 3 h con frescos y sin frío) | 2.9 h → P(spoilage) base | 3.1 h → P(spoilage) crece de forma exponencial; con calor (X-12), λ ×2 | P1 |
| LOG-REG-02 | R-02 (spoilage > 3% semanal) | 2.9% → sin efecto en piso | 3.1% → excepciones ↑, CSAT ↓, out-of-stock en piso ↑ por reposición | P1 |
| LOG-REG-03 | R-03 (ventana de todo el día con E-07 bajo) | E-07 medio → FADS ≥ 80% | E-07 bajo → FADS < 80% | P1 |
| LOG-REG-04 | R-04 (express con baja densidad) | Densidad alta → sin alerta | Densidad baja → utilización < 50% y alerta | P1 |
| LOG-REG-05 | R-05 (SFS sobre el tope) | En el tope → OSA de tienda sin cambio | Sobre el tope → OSA de tienda ↓ ∝ exceso | P1 |
| LOG-REG-06 | R-06 (sin buffer + pico) | Buffer ≥ 10% → backlog se limpia en ≤ 2 días. ⚠ Implementación: la holgura no agrega capacidad; con ≥ 10% en pico la promesa incluye un día más, así que lo arrastrado no cuenta como tarde y R-06 no se dispara | Buffer 0% + pico ×2 → backlog arrastrado ≥ 3 días y OTD p95 < 80% | P1 |
| LOG-REG-07 | R-07 (re-zonificación diaria sin datos) | Datos maduros → sin penalización | Datos básicos → paradas/hora −10% | P2 |
| LOG-REG-08 | R-08 (IA con datos básicos) | Ver LOG-CAU-17 | — | P1 |
| LOG-REG-09 | R-09 (pago por parada) | Ver LOG-CAU-21 | — | P2 |
| LOG-REG-10 | R-10 (*crowdsourced* > 50% en pico con E-14 escaso) | 49% → confiabilidad base | 51% → P(rutas sin cubrir) ↑ | P2 |
| LOG-REG-11 | R-11 (*backhaul*) | Ver LOG-CAU-23 | — | P2 |
| LOG-REG-12 | R-12 (reporte promedio) | Ver LOG-INV-12: el dashboard con "promedio" oculta días con OTD < 70%; con "p95" aparecen | — | P1 |
| LOG-REG-13 | R-13 (contingencia + combustión) | Flota 100% EV → capacidad intacta | Flota de combustión → capacidad −20% en días de contingencia | P1 |
| LOG-REG-14 | R-14 (lockers con E-07 bajo) | Ver LOG-CAU-11 | — | P2 |

---

## 7. Eventos inesperados y calendario

| ID | Condición | Resultado esperado | Traza | Prio |
|---|---|---|---|---|
| LOG-EVT-01 | MC N = 1,000, *as-is* por territorio | Frecuencia mensual de cada X-xx dentro del IC 95% de `p_base × Π modificadores` | §8 | P1 |
| LOG-EVT-02 | Estacionalidad | X-02 (inundación en Megalópolis) solo de junio a septiembre; X-12 (calor en Norte) solo de mayo a agosto; X-04 (contingencia) solo en temporada seca | §8, E-11 | P1 |
| LOG-EVT-03 | Picos programados | Los picos ocurren **siempre** en su mes (no es probabilístico); su magnitud varía por semilla en [1.3, 2.5] | E-21 | P1 |
| LOG-EVT-04 | X-04 forzado con flota mixta 50% EV | Solo la parte de combustión pierde capacidad. ⚠ Implementación: la flota es de un solo tipo de vehículo; se prueba camioneta/refrigerada (pierden 20%) vs. eléctrica/moto (sin pérdida) | X-04, R-13 | P1 |
| LOG-EVT-05 | X-08 (robo) en MC: con COD alto y sin GPS vs. sin COD y con D-62 | Frecuencia ↓ en el segundo caso, dentro del IC esperado | X-08 | P2 |
| LOG-EVT-06 | X-07 forzado con *crowdsourced* 70% vs. 20% | Rutas sin cubrir ∝ dependencia | X-07 | P2 |
| LOG-EVT-07 | X-14 forzado (cierre de tienda-nodo) con asignación "más cercano" vs. "umbral dinámico" | La regla dinámica reasigna con menor caída de OTD | X-14, D-10 | P2 |
| LOG-EVT-08 | **Cadena:** X-12 + rutas > 3 h sin frío | R-01 → spoilage → R-02 → out-of-stock en piso | §8 cadenas | P1 |
| LOG-EVT-09 | **Cadena:** X-05 sin slotting | R-06 → CSAT ↓ → pedidos ↓ el mes siguiente | §8 cadenas | P1 |
| LOG-EVT-10 | **Cadena:** X-06 + pago por parada | P(X-09) del mes > p_base | §8 cadenas | P2 |
| LOG-EVT-11 | Evento forzado dos veces con la misma semilla | Impacto idéntico | Gancho | P1 |
| LOG-EVT-12 | Cualquier evento | Los *drivers* del mensaje coinciden con los modificadores activos | §8, §9 | P1 |
| LOG-EVT-13 | X-11 sin respuesta vs. con express en zonas densas | La caída de demanda se reduce con la respuesta | X-11 | P3 |

---

## 8. Retrasos, dependencias y reversibilidad

| ID | Condición | Resultado esperado | Traza | Prio |
|---|---|---|---|---|
| LOG-LAG-01 | Dark store decidida en A1-M01 | Opera desde A1-M04 (retraso de 3 meses); el costo fijo empieza al decidir. ⚠ Implementación: el capex se carga al decidir y el costo fijo mensual empieza cuando opera | D-04 | P1 |
| LOG-LAG-02 | MFC decidido en A1-M01 | Opera desde A1-M07 | D-05 | P1 |
| LOG-LAG-03 | SFS y BOPIS activados en el mes *t* | Operan en *t+1* | D-02, D-03 | P1 |
| LOG-LAG-04 | Lockers | Operan en *t+1* o *t+2* según los parámetros | D-06 | P2 |
| LOG-LAG-05 | D-44 (función dependiente de la hora) con D-60 básico | Se rechaza o se degrada con aviso "requiere telemetría + tráfico" | D-44 | P1 |
| LOG-LAG-06 | D-43 = VRP dinámico con IA con D-60 básico | Se permite, con beneficio limitado (R-08), y el jugador recibe un aviso | D-43, R-08 | P1 |
| LOG-LAG-07 | Contrato de flota para el pico decidido el mes anterior vs. en el mismo mes | El anticipado aplica tarifa contratada; el del mismo mes aplica tarifa spot | D-36 | P2 |
| LOG-LAG-08 | Cerrar un MFC | Capex no recuperado; costo de cierre | D-05 | P2 |
| LOG-LAG-09 | Cambio de estrategia (D-00) | Se permite una vez con penalización; un segundo intento se rechaza | D-00 | P1 |

---

## 9. Puntaje

| ID | Condición | Resultado esperado | Traza | Prio |
|---|---|---|---|---|
| LOG-SCO-01 | Tabla de pesos | Suman 1.00 por estrategia | §7.3 | P1 |
| LOG-SCO-02 | La misma corrida (express, CPD alto, Order Cycle Time bajo) evaluada con las tres estrategias | Puntaje velocidad > confiabilidad > eficiencia. ⚠ Implementación: se fija el perfil (Order Cycle Time en su mejor valor y CPD p95 en el peor) sobre la corrida *as-is* para aislar el efecto de los pesos | §7.3 | P1 |
| LOG-SCO-03 | Violaciones de guardrail > N días | El puntaje decrece de forma estricta con días de violación | §7.3 | P1 |
| LOG-SCO-04 | Corrida con reporte promedio vs. p95 | Puntaje idéntico (usa p95) | LOG-INV-13 | P1 |
| LOG-SCO-05 | *As-is* por territorio | Puntajes en banda comparable (p. ej. 35–55) | §7.3 | P2 |

---

## 10. Persistencia y exportación

Los mismos casos que SCM-PER-01…07, con estos cambios: el CSV tiene **36 filas × zona**, `sim = "mt4035-lastmile"` y un JSON del simulador SCM se rechaza.

| ID | Condición | Resultado esperado | Prio |
|---|---|---|---|
| LOG-PER-01 | Guardar y recargar | Idéntico | P1 |
| LOG-PER-02 | `localStorage` no disponible | Sigue en memoria con aviso | P1 |
| LOG-PER-03 | `replay` del JSON exportado | KPIs y eventos idénticos; el checksum coincide | P1 |
| LOG-PER-04 | JSON alterado | Se detecta | P1 |
| LOG-PER-05 | CSV | 36 meses × zonas; coincide con el JSON | P1 |
| LOG-PER-06 | Importar JSON del simulador SCM | Se rechaza | P2 |

---

## 11. Protocolo de auto-juego

### 11.1 Bots de referencia

| Bot | Política | Para qué sirve |
|---|---|---|
| **BOT-A Estático** | *As-is* los 36 meses | Línea base |
| **BOT-B Velocidad a toda costa** | Express en todos lados, ventanas de 1 h, motos, *crowdsourced* | Debe perder bajo eficiencia y confiabilidad |
| **BOT-C Segmentado (mini-caso S5)** | SFS en urbano + SFD en periferia, umbral de costo dinámico, ventanas de 2 h, ETA en vivo, validación de dirección | Debe ganar a A en Megalópolis bajo las tres estrategias |
| **BOT-D Eficiencia** | Día siguiente, ventanas de 4 h, lockers, *backhaul*, k-means balanceado, VRPTW | Debe ganar bajo eficiencia |
| **BOT-E Express rural ingenuo** | En Norte: express < 2 h sin micro-hubs | Debe perder en Norte |
| **BOT-F Aleatorio** | Decisiones válidas aleatorias cada mes | Robustez |
| **BOT-G Reactivo** | Si utilización > 90%, suma *crowdsourced*; si OTD < 90%, sube el buffer 10%; si CPD sube > 5% MoM, quita un nivel de servicio | Alumno táctico |
| **BOT-H Aprendiz** | Igual que A en el año 1; después del primer Buen Fin/Navidad contrata flota de pico, agrega slotting y buffer en los picos de los años 2 y 3 | Valida que los 36 meses permiten aprender de un ciclo a otro |
| **BOT-I Buscador** | Búsqueda aleatoria + *hill climbing* por territorio × estrategia | Explotaciones y óptimos en límites |

### 11.2 Propiedades esperadas (modo estocástico, MC N = 200)

| ID | Propiedad | Criterio de aceptación | Prio |
|---|---|---|---|
| LOG-AUT-01 | Robustez | BOT-F, 10,000 corridas: cero errores, cero NaN e invariantes §3 al 100% | P1 |
| LOG-AUT-02 | Segmentar gana | Megalópolis: BOT-C > BOT-A en ≥ 80% de semillas bajo las tres estrategias | P1 |
| LOG-AUT-03 | Velocidad no lo es todo | BOT-B tiene el mejor Order Cycle Time, pero nunca el mejor puntaje bajo *eficiencia*, y bajo *confiabilidad* solo en ≤ 10% de semillas | P1 |
| LOG-AUT-04 | Geografía importa | Norte: BOT-E queda en los 2 peores lugares bajo eficiencia y confiabilidad en ≥ 80% de semillas | P1 |
| LOG-AUT-05 | Eficiencia coherente | BOT-D tiene el mejor CPD entre A–E en Megalópolis y Bajío en ≥ 80% de semillas | P2 |
| LOG-AUT-06 | Se aprende entre ciclos | BOT-H: OTD p95 en noviembre–diciembre del año 2 > año 1 en ≥ 90% de semillas; y el año 3 ≥ año 2 | P1 |
| LOG-AUT-07 | Ningún extremo domina | Ninguna configuración de BOT-I es óptima en las 9 combinaciones territorio × estrategia; ≥ 3 óptimos distintos | P2 |
| LOG-AUT-08 | Óptimos interiores | k de zonas, ancho de ventana, buffer y % SFS óptimos no están en los límites en ≥ 7 de 9 combinaciones | P2 |
| LOG-AUT-09 | Urbano ≠ rural | El óptimo de BOT-I en Norte usa más consolidación (lockers, micro-hubs, ventanas amplias) que en Megalópolis | P2 |
| LOG-AUT-10 | Habilidad > suerte | CV del puntaje de BOT-A < 15%; diferencia media BOT-C − BOT-A > 2 desviaciones estándar | P1 |
| LOG-AUT-11 | Los picos son el examen | Para BOT-A, ≥ 50% de los días de violación de guardrail ocurren en meses pico | P2 |
| LOG-AUT-12 | Medir importa | En BOT-A, la diferencia entre OTD promedio y OTD p95 en Megalópolis es ≥ 10 pp (justifica la lección de D-61) | P2 |
| LOG-AUT-13 | La IA necesita datos | El mejor puntaje con IA y datos básicos < mejor puntaje con VRPTW y datos completos | P2 |
| LOG-AUT-14 | Estabilidad del reactivo | BOT-G no genera costos explosivos ni KPIs fuera de rango; se registran oscilaciones | P3 |
| LOG-AUT-15 | Robustez de la calibración | Al perturbar ±20% cada constante, el orden BOT-C > BOT-A en Megalópolis se mantiene en ≥ 90% de las perturbaciones | P2 |
| LOG-AUT-16 | **Explicabilidad** | Todo cambio de KPI > 10% entre meses tiene ≥ 1 causa registrada (decisión, evento, regla, pico o tendencia). Cobertura ≥ 95% | P1 |

### 11.3 Reporte de coherencia y alarmas

Mismo formato que el simulador SCM (§11.3): puntaje medio, p5 y p95 por bot × territorio × estrategia; propiedades que pasan y fallan; óptimos en límites; transiciones peor explicadas; sensibilidad.

**Alarmas de calibración:** BOT-B gana bajo eficiencia · BOT-E no pierde en Norte · BOT-H no mejora del año 1 al año 2 · óptimos en límites · CV de la suerte > 15% · cobertura de explicabilidad < 95% · fixture del mini-caso fuera de ±10%.

---

[← Especificación](./especificacion.md) · [Sesión 5](../sesion-5.md)
