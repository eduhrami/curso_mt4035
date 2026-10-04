# Simulador SCM + Diseño de red — Casos de prueba

**Especificación de referencia:** [especificacion.md](./especificacion.md) (v0.1: 20 épocas trimestrales, modo manual)
**Estado:** ⚠ borrador preliminar. Los umbrales y tolerancias numéricos son de calibración inicial y se ajustan cuando se fijen las constantes del motor.
**Uso:** (1) base para pruebas de código (unitarias, de propiedades y de integración) y (2) protocolo de **auto-juego** para validar la coherencia de los resultados antes de dárselo al alumno.

---

## 1. Convenciones

| Término | Significado |
|---|---|
| **Modo determinista** | Eventos desactivados (`events=off`) y ruido de demanda y congestión en cero. Sirve para probar fórmulas puras |
| **Modo estocástico** | Eventos y ruido activos, con semilla fija |
| **Prueba pareada** | Dos corridas con **la misma semilla** que difieren solo en el factor probado (*ceteris paribus*) |
| **Monte Carlo (MC)** | N corridas con semillas 1…N. Por omisión N = 200; para frecuencias de eventos, N = 1,000 |
| **"En ≥ x% de semillas"** | La condición se cumple en al menos x% de las corridas MC |
| ↑ / ↓ / = | El KPI sube / baja / no cambia (tolerancia relativa 1e-9 en modo determinista) |
| **As-is** | Red y decisiones iniciales de la región (§4.1 de la especificación), sin cambios del jugador |
| **Traza** | Claves de la especificación que respalda el caso |
| **Prioridad** | P1 = bloqueante para liberar · P2 = coherencia pedagógica · P3 = calibración fina |

**Plantilla de cada caso:** *ID · Precondición (región, perfil, estrategia, modo, semilla) · Acción · Resultado esperado (aserción verificable) · Traza · Prioridad.* En las tablas, la precondición por omisión es **Kaigan, perfil moderado, estrategia frescura, modo determinista**, salvo que se indique otra cosa.

---

## 2. Ganchos de prueba que el motor debe exponer

Son necesarios para que los casos se puedan automatizar. Se deben agregar como requisito de implementación.

1. `setSeed(n)` y PRNG inyectable.
2. `events: "off" | "on" | {forced: [{id, epoch, week, severity}]}`, para forzar eventos en una fecha.
3. `noise: 0 | 1`: escala del ruido de demanda y congestión.
4. `overrideState(path, value)` (solo en pruebas): fijar madurez de TI, confianza de zona, inventario, etc.
5. `runEpoch(decisions)`, que devuelve KPIs por semana y por época, el log de reglas disparadas (R-xx) y los eventos.
6. `getIntermediates()`: d̄, δ, s, T_ruta, VU_rem, CV_ef, SS, FR, BWR por categoría y nodo.
7. `replay(json)`: vuelve a correr una exportación y devuelve el diff.
8. `params`: tabla de constantes externa (JSON) para análisis de sensibilidad.

---

## 3. Invariantes (se cumplen siempre, en cualquier combinación)

Se prueban como **propiedades** sobre corridas aleatorias (bot aleatorio, §10) en modo estocástico.

