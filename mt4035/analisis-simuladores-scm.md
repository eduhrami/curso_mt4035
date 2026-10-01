# Análisis de alineación — Simuladores de supply chain vs. programa de Eduardo

**Objetivo:** decidir qué simulador es más pertinente para el bloque de supply chain y logística de MT4035 (sesiones 4 y 5, con la sesión 6 reservada para simulación según el calendario actualizado en el [README](./README.md)).

**Simuladores comparados:**

- **GSCM** — Hammond, J. H. *Global Supply Chain Management Simulation V2* (Producto #8623; versión en español 8623-HTM-SPA). Harvard Business Publishing. Una persona juega sola durante 4 años simulados. Gestiona 2 modelos de celular y pasa cada año por 4 "salas": Diseño, Pronóstico, Producción y Consejo. Elige entre 4 proveedores con distinto costo, *lead time* y capacidad. Avanza mes a mes y puede modificar órdenes a mitad de año. El faltante se traduce en ventas perdidas y el excedente se liquida con descuento al cierre del año.
- **Beer Game** — versión clásica (Sterman, MIT; juego en línea en MA System; Harvard tiene su propia versión: *Root Beer Game*, #6619). Juegan 4 personas, una por eslabón: detallista → mayorista → distribuidor → fábrica. Cada semana cada jugador decide cuánto pedir. Hay retrasos de información y de envío, y solo el detallista ve la demanda final. Se penaliza tanto el inventario como los pedidos pendientes (*backorders*).

**Escala de cobertura:**

- ✅ **Directa:** el juego obliga a decidir sobre el tema o lo hace visible en sus resultados.
- 🟡 **Parcial:** el tema aparece de forma implícita o solo en el debrief.
- ❌ **No cubre:** el tema no aparece.

> ⚠ **Borrador preliminar.** La descripción de GSCM se basa en el folleto oficial de HBP y en la ficha del producto. Antes de cerrar la decisión, hay que verificar en el *Teaching Note* del simulador (disponible para profesores en HBP) qué métricas reporta el simulador (por ejemplo, si muestra *fill rate* explícito).

---

## 1. Temas del programa — Sesión 4 (SCM + inventario + diseño de red)

| # | Tema del programa (sesion-4.md) | GSCM | Beer Game | Comentario |
|---|---|:---:|:---:|---|
| 4.1 | KPI: **lead time** | ✅ | ✅ | En GSCM el *lead time* es una decisión: el jugador elige el proveedor. En el Beer Game es un retraso fijo que hay que soportar. |
| 4.2 | KPI: **fill rate / OTIF** | 🟡 | 🟡 | GSCM: el faltante aparece como venta perdida. Beer Game: aparece como *backorder*. Ninguno usa el lenguaje OTIF. |
| 4.3 | KPI: **cost-to-serve** | 🟡 | ❌ | GSCM compara el costo unitario entre proveedores y el costo de liquidar excedentes. El Beer Game solo mide costo de inventario y de faltante. |
| 4.4 | Lenguaje de red: **nodos y echelons** | 🟡 | ✅ | El Beer Game es literalmente una cadena de 4 echelons. GSCM tiene un solo nivel de abastecimiento (proveedores → empresa). |
| 4.5 | **Flujos físicos vs. flujos de información** | 🟡 | ✅ | Es la lección central del Beer Game: los pedidos suben y el producto baja, con distintos retrasos. |
| 4.6 | **Nivel de servicio** y su vínculo con disponibilidad y promesa | 🟡 | 🟡 | Los dos lo muestran como consecuencia, pero ninguno pide fijar un objetivo de servicio. |
| 4.7 | **Posicionamiento de inventario** (central vs. regional) | ❌ | ❌ | GSCM elige proveedores por geografía, pero eso es abastecimiento, no ubicación de inventario. |
| 4.8 | **Trade-off costo–servicio** (costo fijo de nodos vs. costo variable) | ✅ | 🟡 | GSCM: proveedor barato con *lead time* largo vs. proveedor caro y rápido. Beer Game: solo el balance entre costo de inventario y costo de faltante. |
| 4.9 | **Capacidad y cuellos de botella** | ✅ | ❌ | Los proveedores de GSCM tienen capacidad limitada. En el Beer Game clásico la fábrica no tiene límite de capacidad. |
| 4.10 | **Escenarios 1 CD vs. 2 CDs** (sensibilidad) | ❌ | ❌ | Ninguno modela centros de distribución. Se queda en la plantilla del profesor. |
| 4.11 | **EOQ / ROP** (supuestos y límites) | 🟡 | 🟡 | Ninguno tiene costo fijo por pedido, así que EOQ no aplica. El Beer Game ilustra la lógica de punto de reorden. GSCM se parece más a un problema *newsvendor* (ver 3.3). Los dos sirven para mostrar **por qué fallan los supuestos de EOQ** cuando la demanda es variable. |
| 4.12 | **Safety stock, variabilidad y niveles de servicio** (complementos) | ✅ | ✅ | GSCM: protegerse de la incertidumbre de demanda. Beer Game: la variabilidad que crea la propia cadena. |
| 4.13 | **Datos como ventaja competitiva** (7-Eleven: POS, frecuencia de reposición) | 🟡 | ✅ | El debrief del Beer Game lleva directo a la lección de 7-Eleven: compartir datos de POS reduce el bullwhip. GSCM solo trabaja la integración de pronósticos. |

## 2. Temas del programa — Sesión 5 (transporte y logística omnicanal)

| # | Tema del programa (sesion-5.md) | GSCM | Beer Game | Comentario |
|---|---|:---:|:---:|---|
| 5.1 | **KPIs logísticos** e intervenciones analíticas | 🟡 | 🟡 | Solo los KPIs de inventario y servicio. No hay KPIs de transporte. |
| 5.2 | **Fulfillment omnicanal** (ship-from-store/DC, BOPIS, dark stores, MFC) | ❌ | ❌ | |
| 5.3 | **Segmentación de servicio** (SLA por SKU o cliente) | ❌ | ❌ | GSCM tiene 2 productos, pero no maneja SLAs diferenciados. |
| 5.4 | **Order promising** (buffers, cut-off, OTIF) | ❌ | ❌ | |
| 5.5 | **Economía de última milla** (densidad, drop size, reintentos) | ❌ | ❌ | |
| 5.6 | **Ruteo (VRP)** | ❌ | ❌ | |
| 5.7 | **Asignación dinámica** (desde dónde cumplir un pedido) | ❌ | ❌ | Lo más cercano es reasignar producción entre proveedores en GSCM, pero es otro problema. |
| 5.8 | **Reverse logistics** | ❌ | ❌ | |
| 5.9 | **IA en logística** (ETAs, anomalías) | ❌ | ❌ | |

**Conclusión de la sección 2:** **ningún simulador cubre la Sesión 5.** Los dos son juegos de abastecimiento e inventario, no de transporte ni de última milla. S5 tiene que sostenerse con su propio mini-caso.

## 3. Temas que cubren los juegos y que NO están en el programa

### GSCM

| # | Tema | Relevancia para MT4035 |
|---|---|---|
| 3.1 | **Diseño de producto y su impacto en la demanda** (elegir características) | Baja para logística. Es más de marketing y producto. |
| 3.2 | **Combinar pronósticos de expertos** (asesores con estimaciones distintas) | Media. Conecta con el pronóstico de demanda de S3 (Marcos), pero desde el juicio experto, no desde series de tiempo. |
| 3.3 | **Problema newsvendor / costo de sobrante vs. faltante** (liquidación al cierre) | **Alta.** Es el modelo de inventario más pertinente para retail de temporada y moda, y hoy no está en el programa. Podría complementar o reemplazar parte de EOQ/ROP. |
| 3.4 | **Abastecimiento global y dual sourcing** (offshore barato y lento vs. nearshore caro y rápido) | **Alta.** Muy vigente en México por el *nearshoring*. No está en el programa. |
| 3.5 | **Flexibilidad contractual** (cambiar órdenes a mitad de año, con costo) | Media. Introduce la idea de opciones reales y contratos con proveedores. |
| 3.6 | **Rentabilidad / P&L** como métrica integradora | Media. Ayuda a traducir decisiones de supply chain a utilidad. |

### Beer Game

| # | Tema | Relevancia para MT4035 |
|---|---|---|
| 3.7 | **Efecto bullwhip y sus causas** (Lee, Padmanabhan y Whang, 1997) | **Alta.** Es un concepto canónico de SCM y hoy solo aparece en S4 a través del juego mismo, no como contenido explícito en los subtemas. |
| 3.8 | **Pensamiento sistémico: retrasos y lazos de retroalimentación** (Sterman, 1989) | Media-alta. Es el objetivo que tenía la actividad en la edición anterior ("múltiples niveles de explicación de una problemática compleja"). |
| 3.9 | **Sesgos de decisión** (ignorar el inventario en tránsito, culpar a otros eslabones) | Media. Útil para el componente de toma de decisiones. |
| 3.10 | **Remedios colaborativos** (VMI, CPFR, compartir POS) | **Alta.** Conecta directamente con 7-Eleven y con el uso de datos en la cadena. |

## 4. Resumen cuantitativo

Conteo sobre los 22 temas del programa (13 de S4 y 9 de S5):

| | GSCM | Beer Game |
|---|:---:|:---:|
| ✅ Directa | 4 | 5 |
| 🟡 Parcial | 8 | 5 |
| ❌ No cubre | 10 | 12 |
| Temas extra de alta relevancia | 2 (newsvendor, dual sourcing) | 2 (bullwhip, remedios colaborativos) |

## 5. Lectura de la evidencia

1. **Cobertura parecida, perfiles distintos.** GSCM cubre mejor la parte de **decisión económica**: costo vs. *lead time*, capacidad, incertidumbre de demanda. El Beer Game cubre mejor la parte de **estructura y flujos de la red**: echelons, información vs. producto, datos compartidos.
2. **Ninguno toca la Sesión 5.** La decisión de simulador no afecta la logística omnicanal.
3. **El Beer Game refuerza el caso 7-Eleven.** Con GSCM, el caso 7-Eleven tendría que sostenerse solo.
4. **GSCM agrega dos temas valiosos que hoy faltan** (newsvendor y nearshoring) y llena una sesión completa (90–120 min). Así encaja con la sesión 6 dedicada a simulación.
5. **Opción combinada:** usar GSCM en S6 como simulación central (individual) y conservar el Beer Game en S4 en versión breve, como demostración o tarea, para introducir el bullwhip antes del caso 7-Eleven.

## Referencias

- Hammond, J. H. (1994). *Beer game: Board version* (Background Note No. 694-104). Harvard Business School.
- Hammond, J. H. (2016). *Global supply chain management simulation V2* (Product No. 8623). Harvard Business Publishing. https://hbsp.harvard.edu/product/8623-HTM-SPA
- Lee, H. L., Padmanabhan, V., & Whang, S. (1997). Information distortion in a supply chain: The bullwhip effect. *Management Science, 43*(4), 546–558. https://doi.org/10.1287/mnsc.43.4.546
- Sterman, J. D. (1989). Modeling managerial behavior: Misperceptions of feedback in a dynamic decision making experiment. *Management Science, 35*(3), 321–339. https://doi.org/10.1287/mnsc.35.3.321

---

[← Volver al índice](./README.md)
