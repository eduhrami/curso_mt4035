# Simulador Logística y Última Milla — Especificación

**Curso:** MT4035 · **Sesión asociada:** [Sesión 5 — Transporte y logística omnicanal](../sesion-5.md)
**Profesor:** Eduardo
**Estado:** ⚠ borrador preliminar v0.1. En esta etapa se definen escenarios, decisiones, reglas de causa–efecto y KPIs. Los valores numéricos son de calibración inicial y deben validarse antes de programar.
**Inspiración:** slides de S5 (fulfillment omnicanal, promesa vs. cumplimiento, pares primario–guardrail, VRP, zonificación, IA) y el [scorecard de KPIs de transporte y última milla](../references/sesion-5-scorecard-kpis-transporte-ultima-milla-v2.md). La empresa y los territorios del juego son **ficticios**.
**Casos de prueba:** [casos-de-prueba.md](./casos-de-prueba.md). Incluye los ganchos de prueba que el motor debe exponer (§2) y el protocolo de auto-juego (§11).
**Arquitectura y UI (compartidas):** [decisiones-arquitectura-ui.md](../simuladores-comun/decisiones-arquitectura-ui.md).

---

## 1. Propósito

Este simulador pone al alumno frente a la pregunta de negocio de S5: **¿cómo hago llegar mis pedidos al cliente al menor costo sin romper la promesa de entrega?** El alumno elige un territorio y unas condiciones de mercado. Después decide la red de *fulfillment*, la promesa, la flota, la zonificación, el ruteo y la logística inversa. Durante 36 meses simulados observa cómo se mueven sus KPIs primarios y sus guardrails, mientras enfrenta picos de demanda, lluvias, bloqueos y fallas de cadena de frío.

**Objetivos de aprendizaje** (alineados con S5):

1. Leer los KPIs en **pares primario–guardrail** (servicio vs. costo/flota) y ver por qué "agrego camiones hasta cumplir" no es solución.
2. Comparar alternativas de *fulfillment* (ship-from-DC, ship-from-store, BOPIS, dark store, MFC, lockers) y anticipar su efecto en costo, servicio y capacidad.
3. Ver que la **promesa** debe ser operativamente defendible: ventanas, *cut-off*, buffers y asignación de nodo.
4. Experimentar la economía de última milla (densidad, *drop size*, reintentos, devoluciones) y la diferencia entre ruteo urbano denso y rural disperso.
5. Entender qué aporta y qué no la IA en logística: ETA, asignación dinámica, zonificación. No elimina las restricciones físicas.
6. Diseñar la **regla de asignación** entre opciones, no solo escoger una (punto pedagógico del mini-caso de S5).

**Lo que no cubre** (para no traslaparse con otras sesiones):

- **S4:** la red aguas arriba (proveedor → CD → tienda), la política de inventario y el bullwhip. Aquí el CD y las tiendas existen, y el inventario disponible por nodo es un dato con ruido.
- **S6:** abastecimiento y producción.
- **S7:** precios de producto y promociones. La **tarifa de envío** sí es una decisión de servicio logístico de este simulador; el precio del producto no.

---

## 2. Storytelling: Mercado Alba (ficticia)

> **Mercado Alba** es una cadena mexicana de supermercados de formato medio: abarrotes, frescos, farmacia y mercancía general. Tiene 25 años de historia y una marca querida por la calidad de sus frescos. En 2024 lanzó su app y su sitio de e-commerce. Los pedidos en línea crecen a doble dígito, pero la operación se improvisó:
>
> - todo sale del CD con camionetas de un 3PL;
> - la promesa es "entrega al día siguiente, de 9 a 21 h";
> - casi 1 de cada 5 entregas falla al primer intento;
> - las quejas por producto frío que llega tibio se multiplicaron.
>
> Mientras tanto, un competidor de *quick commerce* promete despensas en 30 minutos y el consejo pregunta si Alba debe seguirle el paso.
>
> **Tú eres la nueva Dirección de Logística y Última Milla.** Tienes 36 meses y presupuesto limitado. Debes decidir desde dónde se surte cada pedido, qué se promete, con qué flota y cómo se rutea. Debes probar con KPIs que el servicio mejora **sin** que el costo por pedido destruya el margen del canal en línea.

**Rol del jugador:** decide *fulfillment*, promesa, segmentación de servicio, flota, zonificación, ruteo, comunicación con el cliente, logística inversa y plan de picos. **No** decide la ubicación de CD ni de tiendas, la política de inventario aguas arriba ni el precio de los productos.

---

## 3. Mecánica general

| Elemento | Definición |
|---|---|
| Horizonte | **36 meses = 36 épocas** (fijo), etiquetadas A1-M01 … A3-M12. Mensual porque la estacionalidad (Hot Sale en mayo, regreso a clases en agosto, Buen Fin en noviembre, Navidad en diciembre) es central en última milla; tres ciclos de picos permiten aprender y corregir |
| Época de decisión | **Mes**. Al inicio de cada una de las 36 épocas el jugador decide (o confirma sin cambios). Las decisiones de picos (D-36, D-26) se toman el mes previo o al inicio del mes del pico |
| Tick interno del motor | **Día**, con dos franjas (mañana y tarde) para capturar picos dentro del día. Cada zona se calcula en agregado, sin rutas individuales |
| Modo de juego | **Manual, época por época.** El jugador revisa resultados y mensajes, ajusta y **confirma** sus decisiones, y el motor corre el mes. La siguiente época no avanza sin confirmación. No hay modo automático ni mixto: cada mes es un punto de decisión explícito |
| Aleatoriedad | PRNG con **semilla**. Con la misma semilla y las mismas decisiones se obtiene la misma corrida |
| Jugadores | Un jugador por navegador, sin servidor |
| Persistencia | `localStorage`, con varias corridas |
| Entrega al profesor | Exportar a JSON (reproducible) y a CSV (KPIs por mes y por zona) |
| Puntaje | Índice compuesto por pares primario–guardrail, ponderado por la **estrategia de servicio** declarada (§7.3) |

**Flujo:** setup → diseño inicial (época 0, desde la operación *as-is*) → ciclo mensual (decisiones → ~30 días simulados → eventos → KPIs → mensajes causales) → cierre con scorecard y exportación.

---