| ID | Invariante | Traza | Prio |
|---|---|---|---|
| SCM-INV-01 | **Determinismo:** misma semilla + mismas decisiones ⇒ JSON de KPIs y eventos idéntico bit a bit | §3 | P1 |
| SCM-INV-02 | Semillas distintas con eventos activos ⇒ al menos un KPI o evento distinto en ≥ 99% de los pares | §3 | P1 |
| SCM-INV-03 | Exactamente **20 épocas** (A1-T1 … A5-T4) × **13 ticks** = 260 semanas, sin épocas extra ni faltantes | §3 | P1 |
| SCM-INV-04 | El motor no avanza de época sin `confirm()`. Llamar `runEpoch` dos veces sin confirmar no duplica resultados | §3 | P1 |
| SCM-INV-05 | **Conservación de unidades** por categoría, nodo y semana: `inv_ini + recibido = vendido + mermado + perdido_en_excursión + inv_fin` (tolerancia 1e-6) | §6.3 | P1 |
| SCM-INV-06 | **Conservación de demanda:** `demanda = vendida + sustituida + perdida`, y `perdida = 0.5 × no_atendida` | §6.3 | P1 |
| SCM-INV-07 | Ningún inventario es negativo; ningún flujo procesado por un CD excede su capacidad (el exceso se registra como retraso) | §6.3, R-07 | P1 |
| SCM-INV-08 | Proporciones (OSA, OTIF, OFR, FR, Waste %, Lost Sales %, madurez, confianza) ∈ [0, 1] | §7.1 | P1 |
| SCM-INV-09 | ITR > 0, DOI > 0, `DOI ≈ días_periodo / ITR` (tolerancia 1%) | K-04, K-05 | P1 |
| SCM-INV-10 | En modo determinista, `BWR ≥ 1` | K-09 | P2 |
| SCM-INV-11 | `1 ≤ s ≤ Cap_vehículo/drop`, y `T_ruta ≤ T_turno` (si no cabe, se agregan vehículos, no se alarga el turno) | §6.3 | P1 |
| SCM-INV-12 | Con consolidación combinada, `Trucks/store/day = Σ frecuencias por categoría`. Con DSD, `= Σ proveedores × frecuencia` | D-10, D-12 | P1 |
| SCM-INV-13 | **Cierre contable:** EBITDA logístico = ventas·margen − Σ componentes de costo; el *waterfall* suma exacto | §6.3 | P1 |
| SCM-INV-14 | Todo evento ocurrido produce un mensaje con fecha, impacto cuantificado y ≥ 1 *driver*. Toda regla disparada queda en el log | §8, §9 | P1 |
| SCM-INV-15 | No hay NaN, ∞ ni valores indefinidos en ningún KPI ni intermedio | — | P1 |
| SCM-INV-16 | Una decisión fuera de rango o incompatible se rechaza con un mensaje y no altera el estado | §5 | P1 |
| SCM-INV-17 | El capex se carga en la época en que se decide; el beneficio operativo empieza al cumplirse el retraso | §5.2 | P1 |

---

## 4. Dirección causal (pruebas pareadas, modo determinista)

Cada fila compara una corrida **base** contra una **variante** con la misma semilla. Base por omisión: *as-is* de la región indicada.

