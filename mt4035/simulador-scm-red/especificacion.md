# Simulador SCM + Diseño de red — Especificación

**Curso:** MT4035 · **Sesión asociada:** [Sesión 4 — SCM, inventario y fundamentos de diseño de red](../sesion-4.md)
**Profesor:** Eduardo
**Estado:** ⚠ borrador preliminar v0.1. En esta etapa se definen escenarios, decisiones, reglas de causa–efecto y KPIs. Los valores numéricos son de calibración inicial y deben validarse antes de programar.
**Inspiración:** caso *Seven-Eleven Japan Co.* (Chopra, Kellogg KEL026) y *Walmart: Supply Chain Management* (Ivey W19317). La empresa y las regiones del juego son **ficticias**.
**Casos de prueba:** [casos-de-prueba.md](./casos-de-prueba.md). Incluye los ganchos de prueba que el motor debe exponer (§2) y el protocolo de auto-juego (§11).

---

## 1. Propósito

Con este simulador el alumno vive la pregunta central del caso SEJ: **¿una cadena de suministro diseñada para una geografía densa funciona igual en una geografía dispersa?** El alumno elige una combinación de escenario, estrategia y decisiones de red, inventario e información. Después observa durante 5 años simulados cómo se mueven sus KPIs y cómo los eventos inesperados ponen a prueba su diseño.

**Objetivos de aprendizaje** (alineados con S4):

1. Conectar decisiones de diseño de red (nodos, echelons, tipo de CD, frecuencia de reposición) con KPIs de tiempo, costo y servicio.
2. Experimentar el trade-off costo–servicio: costo fijo de nodos frente a costo variable de transporte, y frescura frente a costo de reposición.
3. Ver por qué los supuestos de EOQ/ROP/SS se rompen: demanda no estacionaria, perecederos, *lost sales* no observables.
4. Entender la información como palanca de la cadena: POS en tiempo real, *tanpin kanri*, POS compartido con proveedores y su efecto en el bullwhip.
5. Comprobar que la **alineación SCM–estrategia** es una condición previa y no un resultado: el mismo KPI puede ser bueno o malo según la propuesta de valor declarada.

**Lo que no cubre** (para no traslaparse con otras sesiones):

- **S5:** ruteo fino de última milla al cliente final, *fulfillment* omnicanal, promesa al cliente. El simulador modela el tramo **proveedor → CD → tienda**, no el de tienda → hogar.
- **S6:** abastecimiento global, contratos con proveedores lejanos o cercanos y *newsvendor* de producción. Aquí los proveedores son domésticos y su *lead time* es un dato del escenario.
- **S7:** *pricing* y promociones como decisión comercial. El precio es un parámetro del escenario.

---

## 2. Storytelling: Hoshi Mart Holdings (ficticia)

> **Hoshi Mart** (ほし, "estrella") es una cadena de tiendas de conveniencia. Se fundó en 1979 en la **Región Kaigan**, una franja costera muy poblada. Su ventaja es la **proximidad y la frescura**: tiendas pequeñas (~150 m²), abiertas 24/7, con ~3,000 SKUs por tienda elegidos entre un catálogo de 5,000. Una parte importante de sus ventas son comida preparada y productos frescos que se reponen varias veces al día.
>
> En 2026 Hoshi Mart compró **Prairie Stop**, una cadena estadounidense en problemas: 1,200 tiendas repartidas en el **Corredor Red River**, una región extensa de baja densidad. Prairie Stop se abastece por entrega directa del proveedor (*DSD*) y por mayoristas. Llegan decenas de camiones por tienda a la semana, la oferta de frescos es pobre y hay muchos faltantes.
>
> El consejo también evalúa entrar a **Valle Metropolitano**, una zona metropolitana latinoamericana con un núcleo urbano muy denso y una periferia extendida.
>
> **Tú eres la nueva Dirección de Supply Chain.** El consejo te da 5 años y te pide tres cosas: (1) definir qué propuesta de valor sostiene cada región, (2) diseñar la red que la haga posible y (3) demostrarlo con números. Cada trimestre presentas resultados al comité. Habrá sorpresas: tifones, tormentas de nieve, fallas de refrigeración, proveedores que no entregan.

**Rol del jugador:** decide la red, la política de inventario y reposición, la infraestructura de información y la relación con proveedores. **No** decide precios, ruteo al cliente final ni abastecimiento internacional.

**Pregunta que guía el juego** (eco de las preguntas 5 y 6 de la teaching note): *¿Puedo trasplantar el modelo Kaigan a Red River? Si no, ¿qué parte sí y qué parte no?*

---

## 3. Mecánica general