## 4. Mapa de escenarios (factores dados o externos)

### 4.1 Escenarios estructurales: territorio

| ID | Factor | Megalópolis Centro (urbano denso) | Ciudad Bajío (ciudad media) | Región Norte (dispersa) |
|---|---|---|---|---|
| E-01 | Tiendas Alba / CD | 45 tiendas, 1 CD periférico | 15 tiendas, 1 CD | 20 tiendas repartidas en 5 ciudades + zona rural, 1 CD |
| E-02 | Pedidos en línea iniciales | ~2,500/día | ~600/día | ~400/día (60% en la ciudad principal) |
| E-03 | Densidad de pedidos | Muy alta en el centro y alta en la periferia | Media | Alta en el centro de cada ciudad y muy baja en zonas rurales |
| E-04 | Distancia CD → centroide de demanda | 25–40 km con tráfico severo | 10–15 km | 15 km a la ciudad principal; 80–250 km a las demás |
| E-05 | Velocidad media y variabilidad del tráfico | Baja (~15 km/h) y **muy variable** | Media (~30 km/h) | Alta en carretera (~70 km/h) y baja variabilidad |
| E-06 | Calidad de direcciones (geocodificación) | Media (colonias irregulares, referencias tipo "portón azul") | Alta (fraccionamientos) | Baja en zonas rurales |
| E-07 | Presencia del cliente en casa | Baja de día (trabaja fuera) | Media | Alta |
| E-08 | Acceso | Edificios, cotos y estacionamiento difícil | Cotos con caseta | Sin problema de acceso |
| E-09 | Índice de inseguridad en ruta | Medio–alto en ciertas zonas | Bajo | Medio en tramos carreteros |
| E-10 | Regulación | Restricción por contaminación (programa de no circulación) y ventanas de carga en el centro histórico | Laxa | Laxa |
| E-11 | Clima | Lluvias torrenciales e inundaciones (jun–sep) | Lluvias moderadas | Calor extremo (may–ago) con mucho riesgo de cadena de frío |
| E-12 | Pago contra entrega (COD) | 15% de pedidos | 10% | 30% |
| E-13 | Competencia | *Quick commerce* (30 min) y marketplaces | Marketplaces | Escasa |
| E-14 | Mercado de repartidores *crowdsourced* | Abundante | Medio | Escaso |

### 4.2 Escenarios dinámicos: condiciones de mercado

| ID | Factor | Opciones de perfil | Qué afecta |
|---|---|---|---|
| E-20 | Crecimiento del canal en línea | Lento (+10%/año) · Medio (+25%) · Explosivo (+50%) | Volumen y saturación de capacidad |
| E-21 | Calendario de picos | Hot Sale (may), regreso a clases (ago), Buen Fin (nov), Navidad (dic), quincenas. La magnitud es aleatoria (×1.3–×2.5) | Dimensionamiento de flota y capacidad de nodo |
| E-22 | Mezcla de pedidos | % de frescos y refrigerados (20–50%) · % de voluminosos (5–20%) · tamaño medio de canasta | Cadena de frío, capacidad del vehículo, *drop size* |
| E-23 | Sensibilidad del cliente a la velocidad | Baja · Media · Alta | Respuesta de la demanda a la promesa |
| E-24 | Sensibilidad a la tarifa de envío | Baja · Media · Alta | Respuesta de la demanda a la tarifa y al mínimo de compra |
| E-25 | Costo de energía | Gasolina estable/volátil · Electricidad estable | Costo por km según el tipo de vehículo |
| E-26 | Mercado laboral de choferes | Holgado · Escaso | Costo, rotación y ausentismo |
| E-27 | Tasa base de devoluciones | Baja (abarrotes) · Media (mercancía general) | Volumen de logística inversa |

### 4.3 Escenarios de mercado predefinidos (5-oct-2026)

La pantalla de inicio ofrece cuatro escenarios cerrados (cada ficha muestra el perfil, el concepto de clase, la semilla y la región o territorio sugerido; las notas de «qué revisar» y la pregunta propia del escenario pasan al debrief final, §11) en lugar del panel libre de la §4.2, para que distintos equipos y estrategias se comparen en las mismas condiciones y cada escenario ilustre un concepto de clase. Cada uno fija el perfil completo y propone una semilla: **mismo escenario + misma semilla = misma demanda y mismos eventos**, así la diferencia en KPIs se atribuye a las decisiones. La semilla se puede cambiar (por ejemplo, una por grupo). El panel libre sigue disponible bajo **«Crear mi propio escenario»**; esas corridas se marcan como «Escenario propio».

| ID | Escenario | Perfil (factores que se apartan del neutro) | Concepto de clase | Contraste más claro en | Semilla ⚠ |
|---|---|---|---|---|---|
| EM-01 | **Mercado base** | Perfil neutro (por omisión): crecimiento medio, sensibilidades medias a velocidad y tarifa, frescos medios, gasolina estable, choferes holgados, devoluciones bajas | Línea base: frontera entre entrega a tiempo (OTD) y costo por pedido (CPD) | Megalópolis Centro | 5101 |
| EM-02 | **Carrera por la velocidad** | Crecimiento explosivo (E-20), sensibilidad alta a la velocidad (E-23) y baja a la tarifa (E-24) | El costo de la velocidad: express y mismo día contra saturación de capacidad en los picos | Megalópolis Centro | 5202 |
| EM-03 | **Margen apretado** | Crecimiento lento (E-20), sensibilidad baja a la velocidad y alta a la tarifa (E-23, E-24), gasolina volátil (E-25), choferes escasos (E-26) | Eficiencia: consolidación, BOPIS, lockers y segmentación del servicio por zona | Región Norte | 5303 |
| EM-04 | **Canasta compleja** | Frescos altos (E-22), devoluciones altas de mercancía general (E-27) | Cadena de frío en la última milla y logística inversa por diseño | Ciudad Bajío | 5404 |

Los ids EM-xx son internos (no se muestran al jugador). La corrida guarda el id en `setup.preset` (`config.scenario.preset`) y el nombre del escenario se muestra en la barra superior, en el reporte final y en el comparador de corridas. Las corridas anteriores sin `preset` se reconocen por coincidencia exacta del perfil. Definición en [`app/src/presets.ts`](app/src/presets.ts). ⚠ Las semillas y la dificultad relativa de cada escenario están pendientes de revisar con auto-juego.