| ID | Región | Variante (cambio único) | Resultado esperado | Traza | Prio |
|---|---|---|---|---|---|
| SCM-CAU-01 | Red River | +1 CD (ya operativo tras el retraso) | d̄ ↓, T_ruta ↓, costo variable de transporte ↓, costo fijo de CD ↑ | D-01, §6.3 | P1 |
| SCM-CAU-02 | Kaigan y Red River | Barrido de n_CD = 1…20 | El costo logístico total es **convexo** con mínimo interior (no en 1 ni en 20). En Red River, el n_CD óptimo por tienda es menor que en Kaigan | D-01 | P2 |
| SCM-CAU-03 | Kaigan | Frecuencia de frescos 1× → 2× → 3×/día | Transporte ↑ (monótono), merma de frescos ↓ (monótono), inventario en tienda ↓, OSA de frescos ↑ o = | D-11, §6.3 | P1 |
| SCM-CAU-04 | Red River | Frecuencia de frescos 1× → 3×/día | Transporte ↑ **más que proporcional** que en Kaigan (porque δ es grande); se dispara R-05 | D-11, R-05 | P1 |
| SCM-CAU-05 | Kaigan | CSL 90% → 99% | SS ↑, OSA ↑, costo de inventario ↑, ITR ↓ | D-21 | P1 |
| SCM-CAU-06 | Valle | Madurez de D-30 = 0 → 1 (vía `overrideState`) | CV_ef ↓. Con el mismo CSL: SS ↓ e inventario ↓. Con el mismo SS: OSA ↑ | D-30, §6.3 | P1 |
| SCM-CAU-07 | Red River | D-31 No → Diario | BWR ↓ (hacia 1), FR_prov ↑, OTIF ↑ | D-31, §6.3 | P1 |
| SCM-CAU-08 | Red River | DSD → todo por CD (con CD disponible) | Trucks/store/day ↓, costo de recepción en tienda ↓, OSA ↑ o = | D-10, R-04 | P1 |
| SCM-CAU-09 | Kaigan | Consolidación por proveedor → combinada (con CD combinado) | Trucks/store/day ↓ (orden de magnitud: de decenas a < 12) | D-12, D-03 | P1 |
| SCM-CAU-10 | Kaigan (MC, eventos on) | Vehículo mono-temperatura → multi-temperatura + telemetría | Frecuencia de X-01 ↓ y severidad media ↓ en ≥ 90% de semillas pareadas | D-14, X-01 | P2 |
| SCM-CAU-11 | Valle | Entrega en horas pico → horas valle **con** escaneo | t_parada ↓ ≈ 30%, T_ruta ↓, merma ↓ | D-15, D-23, R-12 | P2 |
| SCM-CAU-12 | Valle | Horas valle **sin** escaneo | El beneficio de SCM-CAU-11 desaparece (T_ruta = o ↑ frente a la base) | R-12 | P2 |
| SCM-CAU-13 | Kaigan | SKUs por tienda 3,000 → 4,000 | Demanda potencial ↑, SS total ↑, merma ↑ | D-22 | P2 |
| SCM-CAU-14 | Kaigan | CD de frescos: con inventario → cross-dock | VU_rem ↑, merma de frescos ↓, inventario en CD ↓ | D-03, §6.3 | P1 |
| SCM-CAU-15 | Red River | CD de ambiente: cross-dock → con inventario + SS en CD | SS total de la red ↓ por *pooling* (R-11); el efecto en frescos de vida corta es ≈ 0 | D-03, D-24, R-11 | P2 |
| SCM-CAU-16 | Valle | Apertura dispersa → dominancia de *clusters* | Paradas/ruta ↑, CTS ↓, canibalización ↑ | D-05, R-10 | P1 |
| SCM-CAU-17 | Valle | Barrido de densidad de *cluster* | Ventas totales menos costo logístico es **cóncavo** con óptimo interior (la canibalización acaba superando el ahorro) | D-05, R-10 | P2 |
| SCM-CAU-18 | Kaigan | Proveedores dedicados en frescos (D-07) | t_proveedor→CD ↓, VU_rem ↑, merma ↓ (tras el retraso de 3–4 trimestres) | D-07 | P2 |
| SCM-CAU-19 | Kaigan | *Tanpin kanri* con capacitación baja → alta | El beneficio en error de pronóstico con capacitación alta ≈ 2× el de capacitación baja | D-20, D-34, R-09 | P2 |
| SCM-CAU-20 | Kaigan | Pronóstico estacional → causal, con estacionalidad marcada vs. suave | La reducción de error con perfil marcado es mayor que con perfil suave | D-32, E-21 | P2 |
| SCM-CAU-21 | Cualquiera | Combustible +25% (E-23) | Costo de transporte ↑. El aumento absoluto es mayor en la configuración con más km totales | E-23 | P2 |
| SCM-CAU-22 | Valle | Congestión ×1.3 (E-05) | T_ruta ↑ → merma ↑ y OTIF ↓ | E-05, R-01 | P1 |
| SCM-CAU-23 | Kaigan | Retiro FIFO → descuento por caducidad | Merma ↓, margen bruto unitario ↓ | D-25 | P3 |
| SCM-CAU-24 | Red River | Flota propia → 3PL spot | Costo fijo ↓, costo variable ↑; en modo estocástico, mayor varianza de OTIF | D-13 | P3 |

### 4.1 Matriz de signos (oráculo para pruebas de propiedades)

Efecto esperado de **aumentar** cada decisión sobre cada KPI, con todo lo demás fijo. `+` sube, `−` baja, `0` sin efecto directo, `±` depende del régimen (requiere caso específico).

| Decisión ↑ | OSA | Waste | CTS | ITR | Lost Sales | BWR | Trucks/día | EBITDA |
|---|---|---|---|---|---|---|---|---|
| n_CD (D-01) | + | − | ± | ± | − | 0 | 0 | ± |
| Frecuencia de frescos (D-11) | + | − | + | + | − | 0 | + | ± |
| CSL (D-21) | + | + | 0 | − | − | 0 | 0 | ± |
| SKUs por tienda (D-22) | ± | + | + | − | ± | 0 | 0 | ± |
| Madurez de TI (D-30) | + | − | 0 | + | − | 0 | 0 | + |
| POS compartido (D-31) | + | 0 | 0 | + | − | − | 0 | + |
| Densidad de *cluster* (D-05) | 0 | 0 | − | 0 | 0 | 0 | 0 | ± |
| Mantenimiento (D-16) | + | − | + | 0 | − | 0 | 0 | ± |