| Elemento | Definición |
|---|---|
| Horizonte | **5 años × 4 trimestres = 20 épocas** (fijo). Las épocas se etiquetan A1-T1 … A5-T4 |
| Época de decisión | **Trimestre**. Al inicio de cada una de las 20 épocas el jugador decide (o confirma sin cambios) |
| Tick interno del motor | **Semana**: 13 ticks por época. Los efectos dentro del día (frecuencia de entrega, frescura) se resuelven con fórmulas agregadas, no simulando cada día |
| Modo de juego | **Manual, época por época.** El jugador revisa resultados y mensajes, ajusta y **confirma** sus decisiones, y el motor corre el trimestre. La siguiente época no avanza sin confirmación. No hay modo automático ni mixto: cada trimestre es un punto de decisión explícito |
| Aleatoriedad | PRNG con **semilla** (p. ej. *mulberry32*). Con la misma semilla y las mismas decisiones se obtiene la misma corrida, lo que permite repetirla y que el profesor la verifique |
| Jugadores | Un jugador por navegador. No hay juego simultáneo ni servidor |
| Persistencia | `localStorage` del navegador, con varias corridas guardadas |
| Entrega al profesor | Exportar a JSON (corrida completa y reproducible) y a CSV (KPIs por época) |
| Puntaje | Índice compuesto **ponderado por la estrategia declarada** (ver §7.3) |

**Flujo de una partida:**

1. **Setup:** el jugador elige región (escenario estructural), condiciones de mercado (escenario dinámico), estrategia declarada, y semilla (generada o capturada).
2. **Diseño inicial (época 0):** parte de la red *as-is* de la región (§4.1) y puede hacer cambios estructurales, que tardan en implementarse (§5).
3. **Ciclo por época:** decisiones → simulación de 13 semanas → eventos → KPIs → mensajes con explicación causal.
4. **Cierre:** scorecard final, comparación contra la estrategia declarada y exportación.

---

## 4. Mapa de escenarios (factores dados o externos)

Hay tres capas: **estructurales** (se fijan en el setup y no cambian), **dinámicos** (tendencias que evolucionan por época) y **eventos** (choques probabilísticos, §8).

### 4.1 Escenarios estructurales: región

| ID | Factor | Kaigan (tipo Japón denso) | Red River (tipo EE.UU. disperso) | Valle Metropolitano (mixto) |
|---|---|---|---|---|
| E-01 | Área de operación | ~15,000 km² | ~400,000 km² | ~8,000 km² núcleo + 25,000 periferia |
| E-02 | Tiendas iniciales (*as-is*) | 1,800 en 30 *clusters* | 1,200 dispersas (sin *clusters*) | 600: 70% núcleo, 30% periferia |
| E-03 | Densidad de población / visitas por tienda al día | Muy alta / ~1,000 | Baja / ~350 | Alta en núcleo (~800) / media en periferia (~450) |
| E-04 | Distancia típica entre tiendas | < 1 km dentro del *cluster* | 15–40 km | 0.5–2 km núcleo / 5–15 km periferia |
| E-05 | Velocidad efectiva y congestión | Baja velocidad, congestión alta y predecible | Alta velocidad, congestión baja | Congestión alta y **muy variable** en el núcleo |
| E-06 | Red *as-is* | 12 CD combinados (*cross-dock* por temperatura), entregas 3×/día de frescos | DSD de ~40 proveedores + 2 mayoristas; 1 entrega/semana por proveedor | 2 CD con inventario; frescos por DSD |
| E-07 | Sistema de información *as-is* | POS con análisis diario; pedido por terminal | POS básico; pedido manual semanal | POS sin integración |
| E-08 | Base de proveedores | Concentrada y cercana, dispuesta a co-invertir (*vendor* dedicado) | Fragmentada; proveedores grandes con poder de negociación | Mixta; proveedores medianos con capacidad limitada |
| E-09 | Costo inmobiliario (CD y tienda) | Muy alto | Bajo | Alto en núcleo, bajo en periferia |
| E-10 | Costo laboral (chofer, almacén) | Alto | Alto | Bajo–medio |
| E-11 | Mezcla de demanda | 30% *fast food* y frescos de vida corta | 10% frescos; dominan abarrotes, bebidas y combustible | 20% frescos |
| E-12 | Expectativa del cliente | Frescura y variedad diaria | Precio y conveniencia de paso | Proximidad y precio |
| E-13 | Clima base | Tifones (estacional), sismos (raros pero severos) | Tormentas de nieve, tornados, calor extremo | Lluvias torrenciales, contingencias ambientales |
| E-14 | Regulación | Restricciones de horario de carga urbana | Laxa | Restricción vehicular por contaminación; ventanas de carga en el centro |