---

## 5. Mapa de decisiones (acciones del jugador)

Organizadas según las **5 decisiones que cambian la historia** de S5 más las operativas. Cada decisión trae su costo, retraso y reversibilidad.

### 5.1 Estrategia de servicio (setup)

| ID | Decisión | Opciones | Efecto |
|---|---|---|---|
| D-00 | Estrategia de servicio declarada | **Velocidad** (competir con *quick commerce*) · **Confiabilidad** (promesa que siempre se cumple) · **Eficiencia** (costo mínimo por pedido) | Pesos del puntaje y expectativas del cliente |

### 5.2 Red de fulfillment (decisión 1: red e inventario integrado)

| ID | Decisión | Opciones / rango | Retraso | Costo | Reversibilidad |
|---|---|---|---|---|---|
| D-01 | Ship-from-DC (SFD) | Activo/inactivo; capacidad de *picking* en línea del CD | — | Variable bajo por pedido | Alta |
| D-02 | Ship-from-store (SFS) | Elegir qué tiendas surten pedidos (0–100%) y su capacidad (pickers/turno) | 1 mes | Picking más caro; compite con la operación de piso | Alta |
| D-03 | BOPIS / pick-up en tienda | Por tienda, sí/no; *drive-up* opcional | 1 mes | Bajo | Alta |
| D-04 | Dark store | Abrir 0–N en zonas densas | 3 meses | Fijo alto (renta + personal) | Baja |
| D-05 | MFC (micro-fulfillment automatizado) | 0–N en zonas muy densas | 6 meses | Capex muy alto; picking muy barato y rápido | Muy baja |
| D-06 | Lockers / puntos de recolección | 0–N (propios o en alianza con tiendas de conveniencia) | 1–2 meses | Fijo bajo; mejora la entrega a primer intento | Media |
| D-07 | Micro-hubs de cross-dock | 0–N en la periferia o en ciudades secundarias (Norte) | 2 meses | Fijo medio | Media |

### 5.3 Asignación de pedidos

| ID | Decisión | Opciones | Notas causales |
|---|---|---|---|
| D-10 | Regla de asignación de nodo | **Nodo más cercano** · **Menor costo estimado** · **Umbral de costo dinámico** (compara DC vs. tienda vs. costo de oportunidad del inventario en piso; Bayram & Cesaret, 2021) · **Asignación con IA** | Las reglas sofisticadas requieren datos (D-60). La "más cercana" satura tiendas populares |
| D-11 | Intervalo de batching ATP | 5, 15, 60 o 240 min | Corto: más responsivo, peor asignación (Chen, Zhao & Ball, 2002) |
| D-12 | Tope de SFS por tienda | % máximo de horas de piso dedicadas a picking en línea | Protege la OSA de la tienda física |

### 5.4 Promesa y segmentación de servicio (decisión 3)

| ID | Decisión | Opciones | Notas causales |
|---|---|---|---|
| D-20 | Niveles de servicio ofrecidos | Express (< 2 h) · Mismo día · Día siguiente · Estándar (2–4 días) · Combinaciones | Cada nivel adicional fragmenta la densidad |
| D-21 | Ancho de ventana de entrega | 1 h · 2 h · 4 h · Todo el día | Ventana angosta: mejor entrega a primer intento, menos paradas por ruta |
| D-22 | Hora de corte (*cut-off*) por nivel | Por ejemplo, mismo día con corte a las 12, 14 o 16 h | Cortes tardíos son más atractivos y exprimen la capacidad de la tarde |
| D-23 | Buffer de promesa | 0%–30% de holgura sobre el tiempo estimado | Promesa realista frente a optimista |
| D-24 | Segmentación | Por cliente (membresía), por categoría (frescos con ventana corta) o por zona (urbano vs. rural) | Libera capacidad y baja el CTS sin tocar el servicio global |
| D-25 | Tarifa de envío y mínimo de compra | Tarifa por nivel; umbral de envío gratis | Sube el *drop size* y frena la demanda |
| D-26 | Capacidad diaria publicada | Tope de pedidos por ventana y zona (*slotting*) | Evita prometer lo que no cabe |

### 5.5 Flota y modos de entrega (decisión 2: mezcla de modos)

| ID | Decisión | Opciones | Notas causales |
|---|---|---|---|
| D-30 | Mezcla de flota | Flota propia · 3PL dedicado · *Crowdsourced* · Portafolio (% de cada uno) | Propia: fijo, controlable, confiable. *Crowdsourced*: variable, elástica, menos confiable |
| D-31 | Tipo de vehículo | Camioneta de combustión · Camioneta eléctrica · Moto · Bici de carga · Refrigerada | EV: energía barata, autonomía limitada en Norte, sin restricción ambiental. Moto/bici: express urbano, poca capacidad |
| D-32 | Equipo de cadena de frío | Ninguno · Hieleras o bolsas térmicas · Vehículo refrigerado · Compartimentos multi-temperatura | Reduce la tasa de spoilage |
| D-33 | Tamaño de flota propia | N vehículos por zona (dimensionamiento) | Flota mínima vs. sobrecapacidad |
| D-34 | Turnos | 1 o 2 turnos; fines de semana | Capacidad vs. costo laboral |
| D-35 | Esquema de pago a choferes | Fijo · Por parada · Mixto con bono por entrega a primer intento y OTD | El pago por parada sube la productividad y también los intentos "fantasma" y los accidentes |
| D-36 | Contratos para picos | Flota temporal contratada con anticipación (más barata) o spot (más cara e incierta) | Dimensionamiento para Buen Fin y Navidad |

### 5.6 Zonificación y ruteo (decisión 5)