---

## 5. Escenarios de referencia (calibración contra el caso)

Modo determinista, decisiones *as-is* salvo que se indique. Los rangos son ⚠ y se ajustan con los datos del caso SEJ y benchmarks.

| ID | Condición | Resultado esperado | Traza | Prio |
|---|---|---|---|---|
| SCM-ESC-01 | Kaigan *as-is* | Trucks/store/day ∈ [8, 11] (SEJ: 9). ITR global ≥ 40. OSA ≥ 96%. Waste de frescos ≤ 5% | E-06, K-04, K-10 | P1 |
| SCM-ESC-02 | Red River *as-is* | Trucks/store/día ∈ [4, 8] (DSD de ~40 proveedores 1×/semana). ITR ∈ [15, 25]. OSA ∈ [88%, 93%]. Frescos < 12% de ventas | E-06, E-11 | P1 |
| SCM-ESC-03 | Valle *as-is* | KPIs intermedios entre Kaigan y Red River en OSA y CTS | E-06 | P2 |
| SCM-ESC-04 | **Trasplante ingenuo:** Red River con 3×/día, cross-dock combinado, sin densificar | CTS % ventas ≥ 2× el de Kaigan *as-is*; se dispara R-05; puntaje < SCM-ESC-05 bajo **todas** las estrategias | R-05, §11 | P1 |
| SCM-ESC-05 | **Adaptado:** Red River con CD con inventario para ambiente, frescos 1×/día, consolidación, POS compartido y densificación gradual | CTS ↓ y OSA ↑ frente a *as-is* a partir de A2 | §11 | P1 |
| SCM-ESC-06 | Mismo paquete de decisiones aplicado a las tres regiones | Orden de CTS por tienda: Kaigan < Valle < Red River | E-03, E-04 | P1 |
| SCM-ESC-07 | *Greenfield* | Ventas = 0 hasta que abre el primer lote (retraso de 1 trimestre); en la época 0 solo hay capex | §4.1 | P2 |
| SCM-ESC-08 | Kaigan con volatilidad alta vs. baja (E-22), mismo CSL | Inventario ↑ con volatilidad alta; FR ≤ | E-22 | P2 |
| SCM-ESC-09 | Perfil de envejecimiento (E-26) | La participación de frescos en la demanda sube de forma monótona a lo largo de las 20 épocas | E-26 | P3 |
| SCM-ESC-10 | Boom (+8%/año) sin ampliar CD | Utilización de CD > 90% antes de A4; dispara R-07; la frescura cae | E-20, R-07 | P2 |

---

## 6. Reglas de causa–efecto (pruebas de umbral)

Cada regla se prueba **justo debajo** y **justo arriba** de su umbral, usando `overrideState` para fijar la condición.

| ID | Regla | Debajo del umbral | Arriba del umbral | Prio |
|---|---|---|---|---|
| SCM-REG-01 | R-01 (ruta > 4 h con frescos) | T_ruta = 3.9 h → P(spoilage) sin multiplicador | T_ruta = 4.1 h → P(spoilage) ×1.5 y R-01 en el log | P1 |
| SCM-REG-02 | R-02 (merma > 6%/semana) | 5.9% → P(OOS) sin cambio | 6.1% → P(OOS) de la semana siguiente ↑ | P1 |
| SCM-REG-03 | R-03 (OSA < 90% dos semanas) | 1 semana bajo 90% → sin efecto en la demanda | 2 semanas seguidas → demanda base de la zona ↓ en la época siguiente. La recuperación es **más lenta** que la caída (asimetría) | P1 |
| SCM-REG-04 | R-04 (DSD y > 15 entregas/día) | 15 → sin penalización | 16 → costo de recepción ↑, P(error de recepción) ↑ | P2 |
| SCM-REG-05 | R-05 (3×/día con δ > 10 km) | δ = 9.9 → sin alerta | δ = 10.1 → alerta en la bandeja y costo con recargo | P1 |
| SCM-REG-06 | R-06 (cross-dock + proveedor de baja confiabilidad) | Con SS en CD → una falla del proveedor se amortigua | Sin inventario → la falla se transmite completa a la OSA | P1 |
| SCM-REG-07 | R-07 (utilización de CD > 90%) | 89% → estancia normal | 91% → estancia ↑, VU_rem ↓ | P2 |
| SCM-REG-08 | R-08 (POS compartido + CPFR maduro) | Madurez < 1 → efecto proporcional | Maduro → LT −20%, σLT −30% | P2 |
| SCM-REG-09 | R-09 (*tanpin kanri* sin capacitación) | Capacitación alta → beneficio completo | Baja → beneficio ×0.5 y varianza entre tiendas ↑ | P2 |
| SCM-REG-10 | R-10 (*clusters* densos) | — | Ver SCM-CAU-16/17 | P2 |
| SCM-REG-11 | R-11 (*pooling*) | 1 tienda por CD → sin beneficio | n tiendas → SS total ∝ √n en ambiente | P2 |
| SCM-REG-12 | R-12 (horas valle + escaneo) | Ver SCM-CAU-11/12 | — | P2 |

