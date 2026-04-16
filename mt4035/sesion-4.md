# Sesión 4 — SCM + inventario + fundamentos de diseño de red

**Fecha:** 13 de mayo de 2026  
**Profesor:** Eduardo  
**Ancla del packet:** Sesión 4 incluye SCM + inventarios + diseño de red (fundamentos)
**Ancla del plan de estudios:** Temas 6–7

---

## Descripción de la sesión

La sesión introduce la perspectiva de supply chain management (SCM) aplicada al retail, enfatizando la relación entre decisiones de diseño y control (red, inventarios y reposición) y el desempeño en tiempo, costo y nivel de servicio. Se revisan KPIs clave de supply chain y se presenta una introducción al diseño de red (qué nodos existen, dónde posicionar inventario y capacidad, y cómo se balancea costo vs servicio). Luego se revisan modelos básicos de gestión de inventario como EOQ y ROP, resaltando sus supuestos y limitaciones. A través del caso 7-Eleven Japan, se discute cómo el uso inteligente de datos puede convertirse en una ventaja competitiva a lo largo de la cadena. La sesión incluye además la simulación **Beer Game** — un ejercicio clásico de cadena de suministro (originalmente desarrollado en MIT por Sterman) que permite experimentar de primera mano el efecto bullwhip en un canal de distribución de 4 niveles (detallista → mayorista → distribuidor → fabricante).

## Objetivos

Al finalizar la sesión, las y los estudiantes serán capaces de:

- Conectar KPIs de supply chain (tiempo, costo, nivel de servicio) con decisiones analíticas y operativas
- Entender el rol del diseño de red (nodos, echelons, posicionamiento de inventario) y sus tradeoffs costo-servicio
- Entender EOQ/ROP, sus supuestos y límites en contextos reales de retail
- Identificar oportunidades de creación de valor a partir del uso de datos en casos como 7-Eleven

---

## Estructura en clase

**Quiz inicial en línea (~15 min):** quiz en Canvas al inicio de la sesión, sobre los contenidos de la Sesión 3 (analítica de ventas e inventario).

1. **Mapa de KPIs:** lead time, fill rate, OTIF, cost-to-serve
2. **Diseño de red (fundamentos):** nodos/echelons, centralizado vs regional, costo vs servicio, posicionamiento de inventario y capacidad
3. **Modelos de control:** EOQ/ROP (visión general)
4. **Beer Game (simulación en línea, ~30–40 min):** los equipos juegan la simulación por 20 semanas en https://beergame.masystem.se/ asumiendo cada integrante un rol (detallista, mayorista, distribuidor, fabricante). El objetivo es experimentar el efecto bullwhip y los múltiples niveles de explicación de una problemática de SCM desde una perspectiva sistémica.
5. **Discusión 7-Eleven:** "¿Dónde está la ventaja de datos y cómo se manifiesta?"

## Subtemas (detalle)

- **Lenguaje de red:** nodos (proveedor, CD, tienda, dark store, 3PL) y echelons; flujos físicos vs flujos de información
- **Servicio objetivo:** qué significa "nivel de servicio" (fill rate/OTIF) y cómo se conecta con disponibilidad y promesa al cliente
- **Posicionamiento de inventario:** dónde conviene almacenar (central vs regional), qué se gana/pierde en tiempo y variabilidad
- **Trade-off costo-servicio:** costo fijo (nodos) vs costo variable (transporte/manejo); noción de cost-to-serve
- **Capacidad y cuellos de botella:** capacidades en CD/tienda y por qué importan incluso con buen pronóstico
- **Escenarios simples:** comparación 1 CD vs 2 CDs (análisis de sensibilidad básico, sin optimización formal)
- **Límites de la sesión:** ruteo de última milla, asignación dinámica de pedidos y selección de transportistas se profundizan en Sesión 5

---

## Actividad en clase

Lectura y discusión guiada del caso **Seven-Eleven Japan Co.** (Kellogg KEL026, incluido en las lecturas de la sesión). En equipos:

1. Lectura individual de las secciones clave del caso (≈20 min).
2. Identificar cómo el uso de datos y analítica se convirtió en una **ventaja competitiva** de 7-Eleven Japan a lo largo de la cadena: captura de datos en POS, frecuencia de reposición, decisiones de surtido a nivel tienda.
3. Dibujar un diagrama simplificado de la red de 7-Eleven Japan y compararlo a alto nivel con la red del retailer del proyecto final.
4. Usar la plantilla del profesor para comparar a grandes rasgos un escenario **1 CD vs 2 CDs**, identificando el trade-off costo–servicio.

**Entregable de la actividad:** diagrama comparativo (7-Eleven vs retailer propio) + 3 hallazgos clave sobre cómo los datos habilitan decisiones de red e inventario.

---

## Tarea / entregable

- Actividad en foro (preguntas del caso + interacción con pares)
- Proyecto: 1 diagrama de red (as-is) + 3 KPIs de servicio/costo que la red impacta
- **Beer Game — reporte en equipo:** presentación breve (PPT o equivalente) que incluya: (1) evidencia de la simulación de 20 semanas (gráficas de órdenes vs. tiempo e inventario vs. tiempo), (2) conclusiones de cada integrante del equipo: estrategias usadas, decisiones tomadas, situaciones enfrentadas, si se cumplió o no el objetivo de pedido y qué aprendieron sobre el efecto bullwhip y la dinámica de cadenas de suministro.

---

## Libro de texto

- Agrawal, N., & Smith, S. A. (Eds.). (2015). *Retail supply chain management: Quantitative models and empirical studies* (2nd ed.). Springer.

## Lecturas recomendadas (APA)

- Chopra, S. (2005, January 1). *Seven-Eleven Japan Co.* (Case No. KEL026). Kellogg School of Management. https://store.hbr.org/product/seven-eleven-japan-co/KEL026
- Lal, R., & Han, A. (2005, July 12). *Tanpin Kanri: Retail Practice at Seven-Eleven Japan* (Case No. 506002). Harvard Business School. https://store.hbr.org/product/tanpin-kanri-retail-practice-at-seven-eleven-japan/506002
- Johnson, P. F., & Mark, K. (2019, July 8). *Walmart: Supply Chain Management* (Case No. W19317). Ivey Publishing. https://store.hbr.org/product/walmart-supply-chain-management/W19317
- Chaubard, F. (2023). *AI for retail: A practical guide to modernize your retail business with AI and automation*. Wiley. — caps. 16–17 (inventario, órdenes, SCM y replenishment con IA) como lente práctico sobre diseño de red y políticas de inventario.
- Hammond, J. H. (1994). *Beer game: Board version* (Background Note No. 694-104). Harvard Business School. https://store.hbr.org/product/beer-game-board-version/694104 — simulación clásica de cadena de suministro que ilustra el efecto bullwhip en un canal de distribución de 4 niveles.
- Sterman, J. (2023). *MIT Sloan beer game online* [Simulación web]. MIT Sloan School of Management. https://mitsloan.mit.edu/teaching-resources-library/mit-sloan-beer-game-online — versión digital de referencia académica del Beer Game (©2023 MIT Sloan). Material de contexto; la simulación del curso se juega en MA System (ver Complementos).

## Complementos

- Capítulos de inventarios (safety stock, service levels, variabilidad)
- Material del profesor: plantilla simple (hoja de cálculo) para comparar 1 CD vs 2 CDs (costo total vs tiempo de entrega)
- **Beer Game (simulación en línea):** la sesión incluye la simulación del Beer Game para experimentar de primera mano el efecto bullwhip. Se juega en línea desde https://beergame.masystem.se/ (reglas: https://www.masystem.se/MA-system-Consulting/Play-The-Beer-Game/Rules). Referencia institucional: Hammond (1994), citada arriba.

---

[← Volver al índice](./README.md)
