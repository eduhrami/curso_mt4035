# Sesión 5 — Analítica de transporte y logística (ruteo, costo, última milla)

**Fecha:** 21 de mayo de 2026  
**Profesor:** Eduardo  
**Ancla del packet:** Sesión 5  
**Ancla del plan de estudios:** Tema 8

---

## Descripción de la sesión

En esta sesión se abordan los retos analíticos de transporte y logística en entornos omnicanal, construyendo sobre el diagrama de red y KPIs definidos en la Sesión 4. Se conectan decisiones de fulfillment (por ejemplo: ship-from-store vs CD, dark stores, micro-fulfillment, cross-docking) con promesa de entrega, cumplimiento, costo y capacidad. Además, se introducen de forma intuitiva los problemas de ruteo y su impacto en la experiencia del cliente y la rentabilidad, incluyendo el papel emergente de la IA en logística.

## Objetivos

Al finalizar la sesión, las y los estudiantes serán capaces de:

- Definir KPIs logísticos clave y proponer intervenciones analíticas para mejorarlos
- Comparar alternativas de diseño de red/fulfillment (nodos y flujos) y anticipar su impacto en costo, servicio y capacidad
- Entender los tradeoffs de última milla y las restricciones básicas de ruteo en contextos reales
- Relacionar decisiones de diseño logístico con la promesa y el cumplimiento de entrega al cliente final

---

## Estructura en clase

**Quiz inicial en línea (~15 min):** quiz en Canvas al inicio de la sesión, sobre los contenidos de la Sesión 4 (SCM, inventario y diseño de red).

1. **Del diagrama a decisiones:** diseño de red/fulfillment omnicanal y cómo cambia el cost-to-serve
2. **Promesa vs cumplimiento de entrega:** KPIs, ventanas de entrega, causas típicas de incumplimiento
3. **Ruteo y última milla:** drivers de costo, restricciones (capacidad/tiempo), por qué VRP es difícil
4. **IA en logística:** predicción de ETAs, asignación dinámica, monitoreo de anomalías y límites operativos

## Subtemas (detalle)

- **Fulfillment omnicanal:** ship-from-store, ship-from-DC, BOPIS, dark stores, MFC; cuándo conviene cada uno
- **Segmentación de servicio:** no todos los SKUs/clientes merecen el mismo SLA; implicancias para costo y capacidad
- **Order promising:** promesa realista vs optimista; buffers, cut-off times y su relación con OTIF
- **Economía de última milla:** densidad, drop size, reintentos, devoluciones; relación con costo por pedido
- **Ruteo (VRP):** ventanas de tiempo, múltiples depósitos, restricciones de flota, priorización; heurísticas vs óptimo
- **Asignación dinámica:** cómo decidir "desde dónde" cumplir un pedido (tienda vs CD) y tradeoffs locales vs globales
- **Reverse logistics:** devoluciones como parte del diseño (costo, tiempos, reputación)

---

## Actividad en clase

Mini-caso de **fulfillment omnicanal** presentado por el profesor en clase: un retailer debe decidir cómo cumplir los pedidos de un producto específico bajo restricciones de costo, promesa y capacidad. En equipos:

1. Comparar al menos **dos opciones de fulfillment** (por ejemplo *ship-from-store* vs *ship-from-DC*, o *BOPIS* vs entrega a domicilio).
2. Estimar a orden de magnitud el **costo por pedido** y el **tiempo de entrega** de cada opción, listando los supuestos clave.
3. Identificar los **KPIs logísticos** (OTIF, cost-to-serve, ventana de entrega) que cambian con cada opción y cómo se ve afectada la promesa al cliente.
4. Hacer una recomendación y listar dos riesgos de la implementación.

**Entregable de la actividad:** tabla comparativa de las opciones + recomendación del equipo con supuestos explícitos.

---

## Tarea / entregable

- Checkpoint de proyecto: baseline de KPIs logísticos + 2 hipótesis de mejora (al menos 1 debe ser a nivel de red/fulfillment)
- Proyecto: 1 escenario to-be de red/fulfillment (diagrama simple) + impacto esperado en 2 KPIs (servicio y costo)

---

## Libro de texto

- Fernie, J., & Sparks, L. (Eds.). (2018). *Logistics and retail management: Emerging issues and new challenges in the retail supply chain* (5th ed.). Kogan Page.

## Lecturas recomendadas (APA)

- Spiegel, J. R., McKenna, M. T., Lakshman, G. S., & Nordstrom, P. G. (2013, December 24). *Method and system for anticipatory package shipping* (U.S. Patent No. US 8,615,473). U.S. Patent and Trademark Office. https://patents.google.com/patent/US8615473B2/en
- Chaubard, F. (2023). *AI for retail: A practical guide to modernize your retail business with AI and automation*. Wiley. — caps. 18 (presupuestos y calendarización de mano de obra) y 20 (almacenes y centros de distribución) para operaciones de fulfillment.
- Prajapat, R. (2024). *AI-powered ecommerce: How machine learning is transforming online shopping*. Apress. https://doi.org/10.1007/979-8-8688-0923-1 — cap. 8 (eficiencia como habilitador de la experiencia de entrega y la rentabilidad en e-commerce).

## Complementos

- Capítulos de analítica de operaciones/logística (ruteo + economía de última milla + diseño de servicio)
- Video corto sugerido: introducción intuitiva a VRP/ruteo y por qué es difícil (material del profesor)

## Bibliografía complementaria (Manning)

- Biegel, G. (2026). *Digital twins in action*. Manning. https://www.manning.com/books/digital-twins-in-action

---

[← Volver al índice](./README.md)