---

## 7. Eventos inesperados

| ID | Condición | Resultado esperado | Traza | Prio |
|---|---|---|---|---|
| SCM-EVT-01 | MC N = 1,000 con configuración *as-is* por región | La frecuencia observada de cada X-xx cae dentro del IC 95% de `p_base × Π modificadores` | §8 | P1 |
| SCM-EVT-02 | Kaigan, MC pareado: rutas < 4 h vs. > 4 h | Frecuencia de X-01 ≈ 1.5× en rutas largas (dentro del IC 95%) | X-01, R-01 | P1 |
| SCM-EVT-03 | Estacionalidad del clima | Tifón (Kaigan) solo con p > 0 en sus trimestres de temporada; nieve (Red River) en T1/T4; lluvia torrencial (Valle) en temporada de lluvias. Fuera de temporada, p = 0 o p_base reducida según los parámetros | X-02, E-13 | P1 |
| SCM-EVT-04 | X-03 (sismo) en Red River o Valle | p = 0: nunca ocurre en 1,000 corridas | X-03 | P1 |
| SCM-EVT-05 | X-03 forzado en Kaigan: 1 CD por zona vs. ≥ 2 | Lost Sales durante el evento menores con ≥ 2 CD | X-03 | P2 |
| SCM-EVT-06 | X-04 forzado: cross-dock puro vs. CD con SS | Caída de OSA mayor en cross-dock (R-06) | X-04, R-06 | P1 |
| SCM-EVT-07 | X-08 forzado (POS caído 3 días) | Durante la falla, el pedido = último pedido; al recuperarse, el motor vuelve a la política normal | X-08 | P2 |
| SCM-EVT-08 | X-10 forzado en A2-T1 | Costo de transporte +25% solo en A2-T1; en A2-T2 vuelve a la trayectoria base | X-10 | P2 |
| SCM-EVT-09 | **Cadena:** X-01 forzado tres semanas seguidas | Se disparan R-02 → R-03 y la demanda base de la zona baja en la época siguiente | §8 cadenas | P1 |
| SCM-EVT-10 | **Cadena:** X-04 con cross-dock puro | Probabilidad de X-06 en la época siguiente > p_base | §8 cadenas | P2 |
| SCM-EVT-11 | Mismo evento forzado, misma semilla, dos corridas | Impacto idéntico (el forzado es determinista) | Gancho 2 | P1 |
| SCM-EVT-12 | Cualquier evento | Los *drivers* del mensaje coinciden con los modificadores activos en ese momento (no se listan mitigaciones que el jugador no tiene) | §8, §9 | P1 |
| SCM-EVT-13 | X-02 en Kaigan con pronóstico causal | Se registra el pico de compras de pánico **antes** del cierre de rutas | X-02 | P3 |

---

## 8. Retrasos, dependencias y reversibilidad