| ID | Decisión | Opciones | Notas causales |
|---|---|---|---|
| D-40 | Número de zonas por territorio | k = 3–30 | Pocas zonas: rutas largas. Muchas: menos consolidación |
| D-41 | Método de zonificación | Por colonias o fijo · k-means · **k-means balanceado** · **Clustering capacitado** · Dinámico por demanda | Balanceado o capacitado: carga pareja y menos rutas saturadas |
| D-42 | Frecuencia de re-zonificación | Nunca · Trimestral · Mensual · Diaria (dinámica) | Re-zonificar mucho hace perder la familiaridad del chofer con la zona (paradas por hora −) |
| D-43 | Método de ruteo | Rutas fijas manuales · Heurística (*savings*, *cluster-first/route-second*) · Optimizador VRPTW · VRP dinámico con IA (re-ruteo en tiempo real) | Más sofisticado: mejor eficiencia de ruta, si los datos lo permiten |
| D-44 | Función de costo del ruteo | Distancia euclidiana · Tiempo medio · **Tiempo dependiente de la hora + restricciones** (requiere D-60) | El proxy pobre subestima el tiempo real y cae el OTD (lección UPS/ORION) |
| D-45 | Secuencia de carga | Sin regla · Frescos al final del *picking* y primero en la ruta | Reduce el tiempo fuera de frío |

### 5.7 Comunicación con el cliente y primer intento

| ID | Decisión | Opciones | Notas causales |
|---|---|---|---|
| D-50 | Notificación de ETA | Ninguna · SMS el día de entrega · **Seguimiento en vivo + ventana de 30 min** | Sube la entrega a primer intento y la CSAT |
| D-51 | Validación de dirección | Ninguna · Validación al capturar · Geocodificación + referencias + foto del domicilio | Baja la tasa de dirección errónea, sobre todo en zonas de E-06 bajo |
| D-52 | Política ante cliente ausente | Reintento el mismo día · Reintento al día siguiente · Desvío a locker o tienda · Dejar con vecino o caseta | Afecta reintentos, costo y riesgo de reclamo |
| D-53 | Pago contra entrega | Permitir · Limitar a clientes recurrentes · Eliminar | COD sube las entregas fallidas; eliminarlo reduce la demanda en Norte |

### 5.8 Logística inversa (devoluciones por diseño)

| ID | Decisión | Opciones | Notas causales |
|---|---|---|---|
| D-55 | Canal de devolución | Solo en tienda · Recolección a domicilio · Lockers · Mixto | Costo vs. experiencia |
| D-56 | Consolidación de devoluciones | Rutas dedicadas · **Recolección en la ruta de salida** (*backhaul*) | El *backhaul* baja los km vacíos y el costo de devolución |

### 5.9 Datos, medición y seguridad (decisión 4)

| ID | Decisión | Opciones | Notas causales |
|---|---|---|---|
| D-60 | Calidad y granularidad de datos | Básica · Telemetría GPS · Telemetría + tráfico histórico + payload | Habilita D-10 con IA, D-43 dinámico y D-44. Sin datos, la IA rinde poco |
| D-61 | Nivel de agregación del reporte | Promedio mensual · Por día · **p95 y por día pico** | No cambia la operación, cambia **lo que ve** el jugador. Con promedio, los lunes de 65% de OTIF se esconden (lección de S5) |
| D-62 | Medidas de seguridad en ruta | Ninguna · GPS + botón de pánico · Horarios y rutas variables + seguro | Bajan la probabilidad y la severidad del robo |
| D-63 | Mantenimiento de flota | Correctivo · Preventivo | Averías y fallas de refrigeración |

---

## 6. Motor de reglas: modelo causal

Determinista dada la semilla. El motor calcula por zona y franja con aproximaciones continuas (Daganzo), sin resolver VRP reales. Las constantes son ⚠ de calibración.

### 6.1 Variables de estado

Volumen y mezcla de pedidos por zona, nodos activos y su capacidad, inventario disponible por nodo (con ruido: el SKU puede no estar en la tienda asignada), flota por tipo y su estado, familiaridad de los choferes con su zona (0–1), madurez de datos y herramientas (0–1), CSAT y NPS por zona (memoria con retraso), reputación en línea (0–1), caja y capex.

### 6.2 Grafo causal principal

```
Densidad de pedidos (E-03) ─► paradas por ruta ─► costo por pedido entregado (CPD)
Niveles de servicio (D-20) + ancho de ventana (D-21) ─► densidad efectiva por ventana (−) ─► paradas por ruta (−) ─► CPD (+)
Ancho de ventana (D-21) ─► P(cliente presente) (−) ─► entrega a 1er intento (FADS) (−) ─► reintentos ─► CPD (+), CSAT (−)
Notificación de ETA (D-50) ─► P(cliente presente) (+)
Validación de dirección (D-51) ─► P(dirección correcta) (+) ─► FADS (+)
Nodo asignado (D-01…07, D-10) ─► distancia de la línea troncal ─► duración de ruta ─┬─► CPD
                                                                                    ├─► tiempo fuera de frío ─► P(spoilage) ─► excepción, reembolso, CSAT (−)
                                                                                    └─► varianza de llegada ─► OTD
Ruteo (D-43/44) + datos (D-60) ─► eficiencia de ruta (+) y precisión de ETA (+)
SFS (D-02) ─► horas de picking en piso ─► OSA de la tienda física (−) y errores de picking (+)
Promesa (D-22/23) vs. capacidad ─► backlog ─► OTD (−) ─► CSAT (−) ─► demanda futura (−)
Velocidad prometida (D-20) ─► demanda (+, según E-23)    Tarifa (D-25) ─► demanda (−) y tamaño de canasta (+)
Flota insuficiente en pico ─► crowdsourced spot (costo +, confiabilidad −) o pedidos rechazados
```

### 6.3 Fórmulas núcleo (versión inicial)

**Densidad efectiva y rutas (aproximación continua):**

- Pedidos por zona, franja y ventana: `n_w = n_zona / (#ventanas · #niveles_activos)`. La segmentación reduce la fragmentación cuando agrupa niveles por zona.
- Longitud de la ruta para *s* paradas en un área *A*: `L ≈ 2·d_troncal + k_TSP · √(s · A_zona)`, con `k_TSP ≈ 0.75`.
- Paradas por ruta: `s = min( Cap_vehículo / volumen_pedido , (T_turno − 2·d_troncal/v) / (t_parada + k_TSP·√(A/n_w)/v) , límite_ventana )`.
- Tiempo por parada: `t_parada = t_base(acceso E-08) · (1 − 0.15 · familiaridad) · f_pago(COD)`.
- **CPD** = `(costo_vehículo_día + costo_chofer_día + energía·km) / entregas_exitosas + picking(nodo) + reintentos·costo_reintento / entregas + costo_devoluciones / entregas`.
- Calibración objetivo: USD 1.40–12 por paquete según estrategia y densidad (Pahwa & Jaller, 2022). En rural disperso, hasta 4–5× el urbano.