**Escenario *greenfield*** (opcional): región elegida, cero tiendas y presupuesto de apertura. Sirve para diseñar desde cero.

### 4.2 Escenarios dinámicos: condiciones de mercado

El jugador elige un perfil o lo sortea. Cada perfil define trayectorias por época con ruido.

| ID | Factor | Opciones de perfil | Qué afecta |
|---|---|---|---|
| E-20 | Crecimiento de la demanda | Estancado (0%/año) · Moderado (+3%) · Boom (+8%) | Volumen y necesidad de capacidad |
| E-21 | Estacionalidad | Suave · Marcada (verano y fin de año) | Picos de capacidad y error de pronóstico |
| E-22 | Volatilidad de la demanda | Baja (CV 0.15) · Media (0.30) · Alta (0.50) | Inventario de seguridad (SS), OSA, bullwhip |
| E-23 | Precio del combustible | Estable · Volátil · Tendencia alcista | Costo de transporte |
| E-24 | Competencia | Pasiva · Agresiva (un competidor abre tiendas cerca) | Demanda por tienda y sensibilidad a OSA |
| E-25 | Mercado laboral | Holgado · Escaso (rotación alta de choferes) | Costo laboral y probabilidad de faltar a entregas |
| E-26 | Tendencia demográfica | Envejecimiento y hogares unipersonales (más frescos y porciones chicas) · Estable | Mezcla de demanda que se desplaza hacia frescos |
| E-27 | Confiabilidad de proveedores | Alta · Media · Baja | Fill rate de proveedor a CD y variabilidad del *lead time* |

---

## 5. Mapa de decisiones (acciones del jugador)

Las decisiones van en cuatro capas que **se pueden cambiar a distinta velocidad**. Cada decisión trae su costo, su tiempo de implementación y su reversibilidad. Esto obliga a pensar en compromisos de largo plazo.

### 5.1 Estrategia (solo en el setup; se puede cambiar una vez, con penalización)

| ID | Decisión | Opciones | Efecto en el juego |
|---|---|---|---|
| D-00 | Propuesta de valor declarada | **Frescura y proximidad** · **Bajo costo** · **Conveniencia y amplitud** | Fija los pesos del puntaje (§7.3) y la elasticidad de la demanda a cada KPI |

### 5.2 Red: estructural (efecto con retraso, alto costo, poco reversible)

| ID | Decisión | Opciones / rango | Retraso | Costo | Reversibilidad |
|---|---|---|---|---|---|
| D-01 | Número de CD | 0–20 por región | 2–4 trimestres por CD nuevo | Capex + costo fijo trimestral (según E-09) | Cerrar cuesta indemnización y la pérdida no se recupera |
| D-02 | Ubicación de cada CD | Asignar a un *cluster* o zona de la región (mapa esquemático, no geográfico real) | Igual que D-01 | Según la zona | Baja |
| D-03 | Tipo de CD | **Con inventario** (*stocking*) · **Cross-dock sin inventario** · **Combinado por temperatura** (congelado, refrigerado, ambiente, caliente) | 1–2 trimestres para convertir | El combinado tiene mayor capex | Media |
| D-04 | Capacidad de cada CD | Pequeño, mediano o grande (cajas/día) | Con D-01 | Escalonado | Ampliar sí; reducir no |
| D-05 | Estrategia de apertura de tiendas | **Dominancia de mercado** (*clusters* de 50–60 tiendas por CD) · **Dispersa / oportunista** · **Mixta** | 1 trimestre por lote | Capex por tienda | Cerrar tiendas cuesta |
| D-06 | Ritmo de apertura/cierre | −10% a +15% de tiendas por año | 1 trimestre | Igual | Igual |
| D-07 | Proveedores dedicados cerca de los CD | Sí/No por categoría de frescos (como las plantas de *vendors* de SEJ) | 3–4 trimestres | Co-inversión | Baja |

### 5.3 Flujo y transporte: táctico (efecto el siguiente trimestre, reversible)