| ID | Condición | Resultado esperado | Traza | Prio |
|---|---|---|---|---|
| SCM-LAG-01 | CD nuevo decidido en A1-T1 con retraso de 3 trimestres | d̄ no cambia en A1-T1…A1-T3; cambia desde A1-T4. El capex se carga en A1-T1 | D-01, INV-17 | P1 |
| SCM-LAG-02 | D-30 implantado | La madurez es 0 al implantarse y crece hasta 1 durante 2 trimestres de aprendizaje; el beneficio es proporcional a la madurez | D-30 | P1 |
| SCM-LAG-03 | Cierre de CD | Se carga una indemnización; el capex no se recupera; la red se reconfigura en la época siguiente | D-01 | P2 |
| SCM-LAG-04 | Cambio de estrategia (D-00) | Se permite una vez con penalización; un segundo intento se rechaza | D-00 | P1 |
| SCM-LAG-05 | D-33 = CPFR con D-31 = No | Se rechaza con mensaje "requiere POS compartido" | D-33 | P1 |
| SCM-LAG-06 | D-20 = *tanpin kanri* sin terminal gráfica (D-30) | Se rechaza | D-20 | P1 |
| SCM-LAG-07 | D-12 = combinada sin CD combinado (D-03) | Se rechaza | D-12 | P1 |
| SCM-LAG-08 | D-24 (SS en CD) con CD cross-dock | Se rechaza o se ignora con aviso | D-24 | P2 |
| SCM-LAG-09 | Reducir la capacidad de un CD (D-04) | Se rechaza: solo se permite ampliar | D-04 | P2 |

---

## 9. Puntaje

| ID | Condición | Resultado esperado | Traza | Prio |
|---|---|---|---|---|
| SCM-SCO-01 | Tabla de pesos | Los pesos suman 1.00 para cada estrategia | §7.3 | P1 |
| SCM-SCO-02 | Misma trayectoria de KPIs evaluada con las tres estrategias | Una corrida de OSA alta y CTS alto puntúa más bajo *frescura* que bajo *bajo costo* | §7.3 | P1 |
| SCM-SCO-03 | Se agregan violaciones de guardrail a una corrida | El puntaje es estrictamente decreciente con el número de violaciones | §7.2 | P1 |
| SCM-SCO-04 | Cualquier corrida | Puntaje ∈ [0, 100] | §7.3 | P1 |
| SCM-SCO-05 | *As-is* de cada región, estrategia por omisión | Los puntajes caen en una banda comparable (p. ej. 40–60) para que ninguna región sea injugable. ⚠ Depende de cómo se normalice por región (decisión pendiente) | §7.3 | P2 |

---

## 10. Persistencia y exportación

| ID | Condición | Resultado esperado | Prio |
|---|---|---|---|
| SCM-PER-01 | Guardar y recargar una corrida desde `localStorage` | Objeto idéntico (comparación profunda) | P1 |
| SCM-PER-02 | `localStorage` lanza excepción (modo privado) | El juego sigue en memoria y muestra un aviso; no hay error fatal | P1 |
| SCM-PER-03 | Exportar el JSON y pasarlo por `replay` | KPIs y eventos idénticos; el checksum coincide | P1 |
| SCM-PER-04 | JSON alterado a mano (se cambia un KPI) | `replay` y el checksum detectan la alteración | P1 |
| SCM-PER-05 | Exportar CSV | 20 filas (una por época) × columnas de KPI; valores iguales a los del JSON | P1 |
| SCM-PER-06 | Importar un JSON del simulador de logística o de versión incompatible | Se rechaza con mensaje claro | P2 |
| SCM-PER-07 | Varias corridas guardadas; borrar una | Las demás quedan intactas | P2 |

---

## 11. Protocolo de auto-juego

El objetivo es validar que **el modelo enseña lo que debe enseñar**: decisiones coherentes con la región y la estrategia ganan; decisiones desalineadas pierden; ningún extremo trivial domina; la suerte no pesa más que la habilidad.

### 11.1 Bots de referencia

| Bot | Política | Para qué sirve |
|---|---|---|
| **BOT-A Estático** | Confirma *as-is* las 20 épocas | Línea base por región |
| **BOT-B Trasplante** | Copia el modelo Kaigan en cualquier región (3×/día, cross-dock combinado, sin densificar) | Debe perder fuera de Kaigan |
| **BOT-C Adaptado** | Política diseñada por región (SCM-ESC-05 en Red River; densificación + POS en Valle) | Debe ganar a A y B |
| **BOT-D Maximalista** | Todo al máximo: 20 CD, 3×/día, CSL 99%, todos los sistemas | Detecta "gastar resuelve todo" |
| **BOT-E Minimalista** | 1 CD, 1×/semana, CSL 85%, sin TI | Detecta "no hacer nada es barato y gana" |
| **BOT-F Aleatorio** | Decisiones aleatorias válidas en cada época | Robustez e invariantes |
| **BOT-G Reactivo** | Reglas simples: si OSA < 92%, sube frecuencia; si Waste > 8%, baja cobertura; si CTS > X, baja frecuencia | Comportamiento de un alumno "táctico" |
| **BOT-H Buscador** | Búsqueda aleatoria + *hill climbing* sobre decisiones para maximizar el puntaje por región × estrategia | Detecta explotaciones y óptimos en los límites |