**Puntualidad y ETA:**

- Holgura de la ruta: `h = T_prometido·(1 + buffer) − T_estimado`.
- Desviación de llegada: `σ_lleg = σ_tráfico(E-05) · √s · (1 − q_ruteo · madurez_datos)`.
- `OTD = Φ(h / σ_lleg)`, menos el efecto del backlog cuando la demanda supera la capacidad del día.
- `ETA accuracy = 1 − |ETA − real| / ventana`, que mejora con D-50, D-60 y D-43.

**Primer intento:**

`FADS = P(presente | ventana, ETA, E-07) · P(dirección OK | D-51, E-06) · P(acceso OK | E-08) · (1 − p_rechazo_COD)`

**Cadena de frío:**

- Tiempo fuera de frío por pedido fresco: `t_frío = t_picking_espera + posición_en_ruta · T_ruta/s`, que baja con D-45.
- `P(spoilage) = 1 − exp(−λ(clima, D-32) · max(0, t_frío − umbral))`. En Norte con calor extremo, λ ×2. Un spoilage genera excepción, reembolso o reposición y un golpe a la CSAT.

**Capacidad de nodo:**

- Utilización: `u = pedidos asignados / capacidad de picking`. Con u > 0.85, el tiempo de espera crece de forma no lineal (cola M/M/c simplificada) y se retrasa la salida a ruta.
- SFS: `OSA_tienda = OSA_base − θ · max(0, horas_picking − tope D-12)`. Conecta con la S4: la última milla afecta el anaquel.

**Demanda y experiencia:**

- `pedidos_t+1 = base · f_crec · f_estac · (1 + ε_velocidad·Δpromesa − ε_tarifa·Δtarifa) · f(CSAT_t−1, reputación)`.
- `CSAT = 5 − a·(1−OTD) − b·(1−FADS) − c·tasa_excepción − d·spoilage + e·ETA_accuracy`, acotada entre 1 y 5.

### 6.3b Notas de implementación (F5, 4-oct-2026)

La implementación en `app/` concreta la §6.3 así. Los valores están en `app/params/params.v1.json` (⚠ calibración preliminar; se ajusta con auto-juego en F6).

- **Tick diario en tres pasadas:**
  1. **Por zona:** demanda, reparto entre recoger en tienda, lockers y domicilio, asignación de nodo según D-10, y rutas.
  2. **Flota:** propia, 3PL, *crowdsourced* y contratos de pico.
  3. **Por zona:** puntualidad, primer intento, frío, excepciones, costos, CSAT y confianza.
- **Rutas (Daganzo):**
  - Fórmula: `δ = k_TSP·√(A/n_ef)`, con `n_ef = paradas / fragmentación`.
  - Fragmentación: `#ventanas^0.6 · (1 + 0.35·(niveles − 1)) · f(D-24)`.
  - El método de ruteo multiplica solo el recorrido local, en km y en tiempo; la troncal es directa.
  - El express tiene su propio tope de paradas: lo que cabe en la promesa de 1.5 h.
  - Un locker cuenta como una sola parada (R-14).
- **Nodos de cercanía:**
  - Cada dark store surte su zona y una zona densa vecina, a 5 km.
  - Cada MFC surte su zona y tres vecinas, a 6 km.
  - La capacidad de cada nodo es compartida entre las zonas que atiende.
  - Con cualquier % de SFS > 0 surte al menos una tienda por zona.
  - La utilización de tienda es `pedidos / capacidad de sus surtidores`.
- **Flota:**
  - El 3PL y los contratos de pico se dimensionan con la **necesidad típica**: el promedio del mes anterior, × 1.15 de holgura.
  - En un pico, la flota contratada se queda corta y los pedidos pasan a backlog.
  - Cada día se cancela 30% del backlog.
- **Puntualidad:**
  - Fórmula: `OTD = Φ((ventana/2 · (1 + 2·buffer) − sesgo) / σ)`.
  - `σ = 0.2 · f_ruteo · √(T_ruta/2) · (1 + σ_congestión)`.
  - `sesgo = b(D-44) · T_ruta/2 + espera de picking`.
  - Es decir, el desvío se acumula hasta la parada promedio: la mitad de la ruta.
  - Los pedidos de ayer llegan tarde, salvo en pico con holgura ≥ 10% (la promesa ya incluía un día más).
- **Cadena de frío:** `λ = 0.012` por hora fuera de umbral. En Megalópolis *as-is* da spoilage ≈ 7%; en Bajío y Norte, ≈ 4–5%.
- **R-06:** se dispara en picos del calendario y en el pico viral (X-05). Resta 0.003 de confianza por día en todas las zonas.
- **Mini-caso S5 (fixture `minicaso`, no se ofrece al jugador):** reproduce los costos de la lámina 22: SFS ≈ USD 7.75 y SFD ≈ 9.65 por pedido urbano.
- **Calibración por auto-juego (F6, 4-oct-2026):**
  - R-08 mide el beneficio de la IA contra el ruteo manual: con datos básicos obtiene ~30% y rinde menos que un VRPTW.
  - La telemetría y el tráfico (D-60) cuestan por vehículo en operación: USD 40 (GPS) o 120 (completo) al mes.
  - El mes siguiente a un pico se registra la recuperación del servicio (E-21) en el log causal.
  - **Holgura de la promesa (D-23):** alarga la promesa que ve el cliente.
    - Cuesta 1–4% de demanda por cada 10% de holgura, según la sensibilidad a la velocidad (E-23), y la CSAT percibe la promesa más lenta.
    - La presencia en casa usa la ventana efectiva (ancho × (1 + 2·holgura)), interpolada entre las ventanas ofrecidas.
    - R-06 se dispara con holgura < 10%.
  - X-06 (ausentismo) solo ocurre con flota propia.
  - X-11 (competidor *quick commerce*) quita 10% sostenido en zonas urbanas, o 3% si respondes con express y CSAT ≥ 4. Una nueva ocurrencia no vuelve a restar.
  - **Puntaje por territorio:**
    - Bajío: CPD p95 de USD 2–8 y FADS de 80–98%.
    - Norte: CPD p95 de USD 5–16 y guardrail de utilización de vehículo de 50%.
    - Con esto la operación *as-is* puntúa en una banda comparable (~35–55).
  - Reporte de coherencia en `app/autoplay/reports/latest.md`.