| ID | Decisión | Opciones | Notas causales |
|---|---|---|---|
| D-10 | Política de entrega del proveedor | **Todo pasa por CD** · **DSD** · **Híbrido por categoría** | El DSD multiplica las entregas por tienda (SEJ: de 70 camiones/día en 1974 a 9 en 2006) |
| D-11 | Frecuencia de reposición a tienda por categoría de temperatura | Caliente/frescos: 1×, 2× o 3×/día · Refrigerado: 1×/día a 3×/semana · Ambiente: 1×/día a 1×/semana | Más frecuencia sube el costo de transporte, la frescura y la OSA, y baja el inventario en tienda |
| D-12 | Consolidación de carga | Por proveedor · **Combinada por temperatura** (varios proveedores en un camión) | La combinada reduce camiones por tienda y requiere CD combinado (D-03) |
| D-13 | Flota | Propia · 3PL dedicado · 3PL spot | Costo fijo vs. variable; la confiabilidad se ve en los eventos |
| D-14 | Tipo de vehículo | Mono-temperatura · **Multi-temperatura** · Con telemetría de temperatura (sí/no) | La telemetría baja la probabilidad y la severidad de la falla de cadena de frío |
| D-15 | Ventanas de entrega en tienda | Horas pico de venta · Horas valle (*off-peak*) | Valle: menos congestión y menos interferencia con la venta, pero exige escaneo sin esperas (D-23) |
| D-16 | Programa de mantenimiento de flota | Correctivo · Preventivo · Predictivo | Reduce averías y fallas de refrigeración |

### 5.4 Inventario y pedido: táctico

| ID | Decisión | Opciones | Notas causales |
|---|---|---|---|
| D-20 | Política de inventario en tienda | **ROP/EOQ** (revisión continua) · **Revisión periódica** (R, S) · **Pedido por hipótesis del clerk** (*tanpin kanri*, requiere D-30) | El alumno ve cuándo los supuestos de EOQ se rompen (perecederos, demanda no estacionaria) |
| D-21 | Nivel de servicio objetivo por categoría | CSL 85%–99% | Define *z* en SS = z·σ·√(L+R) |
| D-22 | Surtido por tienda | SKUs por tienda (2,000–4,000) · **Surtido local** vs. **estándar** | Más SKUs: más ventas potenciales, más SS total y más merma |
| D-23 | Recepción en tienda | Conteo manual · **Escaneo contra pedido** | El escaneo reduce el tiempo por parada y los errores de recepción |
| D-24 | Inventario de seguridad en CD (solo si D-03 = con inventario) | Días de cobertura | Pooling: centralizar reduce el SS total (raíz cuadrada) a cambio de *lead time* |
| D-25 | Retiro de frescos | FIFO estricto · Descuento por caducidad próxima | El descuento reduce merma y margen |

### 5.5 Información y colaboración: habilitadores (retraso + curva de aprendizaje)

| ID | Decisión | Opciones | Retraso | Efecto |
|---|---|---|---|---|
| D-30 | Sistema de información de tienda | POS básico · **POS con análisis diario** · **POS + terminal gráfica de pedido** (análisis por SKU y hora) | 2–3 trimestres + 2 de aprendizaje | Baja el error de pronóstico (CV efectivo) y habilita *tanpin kanri* |
| D-31 | Compartir POS con proveedores | No · Semanal · Diario | 1–2 trimestres | Baja el **bullwhip** (BWR) y sube el fill rate del proveedor |
| D-32 | Pronóstico | Promedio móvil · Estacional · **Causal** (clima, calendario, eventos locales) | 1–2 trimestres | Baja el error, sobre todo con estacionalidad o clima |
| D-33 | Colaboración con proveedores | Arm's-length · VMI · **CPFR** | 2–3 trimestres | Lead time más corto y confiable; requiere D-31 |
| D-34 | Inversión en capacitación de tienda | Baja · Media · Alta | 1 trimestre | Multiplica el beneficio de D-30 y D-20 (*tanpin kanri*) |

---

## 6. Motor de reglas: modelo causal

El motor es determinista **dado** el PRNG con semilla. No hay simulación física. Cada tick semanal calcula variables intermedias con fórmulas agregadas y luego KPIs. Todas las constantes son ⚠ de calibración.

### 6.1 Variables de estado (persisten entre épocas)

Red (CD, tipos, capacidades, tiendas por *cluster*), inventario por categoría y nodo, sistemas implantados y su madurez (0–1), confianza del cliente por zona (0–1; baja con faltantes repetidos), relación con proveedores (0–1), edad y estado de la flota, caja/capex acumulado.

### 6.2 Grafo causal principal

```
Densidad (E-03/E-04) ──► distancia entre paradas ──► paradas por ruta ──► costo por entrega a tienda (CTS)
N.º y ubicación de CD (D-01/02) ──► distancia CD→tienda ──► duración de ruta ──┬─► costo de transporte
                                                                               ├─► tiempo fuera de frío ─► P(spoilage) ─► merma
                                                                               └─► variabilidad de llegada ─► OTIF CD→tienda
Frecuencia (D-11) ──┬─► costo de transporte (+)
                    ├─► cobertura por pedido (−) ─► edad del producto en anaquel (−) ─► merma (−)
                    └─► R en SS (−) ─► inventario en tienda (−)
Merma ──► unidades vendibles (−) ──► P(out-of-stock) (+) ──► lost sales ──► confianza del cliente (−) ──► demanda base futura (−)
Sistema de info (D-30/32) ──► error de pronóstico (−) ──► SS requerido (−) y OSA (+)
POS compartido (D-31) ──► BWR (−) ──► fill rate proveedor→CD (+) ──► OTIF (+)
DSD (D-10) ──► camiones por tienda/día (+) ──► costo de recepción y congestión (+) ──► tiempo de personal fuera de piso (+)
Cluster (D-05) ──► paradas por ruta (+), reconocimiento de marca (+), canibalización (+)
```