### 11.2 Propiedades esperadas (modo estocástico, MC N = 200 salvo indicación)

| ID | Propiedad | Criterio de aceptación | Prio |
|---|---|---|---|
| SCM-AUT-01 | Robustez | BOT-F, 10,000 corridas: cero errores, cero NaN e invariantes §3 al 100% | P1 |
| SCM-AUT-02 | Desalineación pierde | Red River: BOT-B queda en los 2 peores lugares entre A–E bajo las tres estrategias en ≥ 80% de semillas | P1 |
| SCM-AUT-03 | Adaptación gana | Red River y Valle: BOT-C > BOT-A y BOT-C > BOT-B en ≥ 80% de semillas, para cada estrategia | P1 |
| SCM-AUT-04 | Ningún extremo domina | BOT-D nunca es el mejor bajo *bajo costo*; BOT-E nunca es el mejor bajo *frescura* (≥ 95% de semillas) | P1 |
| SCM-AUT-05 | Decisiones significativas | Los óptimos de BOT-H difieren entre combinaciones: ≥ 3 configuraciones distintas entre las 9 de región × estrategia | P2 |
| SCM-AUT-06 | Óptimos interiores | En BOT-H, el n_CD, la frecuencia y el CSL óptimos no están en los límites del rango en ≥ 7 de 9 combinaciones. Si lo están, hay que revisar la calibración | P2 |
| SCM-AUT-07 | Validación contra el caso | Kaigan + frescura: el óptimo de BOT-H se parece al diseño SEJ (CD combinado cross-dock, ≥ 2×/día de frescos, *clusters* densos, POS diario) | P2 |
| SCM-AUT-08 | Geografía cambia el óptimo | Red River + frescura: frecuencia óptima ≤ 2×/día y ≥ 1 CD con inventario para ambiente | P2 |
| SCM-AUT-09 | Habilidad > suerte | CV del puntaje de BOT-A entre semillas < 15%; la diferencia media BOT-C − BOT-B > 2 desviaciones estándar | P1 |
| SCM-AUT-10 | Resiliencia tiene valor | Kaigan: la configuración con ≥ 2 CD por zona tiene un **p5** de puntaje mayor que la de 1 CD por zona, aunque las medias se parezcan | P2 |
| SCM-AUT-11 | La información tarda | BOT-A + solo D-30/D-31: OSA ↑ y BWR ↓, con efecto visible hasta 2–4 trimestres después de decidir | P2 |
| SCM-AUT-12 | Estabilidad del reactivo | BOT-G no produce KPIs fuera de rango ni costos explosivos. Se registra si oscila (útil para el debrief sobre bullwhip autoinducido) | P3 |
| SCM-AUT-13 | Robustez de la calibración | Al perturbar ±20% cada constante de `params` (una a la vez), el orden BOT-C > BOT-B en Red River se mantiene en ≥ 90% de las perturbaciones | P2 |
| SCM-AUT-14 | **Explicabilidad** | En cada corrida, todo cambio de KPI > 10% entre épocas tiene ≥ 1 causa registrada (cambio de decisión, evento, regla o tendencia de escenario). Cobertura ≥ 95% | P1 |

### 11.3 Reporte de coherencia (salida de cada sesión de auto-juego)

1. Tabla de puntaje medio, p5 y p95 por bot × región × estrategia.
2. Propiedades SCM-AUT que pasan y fallan.
3. Óptimos encontrados por BOT-H, marcando los que están en un límite del rango.
4. Las 10 transiciones de KPI peor explicadas (para depurar reglas).
5. Sensibilidad: las constantes cuya perturbación cambia más el orden de los bots.

**Alarmas de calibración:** BOT-B gana en alguna región fuera de Kaigan · BOT-D o BOT-E ganan bajo la estrategia contraria · óptimos en límites · CV de la suerte > 15% · cobertura de explicabilidad < 95%.

---

[← Especificación](./especificacion.md) · [Sesión 4](../sesion-4.md)