- **Desviaciones conocidas** (también anotadas en los casos de prueba):
  - El costo fijo de una dark store empieza cuando opera, no al decidir. El capex sí se carga al decidir.
  - La flota es de un solo tipo de vehículo; no hay flota mixta 50% EV.
  - El CPD rural *as-is* de Norte (~USD 22) supera el máximo de Pahwa & Jaller (12). Esos datos son de EE. UU. con densidad suburbana; aquí la zona rural está a 70–80 km del CD y mide 3,000 km². Los micro-hubs lo reducen.
  - Sin una dark store o un MFC en la zona, el express desde el CD de Megalópolis no cabe en la promesa.

### 6.4 Reglas de causa–efecto explícitas

| ID | Si… | Entonces… |
|---|---|---|
| R-01 | La ruta dura > 3 h con frescos y sin equipo de frío | P(spoilage) sube de forma exponencial; en clima cálido ×2 |
| R-02 | Spoilage > 3% de pedidos frescos en la semana | Excepciones +, CSAT −; la reposición consume inventario de tienda y sube el out-of-stock en piso |
| R-03 | Ventana "todo el día" en territorio con E-07 bajo | FADS < 80%, reintentos y CPD + |
| R-04 | Express activo con densidad baja | Utilización de vehículo < 50% y CPD alto: el motor alerta "promesa no alineada con la densidad" |
| R-05 | SFS sobre el tope de horas de piso | La OSA de la tienda física cae y sube el error de picking (Delivery Accuracy −) |
| R-06 | Promesa sin buffer + pico de demanda | Backlog que se arrastra días: el OTD se desploma y la CSAT cae más de lo que suma la velocidad |
| R-07 | Re-zonificación diaria sin datos maduros | Se pierde la familiaridad: paradas por hora −10% |
| R-08 | Ruteo con IA y datos básicos | El beneficio se limita al 30% del potencial ("sin datos limpios, la recomendación pierde valor") |
| R-09 | Pago por parada | Paradas por hora +, también entregas marcadas en falso y accidentes |
| R-10 | Crowdsourced > 50% en pico con E-14 escaso | P(no cubrir rutas) + y la confiabilidad cae |
| R-11 | Backhaul de devoluciones | Km vacíos −; tiempo de ruta + (menos paradas de entrega por ruta) |
| R-12 | Reporte con promedio (D-61) | Los días críticos quedan ocultos en el dashboard, aunque el motor sí los simula. Al cambiar a p95 se revela la verdad |
| R-13 | Restricción ambiental activa + flota de combustión | Parte de la flota no circula ese día; los EV quedan exentos |
| R-14 | Lockers en zonas con E-07 bajo | FADS + y CPD − (la entrega consolidada cuenta como una sola parada) |

---

## 7. KPIs y scorecard

Basados en el [scorecard de KPIs de S5](../references/sesion-5-scorecard-kpis-transporte-ultima-milla-v2.md). Siglas en inglés, con la fórmula en el primer uso.

### 7.1 KPIs

| ID | KPI | Fórmula | Valor deseable / guardrail de referencia ⚠ |
|---|---|---|---|
| K-01 | **OTD** (On-Time Delivery Rate) | Entregas a tiempo / entregas × 100 | > 95% / < 90% |
| K-02 | **OTIF** (On-Time In-Full) | Entregas a tiempo y completas / entregas × 100 | — |
| K-03 | **FADS** (First Attempt Delivery Success) | Entregas exitosas al 1er intento / intentos × 100 | > 90% / < 80% |
| K-04 | **Perfect Order Rate** | % a tiempo × % completas × % sin daño × % documentación correcta | > 90% / < 80% |
| K-05 | **CPD** (Cost per Delivered order) | Costo total de última milla / entregas exitosas | Tendencia a la baja / +5% MoM |
| K-06 | **CTS** por segmento | Costo logístico del segmento / volumen | < margen de contribución del segmento |
| K-07 | **Shipping cost % revenue** | Costo de envío / ingresos en línea × 100 | +2 pp en un trimestre = alerta |
| K-08 | **Route Efficiency** | Distancia planificada / distancia real × 100 | > 90% / < 80% |
| K-09 | **Vehicle Utilization** | Capacidad usada / capacidad disponible × 100 | > 80% / < 60% |
| K-10 | **Stops per route / per hour** | — | Urbano: 25–70 paradas/día; rural: 8–15 |
| K-11 | **Empty miles %** | Km vacíos / km totales × 100 | — |
| K-12 | **Order Cycle Time** | Hora de entrega − hora del pedido | Según el nivel de servicio |
| K-13 | **ETA accuracy** | 1 − error del ETA / ventana | — |
| K-14 | **Delivery Exception Rate** | Entregas con excepción / entregas × 100 | < 5% / > 8% |
| K-15 | **Spoilage rate** (última milla) | Pedidos frescos con falla de frío / pedidos frescos × 100 | ⚠ por definir |
| K-16 | **Return rate** y costo de devolución por unidad | — | — |
| K-17 | **CSAT** | Promedio de calificación (1–5) | > 4.0 / < 3.5 |
| K-18 | **NPS** por zona | % promotores − % detractores | > 50 / < 30 |
| K-19 | **CO₂ por entrega** | kg CO₂e / entrega | — |
| K-20 | **Node utilization** y **OSA de tienda** (por SFS) | — | Puente con la S4 |
| K-21 | Pedidos, ingresos y **margen del canal en línea** | — | Restricción financiera |

### 7.2 Pares primario–guardrail (centrales en el juego)

| Primario | Guardrail | Impide… |
|---|---|---|
| OTD / OTIF | Vehicle Utilization ≥ 75% | Cumplir con camiones medio vacíos |
| OTD / OTIF | CPD | Cumplir a cualquier costo unitario |
| FADS | Stops per route / per hour | Asegurar el 1er intento con rutas cortas e improductivas |
| Velocidad (Order Cycle Time) | Spoilage + Exception Rate | Correr y entregar mal |
| CPD bajo | CSAT ≥ 4.0 | Abaratar a costa de la experiencia |