### 6.3 Fórmulas núcleo (versión inicial)

**Geometría de la red** (aproximación continua, sin mapa real):

- Distancia media CD→*cluster*: `d̄ = k_geo · √(A_servida / n_CD)`, con `k_geo ≈ 0.38` para una región aproximadamente cuadrada con CD central.
- Distancia entre tiendas consecutivas de la ruta: `δ = 0.7 / √ρ_cluster`, donde ρ son las tiendas por km² dentro del área atendida.
- Paradas por ruta: `s = min( Cap_vehículo / drop_por_tienda , (T_turno − 2·d̄/v) / (t_parada + δ/v) )`.
- Duración de la ruta: `T_ruta = 2·d̄/v + s·(t_parada + δ/v)`, con `v = v_base · (1 − congestión_t)` y congestión aleatoria por escenario (E-05).
- **Costo por entrega a tienda:** `CTS_entrega = (c_km · (2·d̄ + s·δ) + c_hora · T_ruta) / s`.
- Entregas por tienda al día: con consolidación combinada `= Σ_categorías frecuencia_c`; con DSD `= Σ_proveedores frecuencia_p`.

**Frescura y merma** (por categoría perecedera *c*):

- Vida útil restante al llegar a anaquel: `VU_rem = VU_c − (t_proveedor→CD + t_estancia_CD + T_ruta/2)`. La estancia en *cross-dock* es de horas; en CD con inventario, de días.
- Cobertura del pedido: `Cob = R_c + SS_días`, con `R_c = 1 / frecuencia_c`.
- Merma base: `merma_c = m0 + m1 · max(0, Cob − VU_rem) / Cob`.
- Exposición de frío: `P(excursión) = p0 · (T_ruta / T_ref)^α · f_vehículo(D-14) · f_mantenimiento(D-16)`. Una excursión destruye una fracción del lote en ruta.

**Demanda, faltantes y lost sales:**

- Demanda por tienda: `μ = μ_base(región) · f_crec(t) · f_estac(t) · (1 − canibalización(densidad_cluster)) · confianza_zona · f_estrategia`.
- CV efectivo: `CV_ef = CV_E22 · (1 − g_info · madurez_D30) · (1 − g_pron(D-32))`.
- `SS = z(CSL) · CV_ef · μ · √(L + R)`.
- Fill rate por categoría: `FR = 1 − σ·√(L+R)·G(z) / (μ·R)`, donde G es la función de pérdida normal. La merma reduce el inventario disponible **antes** de calcular el faltante.
- `OSA ≈ FR` ajustado por errores de recepción (D-23) y por excursiones de frío.
- Demanda insatisfecha: 50% se pierde (*lost sale*) y 50% se sustituye con margen menor (Corsten & Gruen, 2003). La confianza de la zona baja si la OSA < umbral durante ≥ 2 semanas seguidas y se recupera lentamente.

**Bullwhip y proveedores:**

- `BWR = 1 + 2L/p + 2L²/p²` (Chen et al., 2000), donde p es la ventana del pronóstico. Con POS compartido diario, el proveedor pronostica con la demanda final y el BWR se acerca a 1.
- Fill rate del proveedor al CD: `FR_prov = FR_base(E-27) − β · (BWR − 1) + γ · colaboración(D-33)`.

**Finanzas por época:** ventas · margen bruto − merma − margen perdido − costo de transporte − costo fijo de CD − costo de recepción en tienda − costo de inventario (h% × inventario promedio) − opex de TI − amortización del capex.

### 6.4 Reglas de causa–efecto explícitas (catálogo inicial)

Cada regla se registra en el log y alimenta los mensajes. El alumno siempre puede ver **por qué** pasó algo.

