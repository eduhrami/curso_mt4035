# Sesión 4 — SCM + inventario + fundamentos de diseño de red

**Fecha:** 13 de mayo de 2026  
**Profesor:** Eduardo  
**Ancla del packet:** Sesión 4 incluye SCM + inventarios + diseño de red (fundamentos)
**Ancla del plan de estudios:** Temas 6–7

---

## Descripción de la sesión

La sesión introduce la perspectiva de supply chain management (SCM) aplicada al retail, enfatizando la relación entre decisiones de diseño y control (red, inventarios y reposición) y el desempeño en tiempo, costo y nivel de servicio. Se revisan KPIs clave de supply chain y se presenta una introducción al diseño de red (qué nodos existen, dónde posicionar inventario y capacidad, y cómo se balancea costo vs servicio). Luego se revisan modelos básicos de gestión de inventario como EOQ y ROP, resaltando sus supuestos y limitaciones. Finalmente, a través del caso 7-Eleven Japan, se discute cómo el uso inteligente de datos puede convertirse en una ventaja competitiva a lo largo de la cadena.

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
4. **Discusión 7-Eleven:** "¿Dónde está la ventaja de datos y cómo se manifiesta?"

## Subtemas (detalle)

- **Lenguaje de red:** nodos (proveedor, CD, tienda, dark store, 3PL) y echelons; flujos físicos vs flujos de información
- **Servicio objetivo:** qué significa "nivel de servicio" (fill rate/OTIF) y cómo se conecta con disponibilidad y promesa al cliente
- **Posicionamiento de inventario:** dónde conviene almacenar (central vs regional), qué se gana/pierde en tiempo y variabilidad
- **Trade-off costo-servicio:** costo fijo (nodos) vs costo variable (transporte/manejo); noción de cost-to-serve
- **Capacidad y cuellos de botella:** capacidades en CD/tienda y por qué importan incluso con buen pronóstico
- **Escenarios simples:** comparación 1 CD vs 2 CDs (análisis de sensibilidad básico, sin optimización formal)
- **Límites de la sesión:** ruteo de última milla, asignación dinámica de pedidos y selección de transportistas se profundizan en Sesión 5

---

## Preparación del estudiante

- Leer el caso *Seven-Eleven Japan Co.* (asignado)
- Dibujar (a alto nivel) la red del retailer del proyecto: tienda(s) / CD(s) / dark store / 3PL, y dónde creen que se posiciona el inventario
- Marcar 1 punto de dolor del sistema (quiebre, demora, sustitución, devoluciones) y el KPI que lo captura

---

## Tarea / entregable

- Actividad en foro (preguntas del caso + interacción con pares)
- Proyecto: 1 diagrama de red (as-is) + 3 KPIs de servicio/costo que la red impacta

---

## Libro de texto

- Agrawal, N., & Smith, S. A. (Eds.). (2015). *Retail supply chain management: Quantitative models and empirical studies* (2nd ed.). Springer.

## Lecturas recomendadas (APA)

- Chopra, S. (2005, January 1). *Seven-Eleven Japan Co.* (Case No. KEL026). Kellogg School of Management. https://store.hbr.org/product/seven-eleven-japan-co/KEL026
- Lal, R., & Han, A. (2005, July 12). *Tanpin Kanri: Retail Practice at Seven-Eleven Japan* (Case No. 506002). Harvard Business School. https://store.hbr.org/product/tanpin-kanri-retail-practice-at-seven-eleven-japan/506002
- Johnson, P. F., & Mark, K. (2019, July 8). *Walmart: Supply Chain Management* (Case No. W19317). Ivey Publishing. https://store.hbr.org/product/walmart-supply-chain-management/W19317

## Complementos

- Capítulos de inventarios (safety stock, service levels, variabilidad)
- Material del profesor: plantilla simple (hoja de cálculo) para comparar 1 CD vs 2 CDs (costo total vs tiempo de entrega)

---

[← Volver al índice](./README.md)