### 7.3 Puntaje alineado a la estrategia de servicio

`Score = Σ w_k(estrategia) · normalización(K_k)`, con penalización por cada guardrail violado durante más de N días. El reporte p95 se usa **siempre** en el puntaje, aunque el jugador haya elegido ver promedios. Pesos ⚠ preliminares:

| KPI | Velocidad | Confiabilidad | Eficiencia |
|---|---|---|---|
| Order Cycle Time | 0.25 | 0.05 | 0.05 |
| OTD / OTIF | 0.15 | 0.30 | 0.15 |
| FADS | 0.10 | 0.15 | 0.15 |
| CPD | 0.10 | 0.15 | 0.35 |
| CSAT / NPS | 0.25 | 0.25 | 0.15 |
| Margen del canal en línea | 0.15 | 0.10 | 0.15 |

---

## 8. Catálogo de eventos inesperados

Probabilidad por época (mes): `p = p_base(territorio, mes) · Π modificadores(decisiones)`. El motor sortea cada semana con la probabilidad semanal equivalente, así que un evento puede ocurrir más de una vez en un mes. Cada evento genera un mensaje con impacto cuantificado y explicación causal.

| ID | Evento | p_base / mes | Aumenta con… | Mitiga… | Impacto |
|---|---|---|---|---|---|
| X-01 | **Falla de cadena de frío** (refrigeración o hielera insuficiente) | 8% | Rutas largas, clima cálido, equipo de frío insuficiente, mantenimiento correctivo | Vehículo refrigerado, secuencia de carga, mantenimiento preventivo | Lote de pedidos frescos con spoilage; reembolsos; CSAT − |
| X-02 | **Inundación o lluvia torrencial** | Megalópolis jun–sep: 30% | — | Flota diversa, micro-hubs, buffer | Zonas intransitables 1–2 días; backlog |
| X-03 | **Bloqueo o manifestación** | Megalópolis: 20% | Rutas fijas manuales | Ruteo dinámico | T_ruta +40% en zonas afectadas |
| X-04 | **Contingencia ambiental** (no circulación extra) | Megalópolis temporada seca (feb–may): 15% | Flota de combustión | EV, motos, bici | Capacidad −20% por 1–3 días |
| X-05 | **Pico viral o campaña sorpresa** | 10% | Cut-off tardío sin tope (D-26) | Slotting, buffer, contratos de pico | Demanda ×1.5 durante 3–5 días |
| X-06 | **Ausentismo o renuncia masiva de choferes** | E-26 escaso: 15% | Pago bajo, pago por parada, rutas saturadas | Flota mixta, bono por calidad | Capacidad propia −15% |
| X-07 | **Plataforma crowdsourced sin capacidad** | Mes con pico: 25%; Norte: 20% | Dependencia > 50% de *crowdsourced* | Flota propia o 3PL base | Rutas sin cubrir |
| X-08 | **Robo de mercancía en ruta** | Según E-09: 2%–8% | Horarios fijos, sin GPS, pago contra entrega en efectivo | D-62, eliminar COD | Pérdida de carga; chofer fuera de servicio; costo de seguro + |
| X-09 | **Accidente vial** | 3% | Pago por parada, rutas saturadas, flota sin mantenimiento | Mantenimiento, pago mixto | Vehículo fuera; pedidos retrasados |
| X-10 | **Caída del sistema de ruteo o de la app** | 3% | Herramienta nueva (madurez < 0.5) | Madurez, plan de contingencia manual | 1 día con rutas manuales: eficiencia − |
| X-11 | **Competidor lanza entrega en 15–30 min** | Megalópolis: 10% | — | Express en zonas densas, CSAT alta | Demanda −10% en zonas densas si no hay respuesta |
| X-12 | **Ola de calor** | Norte may–ago: 35% | Sin equipo de frío | Refrigerado, ventanas cortas para frescos | λ de spoilage ×2 |
| X-13 | **Errores de geocodificación por nuevos desarrollos** | Bajío y Norte: 8% | Sin validación de dirección | D-51 | FADS −5 pp en la zona |
| X-14 | **Cierre temporal de una tienda-nodo** (falla eléctrica, inspección) | 3% | Dependencia alta del SFS | Redundancia de nodos, regla dinámica | Reasignación forzada de pedidos |
| X-15 | **Alza de gasolina** | E-25 volátil: 10% | Flota de combustión, km vacíos | EV, backhaul | Costo de energía +20% |

**Eventos programados con magnitud aleatoria:** Hot Sale, regreso a clases, Buen Fin, Navidad y quincenas. Se ven en el calendario para que el jugador pueda planear (D-36), pero su magnitud real se revela al ocurrir.

**Cadenas de eventos:** X-12 + R-01 → spoilage → R-02 → faltantes en piso (puente con la S4). X-05 sin slotting → R-06 → CSAT − → menos pedidos el mes siguiente. X-06 + pago por parada → X-09 más probable.

---

## 9. Interfaz

1. **Setup:** territorio (ficha de factores E-01…E-14), escenario de mercado (fichas EM-01…EM-04 de la §4.3; el perfil libre queda bajo «Crear mi propio escenario»), estrategia de servicio y semilla. El calendario de picos se ve desde el inicio.
2. **Panel de decisiones por mes:** pestañas *Red · Asignación · Promesa · Flota · Zonas y ruteo · Cliente · Devoluciones · Datos y seguridad*. Cada control muestra costo, retraso y reversibilidad, más un previsualizador cualitativo (↑↓) de los KPIs afectados.
3. **Mapa esquemático del territorio:** zonas como polígonos de una rejilla, nodos (CD, tiendas SFS, dark stores, MFC, lockers) como íconos y calor de demanda por zona. No es un mapa real ni hay vehículos animados.
4. **Dashboard:**
   - Tarjetas de KPI con semáforo primario–guardrail.
   - **Frontera OTD vs. CPD** con las corridas previas, que muestra la frontera de Pareto de S5.
   - Series diarias y mensuales, con el selector promedio/p95 ligado a D-61.
   - Desglose de CPD en cascada (troncal, ruta, picking, reintentos, devoluciones).
   - Tabla por zona y por nivel de servicio.