| ID | Si… | Entonces… |
|---|---|---|
| R-01 | Duración de ruta > 4 h en categoría fresca | P(spoilage) ×1.5 y la merma sube por menor VU_rem |
| R-02 | Merma de frescos > 6% en una semana | P(out-of-stock de frescos) sube la semana siguiente; si persiste, baja la confianza de la zona |
| R-03 | OSA < 90% dos semanas seguidas | Baja la demanda base de la zona el siguiente trimestre (los clientes "dejan de volver") |
| R-04 | DSD activo y > 15 entregas por tienda al día | Costo de recepción +; P(error de recepción) +; personal fuera de piso, OSA − |
| R-05 | Frecuencia 3×/día en región con δ > 10 km | El costo de transporte se dispara y el motor emite una alerta de modelo no alineado con la geografía |
| R-06 | Cross-dock sin inventario + proveedor poco confiable (E-27) | Una falla del proveedor se transmite completa a tienda (sin amortiguador) |
| R-07 | Utilización del CD > 90% | Se alarga la estancia en CD, cae la frescura y sube P(retraso) |
| R-08 | POS compartido + CPFR maduro | Lead time del proveedor −20% y variabilidad −30% |
| R-09 | *Tanpin kanri* sin capacitación (D-34 baja) | El beneficio de pronóstico se reduce a la mitad y sube la varianza entre tiendas |
| R-10 | Clusters densos (dominancia) | Paradas/ruta +, CTS −, canibalización + (el jugador debe encontrar el punto óptimo) |
| R-11 | CD con inventario + ventaja de *pooling* | SS total ×√(n_tiendas_agrupadas)/n en ambiente; poco útil en frescos de vida corta |
| R-12 | Entrega en horas valle + escaneo | Tiempo por parada −30%; sin escaneo, el chofer espera y el beneficio se pierde |

---

## 7. KPIs y scorecard

Siglas en inglés, con la fórmula en el primer uso. Cada KPI **primario** se lee junto con un **guardrail** (misma lógica que S5).

### 7.1 KPIs

| ID | KPI | Fórmula | Lectura |
|---|---|---|---|
| K-01 | **OTIF** (On-Time In-Full), CD→tienda | Entregas a tiempo y completas / entregas × 100 | Servicio de la red a la tienda |
| K-02 | **OSA** (On-Shelf Availability) | Tiempo con stock en anaquel / tiempo total × 100 | Lo que ve el cliente |
| K-03 | **OFR** (Order Fill Rate) | Pedidos completos / pedidos × 100 | Todo o nada por pedido |
| K-04 | **ITR** (Inventory Turnover) | COGS / inventario promedio | En SEJ, >50× vs ~19× en EE.UU. |
| K-05 | **DOI** (Days of Inventory) | Inventario promedio / COGS diario | Complemento de ITR |
| K-06 | **CTS** (Cost-to-Serve) por tienda | Costo logístico total / tiendas, y como % de ventas | KPI maestro logístico |
| K-07 | **Waste %** (merma) | Unidades mermadas / unidades recibidas × 100, por categoría | Síntoma de desajuste oferta–demanda |
| K-08 | **Lost Sales %** | Demanda no atendida y no sustituida / demanda total | No observable en la vida real; el simulador lo revela al final |
| K-09 | **BWR** (Bullwhip Ratio) | Var(órdenes al proveedor) / Var(demanda en tienda) | 1 es ideal |
| K-10 | **Trucks/store/day** | Entregas por tienda al día | Proxy de complejidad (SEJ: 9) |
| K-11 | **GMROI** (Gross Margin Return on Inventory) | Margen bruto / inventario promedio a costo | Une servicio y capital |
| K-12 | **LT** (Lead Time) y σLT, proveedor→tienda | Media y desviación | σLT pesa más que el promedio |
| K-13 | **EBITDA logístico** y capex acumulado | — | Restricción financiera |

### 7.2 Pares primario–guardrail sugeridos

| Primario | Guardrail | Impide… |
|---|---|---|
| OSA ≥ 97% | CTS ≤ X% de ventas | "Entregar 5×/día hasta cumplir" |
| Waste ≤ 3% | OSA ≥ 95% | "Pedir poquito para no mermar" |
| ITR alto | Lost Sales ≤ 2% | "Rotar sin tener stock" |
| CTS bajo | OTIF ≥ 95% | "Consolidar tanto que llego tarde" |

### 7.3 Puntaje alineado a la estrategia

`Score = Σ w_k(estrategia) · normalización(K_k)`, con penalización por cada guardrail violado. Pesos ⚠ preliminares:

| KPI | Frescura y proximidad | Bajo costo | Conveniencia y amplitud |
|---|---|---|---|
| OSA | 0.25 | 0.15 | 0.25 |
| Waste | 0.20 | 0.10 | 0.10 |
| CTS % ventas | 0.10 | 0.30 | 0.15 |
| ITR | 0.15 | 0.15 | 0.05 |
| Lost Sales | 0.15 | 0.10 | 0.25 |
| EBITDA logístico | 0.15 | 0.20 | 0.20 |

La lección: el mismo ITR puede dar buen o mal puntaje según la propuesta de valor. "Los KPIs son lenguaje, no objetivo".

---

## 8. Catálogo de eventos inesperados

Probabilidad por época: `p = p_base(región, perfil) · Π modificadores(decisiones vigentes)`. Al ocurrir, el evento genera un **mensaje** con fecha, descripción, impacto cuantificado y **explicación causal** (qué decisiones empeoraron o mitigaron el efecto).

| ID | Evento | p_base / trim. | Aumenta con… | Mitiga… | Impacto |
|---|---|---|---|---|---|
| X-01 | **Falla de refrigeración en ruta** (spoilage) | 6% por cada 100 rutas | Rutas largas (R-01), flota vieja, mantenimiento correctivo | Multi-temperatura con telemetría, mantenimiento predictivo | Lote de frescos perdido; OSA de frescos − durante 1–2 semanas |
| X-02 | **Tifón** (Kaigan) / **tormenta de nieve** (Red River) / **lluvia torrencial** (Valle) | Estacional: 5%–25% | — | Más CD (redundancia), SS en CD con inventario | Cierre de rutas 2–7 días; pico de demanda previo (compras de pánico) |
| X-03 | **Sismo severo** (Kaigan) | 1% | — | Red con ≥ 2 CD por zona | Un CD fuera 4–8 semanas |
| X-04 | **Proveedor clave no entrega** | 4% (E-27 baja: 10%) | Cross-dock sin amortiguador (R-06), proveedor único | Proveedores dedicados, CPFR, SS en CD | FR del proveedor cae 40% durante 2–4 semanas |
| X-05 | **Ola de calor** | Estacional 10% | — | Pronóstico causal (D-32), frecuencia alta | Bebidas y helados +40%; con pronóstico simple, faltantes |
| X-06 | **Competidor abre tiendas en tu *cluster*** | E-24 agresiva: 15% | Baja densidad propia (no se cumple la dominancia) | Cluster denso y OSA alta | −8% de demanda en la zona |
| X-07 | **Escasez de choferes** | E-25 escaso: 12% | Flota propia con sueldos bajos | 3PL dedicado | Capacidad de flota −15%; entregas canceladas |
| X-08 | **Caída del sistema POS / pedidos** | 3% | Sistema nuevo (madurez < 0.5) | Madurez alta, capacitación | 1–3 días de pedidos a ciegas (repite el último pedido) |
| X-09 | **Retiro sanitario** (*food safety recall*) | 2% | Muchos proveedores pequeños | Proveedores dedicados con control | Retiro de una categoría por 1 semana; golpe a la confianza |
| X-10 | **Choque en el precio del combustible** | E-23 volátil: 10% | Rutas largas, alta frecuencia | Consolidación combinada | Costo de transporte +25% durante el trimestre |
| X-11 | **Congestión urbana extraordinaria** (obras, eventos) | Valle: 15% | Entregas en horas pico | Horas valle (D-15) | T_ruta +30% → retrasos y merma |
| X-12 | **Restricción regulatoria de carga** | Valle/Kaigan: 5% | Camiones grandes | Vehículos chicos, horas valle | Ventanas de entrega más estrechas |

**Cadenas de eventos:** algunos eventos cambian probabilidades futuras. Ejemplos: X-01 repetido → R-02 → R-03 (pérdida de clientes). X-04 con cross-dock puro → OSA desplomada → X-06 más probable porque el competidor aprovecha.

---

## 9. Interfaz

1. **Setup:** selector de región (con ficha de factores E-01…E-14), perfil de mercado, estrategia declarada y semilla.
2. **Panel de decisiones por época:** pestañas *Red · Flujo · Inventario · Información*. Cada control muestra costo, retraso y reversibilidad. Hay un previsualizador "qué esperar" con flechas ↑↓ por KPI según el grafo causal, cualitativo y sin revelar números.
3. **Mapa esquemático de la red:** SVG con la región como rejilla, *clusters* como manchas de densidad, CD como nodos y flujos como líneas cuyo grosor es el volumen. No es un mapa geográfico real.
4. **Dashboard de KPIs:**
   - Tarjetas con semáforo contra el guardrail.
   - Series por época.
   - Gráfica OSA vs. CTS, con la frontera de las corridas previas del jugador.
   - Desglose de costos en cascada (*waterfall*).
   - Merma por categoría.
5. **Bandeja de mensajes:** eventos (§8) y alertas de reglas (§6.4), con fecha simulada, severidad y "¿por qué pasó esto?", que despliega la cadena causal con los valores que la activaron.
6. **Comparador de corridas:** 2–4 corridas guardadas, KPI por KPI, con el diff de decisiones.
7. **Reporte final:** scorecard, trayectoria de 5 años, decisiones clave y eventos enfrentados. Se puede exportar.