5. **Bandeja de mensajes:** eventos y alertas de regla con fecha simulada, severidad y "¿por qué pasó esto?", que despliega la cadena causal con valores. Ejemplo: *"Día 14-jul: 212 pedidos frescos en Zona 3 llegaron tibios (spoilage 6.1%). Causas: ruta media 3.4 h (R-01), ola de calor (X-12), hieleras en lugar de refrigerado (D-32). Efecto: 212 reembolsos, CSAT de la zona −0.3."*
6. **Comparador de corridas:** 2–4 corridas, KPIs y diff de decisiones.
7. **Reporte final:** scorecard, trayectoria de 36 meses, picos enfrentados y decisiones clave.. Cierra con el **debrief** (§11): notas del escenario y seis preguntas obligatorias; el JSON solo se exporta con el debrief completo.

---

## 10. Persistencia y exportación

- **`localStorage`** con clave `mt4035.lastmile.runs.v1`. Toda lectura y escritura va en `try/catch`, con respaldo en memoria.
- **Esquema de corrida (JSON):** igual que el del [simulador SCM](../simulador-scm-red/especificacion.md#10-persistencia-y-exportación), con `sim: "mt4035-lastmile"`, `setup.territory: "megalopolis|bajio|norte"`, `setup.strategy: "speed|reliability|efficiency"`, `setup.preset: "EM-01…EM-04"` (omitido si es escenario propio, §4.3) y `debrief` con las respuestas DB-01…DB-06 (§11). Los KPIs van por mes y por zona, con diarios agregados p50/p95.
- **Export:** JSON (completo y reproducible con semilla, decisiones y checksum) y CSV (KPIs por mes y zona).
- **Import:** cargar un JSON para revisarlo o compararlo.

---

## 11. Uso pedagógico sugerido

**Corridas recomendadas** (~60 min, individual):

1. **As-is:** Megalópolis, solo SFD, día siguiente con ventana de todo el día. Diagnosticar por qué el FADS es bajo y el CPD alto.
2. **Mini-caso de S5 en vivo:** activar SFS en el urbano denso y SFD en la periferia, con una regla de umbral de costo. Comparar contra la corrida 1 en la frontera OTD–CPD.
3. **Territorio Norte:** probar express (y ver cómo explota el CPD) contra lockers, micro-hubs y consolidación. Comprobar que "urbano = VRPTW + estacionamiento; rural = TSP + consolidación".

**Debrief en el simulador (AD-31):** al terminar, el reporte final muestra el concepto del escenario, las notas de «qué revisar en tu corrida» y seis preguntas que el equipo responde antes de exportar (mínimo 60 caracteres cada una). Las respuestas viajan dentro del JSON (las cubre el checksum) y `npm run aggregate` las pone en columnas `debrief_DB-01…DB-06`.

- **DB-01…DB-04 y DB-06** son comunes a todos los escenarios; **DB-05** es la pregunta propia del escenario (o una genérica si el escenario es propio). Texto en [`app/src/debrief.ts`](app/src/debrief.ts) y [`app/src/presets.ts`](app/src/presets.ts).
- Introducción a la práctica, asignación de escenarios, plenario y rúbrica: [guía del instructor](./guia-instructor.md).

**Preguntas para el plenario:** ver la [guía del instructor](./guia-instructor.md#a7-plenario-sugerido).

**Entregable:** JSON de la corrida con el debrief completo. La rúbrica está en la [guía del instructor](./guia-instructor.md#b-rúbrica-del-debrief).

---

## 12. Fuentes para calibración

- Pahwa, A., & Jaller, M. (2022). A cost-based comparative analysis of different last-mile strategies for e-commerce delivery. *Transportation Research Part E, 164*, 102783. Costo por paquete de USD 1.40–12.
- Daganzo, C. F. (1984). The length of tours in zones of different shapes. *Transportation Research Part B, 18*(2), 135–145. Aproximación continua de la longitud de ruta.
- Fisher, M. L., & Jaikumar, R. (1981). A generalized assignment heuristic for vehicle routing. *Networks, 11*(2), 109–124. *Cluster-first/route-second*.
- Chen, C.-Y., Zhao, Z., & Ball, M. O. (2002). A model for batch advanced available-to-promise. *Production and Operations Management, 11*(4), 424–440.
- Bayram, A., & Cesaret, B. (2021). Order fulfillment policies for ship-from-store implementation in omni-channel retailing. *European Journal of Operational Research, 294*(3), 987–1002.
- Hübner, A., Holzapfel, A., & Kuhn, H. (2016). Distribution systems in omni-channel retailing. *Business Research, 9*(2), 255–296.
- Scorecard de KPIs de transporte, logística y última milla v2 (material del profesor, 2026). Valores deseables y guardrails.

⚠ Las referencias de esta sección vienen de las slides de S5. Hay que verificar los datos bibliográficos completos (volumen y páginas) antes de publicar la especificación al alumno.

---

## 13. Decisiones pendientes

- [ ] Confirmar la duración objetivo de una partida: 36 épocas manuales (≈2 min por época en ~75 min). Valorar si se juega en clase + casa.
- [x] Validar las constantes de la §6.3 contra el ejemplo resuelto de S5 (SFS USD 8.00 vs. SFD USD 9.60 por pedido). Fixture `minicaso`, LOG-ESC-04.
- [ ] Decidir si el territorio Norte incluye el tramo carretero entre ciudades o solo la última milla dentro de cada ciudad.
- [x] Definir el nivel de detalle del mapa esquemático (rejilla vs. polígonos). Rejilla de tarjetas por zona con calor de demanda, nodos y confianza (F7); la tabla por nivel de servicio queda pendiente.
- [x] Decidir si ambos simuladores comparten el motor base (PRNG, persistencia, mensajes, comparador) como librería común. Sí: `@mt4035/sim-core`.
- [x] Herramienta del profesor para volver a correr y agregar los JSON del grupo. `npm run replay` y `npm run aggregate` (F6); el modo profesor en la UI llega en F7.
- [ ] Revisar con auto-juego las semillas y la dificultad relativa de los escenarios EM-01…EM-04 (§4.3), y confirmar si el profesor asigna escenario y semilla por equipo.

---

[← Volver al índice del curso](../README.md) · [Sesión 5](../sesion-5.md)