---

## 10. Persistencia y exportación

- **`localStorage`** con clave `mt4035.scm.runs.v1`, que guarda una lista de corridas. Cada lectura y escritura va en `try/catch`; si el almacenamiento falla, el juego sigue en memoria y avisa al jugador.
- **Esquema de corrida (JSON):**
  ```json
  {
    "sim": "mt4035-scm", "version": "0.1.0", "run_id": "uuid", "created_at": "ISO-8601",
    "player": {"name": "", "team": ""},
    "setup": {"region": "kaigan|redriver|valle|greenfield", "market_profile": {...}, "strategy": "freshness|lowcost|convenience", "seed": 123456},
    "decisions": [{"epoch": 0, "changes": {"D-01": 14, "D-11": {"fresh": 3}}}],
    "events": [{"epoch": 3, "week": 7, "id": "X-01", "severity": 0.6, "drivers": ["R-01"]}],
    "kpis": [{"epoch": 1, "OTIF": 0.94, "OSA": 0.96, "...": 0}],
    "final_score": 72.4, "checksum": "sha256(...)"
  }
  ```
- **Export:** JSON (completo) y CSV (KPIs por época). El **checksum** y la semilla permiten que una herramienta del profesor **vuelva a correr** las decisiones y verifique que los KPIs coinciden.
- **Import:** cargar un JSON para revisar una corrida o compararla con otra.

---

## 11. Uso pedagógico sugerido

**Corridas recomendadas para clase** (~60 min, individual):

1. **Línea base:** Kaigan *as-is*, estrategia frescura, confirmando cada trimestre sin cambios. Ver por qué funciona.
2. **Trasplante ingenuo:** Red River copiando el modelo Kaigan (3×/día, cross-dock, sin densificar). Ver cómo explota el CTS.
3. **Diseño propio:** Red River o Valle con estrategia y red elegidas por el alumno, ajustando trimestre a trimestre.

**Preguntas de debrief:**

- ¿Qué decisión de SEJ depende de la geografía y cuál no? (información sí se trasplanta; frecuencia 3×/día no necesariamente)
- ¿Qué KPI mejoró primero al activar el POS compartido y por qué tardó?
- ¿Qué evento les dolió más y qué decisión previa lo agravó?
- ¿En qué punto la densificación (dominancia) dejó de rendir por canibalización?

**Posible entregable:** JSON de la corrida 3 + reflexión de una página (estrategia, decisión clave, evento crítico, KPI que cuidaron como guardrail). Se conecta con el diagrama de red *as-is* del proyecto final.

---

## 12. Fuentes para calibración

- Chopra, S. (2022). *Seven-Eleven Japan Co.: Supply chain strategy and structure* (Case KEL026). Kellogg School of Management. Densidad, *clusters* de 50–60 tiendas, 158 CD combinados, entregas 3×/día, de 70 a 9 camiones por tienda.
- Johnson, P. F., & Mark, K. (2019). *Walmart: Supply chain management* (Case W19317). Ivey Publishing. Red de CD, *cross-docking* a escala, EDLP.
- Chen, F., Drezner, Z., Ryan, J. K., & Simchi-Levi, D. (2000). Quantifying the bullwhip effect in a simple supply chain. *Management Science, 46*(3), 436–443. Fórmula del BWR.
- Lee, H. L., Padmanabhan, V., & Whang, S. (1997). Information distortion in a supply chain: The bullwhip effect. *Management Science, 43*(4), 546–558.
- Corsten, D., & Gruen, T. (2003). Desperately seeking shelf availability. *International Journal of Retail & Distribution Management, 31*(12), 605–617. Reacción del cliente ante el faltante.
- Sachs, A.-L. (2015). *Retail analytics: Integrated forecasting and inventory management for perishable products*. Springer. Supuestos rotos y perecederos.

---

## 13. Decisiones pendientes

- [ ] Confirmar la duración objetivo de una partida en clase: 20 épocas manuales (≈3 min por época si se juega en ~60 min).
- [ ] Validar los rangos numéricos de la §6.3 y los p_base de la §8 con datos del caso y benchmarks.
- [ ] Definir si se juega una sola región o la comparación Kaigan vs. Red River es obligatoria.
- [ ] Decidir si el puntaje es visible durante el juego o solo al final.
- [ ] Definir el stack: HTML/JS sin dependencias vs. librería de gráficas por CDN.
- [ ] Herramienta del profesor para volver a correr y agregar los JSON de todo el grupo.

---

[← Volver al índice del curso](../README.md) · [Sesión 4](../sesion-4.md)
