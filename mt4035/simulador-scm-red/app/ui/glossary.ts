/** Glosario del simulador SCM (AD-32): siglas y conceptos que aparecen en la interfaz. */
import type { GlossaryEntry } from "@mt4035/ui-kit";

const KPI = "Indicadores (KPI)";
const RED = "Red, flujo y transporte";
const INV = "Inventario y tienda";
const INFO = "Información y colaboración";
const GEN = "Conceptos generales";
const FC = "Pronóstico y series de tiempo";

export const GLOSSARY: GlossaryEntry[] = [
  // Indicadores
  { term: "KPI", full: "Key Performance Indicator", def: "Indicador clave de desempeño: una métrica que resume qué tan bien se cumple un objetivo.", aliases: ["KPIs"], category: KPI },
  { term: "OSA", full: "On-Shelf Availability", def: "Disponibilidad en anaquel: porcentaje del tiempo en que el producto está en el anaquel cuando el cliente lo busca. Tiempo con stock / tiempo total.", category: KPI },
  { term: "OTIF", full: "On-Time In-Full", def: "Entregas del CEDIS a la tienda que llegan a tiempo y completas / total de entregas.", category: KPI },
  { term: "OFR", full: "Order Fill Rate", def: "Porcentaje de pedidos surtidos completos (todo o nada por pedido).", category: KPI },
  { term: "CTS", full: "Cost-to-Serve", def: "Costo de servir: costo logístico total de abastecer a las tiendas. En el simulador se expresa como % de las ventas o por tienda.", category: KPI },
  { term: "Waste", full: "Merma", def: "Unidades que se pierden (caducan o se dañan) / unidades recibidas. Pesa sobre todo en frescos.", aliases: ["merma"], category: KPI },
  { term: "Lost Sales", full: "Ventas perdidas", def: "Demanda que no se atendió ni se sustituyó por otro producto / demanda total. En la vida real casi nunca se observa directamente.", aliases: ["ventas perdidas"], category: KPI },
  { term: "ITR", full: "Inventory Turnover", def: "Rotación de inventario: COGS anual / inventario promedio. Cuántas veces al año se renueva el inventario.", category: KPI },
  { term: "DOI", full: "Days of Inventory", def: "Días de inventario: inventario promedio / COGS diario. Complemento de la rotación.", category: KPI },
  { term: "GMROI", full: "Gross Margin Return on Inventory", def: "Margen bruto / inventario promedio a costo: cuánto margen genera cada peso invertido en inventario.", category: KPI },
  { term: "EBITDA", full: "Earnings Before Interest, Taxes, Depreciation and Amortization", def: "Utilidad antes de intereses, impuestos, depreciación y amortización. En el simulador, EBITDA logístico: margen menos merma y costos logísticos, como % de ventas.", category: KPI },
  { term: "BWR", full: "Bullwhip Ratio", def: "Var(órdenes al proveedor) / Var(demanda en tienda). Mide el efecto látigo; 1 es lo ideal.", category: KPI },
  { term: "LT", full: "Lead Time", def: "Tiempo de reposición del proveedor a la tienda, en días. Su variabilidad (σ LT) pesa tanto o más que su promedio.", aliases: ["lead time", "σ LT"], category: KPI },
  { term: "Trucks", full: "Camiones por tienda al día", def: "Entregas que recibe cada tienda al día. Indicador de complejidad operativa en tienda.", category: KPI },
  { term: "COGS", full: "Cost of Goods Sold", def: "Costo de la mercancía vendida.", category: KPI },
  { term: "Guardrail", def: "KPI de contención: un límite que no debe romperse mientras se mejora el KPI primario (p. ej., mejorar el servicio sin disparar el costo).", aliases: ["guardrails"], category: KPI },

  // Red, flujo y transporte
  { term: "CEDIS", full: "Centro de distribución", def: "Instalación que recibe mercancía de proveedores y la reparte a las tiendas. Puede guardar inventario o solo cruzarlo (cross-dock). La distancia del CEDIS a cada tienda fija cuántas veces por semana se le puede entregar: cerca, hasta 2 veces al día; muy lejos, 1 vez por semana.", aliases: ["CD", "centro de distribución", "centros de distribución"], category: RED },
  { term: "Planta de proveedores", def: "Instalación de un proveedor dentro de la región (◆ en el mapa). Es un dato del escenario: no la decides tú. Si es dedicada, trabaja solo para Hoshi Mart y su lead time es más corto. Un CEDIS cerca de la planta paga menos flete de entrada; uno cerca de las tiendas, menos reparto.", aliases: ["plantas de proveedores", "planta dedicada", "proveedor dedicado", "proveedores dedicados"], category: RED },
  { term: "Flete de entrada", def: "Costo de traer la mercancía de la planta del proveedor al CEDIS (por caja y kilómetro). Con proveedores externos a la región va incluido en el precio.", aliases: ["flete de proveedores"], category: RED },
  { term: "Cross-dock", def: "Operación en la que la mercancía entra al CEDIS y sale casi de inmediato hacia las tiendas, sin almacenarse.", aliases: ["cross-docking"], category: RED },
  { term: "CEDIS con inventario", def: "CEDIS que almacena mercancía y reparte desde su stock (stocking). Amortigua las fallas del proveedor y permite un stock de seguridad compartido entre tiendas (pooling), pero el producto pasa más tiempo ahí: los frescos de vida corta llegan con menos días de anaquel. Consolida en un camión lo que sale hacia cada tienda.", aliases: ["CEDIS con inventarios", "stocking"], category: RED },
  { term: "CEDIS combinado", def: "CEDIS cross-dock con zonas por temperatura (congelado, refrigerado, ambiente y caliente): la mercancía de varios proveedores entra y sale casi el mismo día, sin almacenarse, consolidada por temperatura. El producto llega fresco y con pocos camiones por tienda (modelo de Seven-Eleven Japan). Es el tipo más caro de construir y operar, y no amortigua las fallas del proveedor. Es el único que permite la consolidación combinada.", aliases: ["CEDIS combinados", "CD combinado", "combinado por temperatura"], category: RED },
  { term: "Consolidación combinada", def: "En un CEDIS combinado, varios proveedores de la misma temperatura viajan juntos en un solo camión hacia la tienda: bajan los camiones por tienda, el tiempo de recepción y los errores. Sin ella (consolidación por proveedor), cada proveedor llega en su propio camión aunque pase por el CEDIS.", aliases: ["consolidación combinada por temperatura"], category: RED },
  { term: "Consolidación", def: "Juntar en un mismo envío la carga de varios proveedores o categorías para llenar mejor los camiones.", category: RED },
  { term: "Multi-temperatura", def: "Vehículo con compartimentos a distintas temperaturas, que permite llevar frescos, refrigerados y congelados en un solo viaje.", category: RED },
  { term: "Telemetría", def: "Sensores en el vehículo que reportan ubicación, temperatura y estado en tiempo real.", category: RED },
  { term: "Horas valle", def: "Horarios de baja actividad (tráfico y ventas) en los que se puede entregar a tienda con menos congestión.", category: RED },
  { term: "Dominancia", def: "Estrategia de apertura que concentra tiendas en zonas compactas (clusters) alrededor de los CEDIS para ganar densidad.", aliases: ["clusters", "cluster"], category: RED },
  { term: "Greenfield", def: "Empezar desde cero, sin tiendas ni CEDIS existentes.", category: RED },
  { term: "Capex", full: "Capital Expenditure", def: "Inversión de capital: gasto en activos de largo plazo, como construir o ampliar un CEDIS.", category: RED },

  // Inventario y tienda
  { term: "ROP", full: "Reorder Point", def: "Punto de reorden: nivel de inventario en el que se lanza un nuevo pedido (revisión continua).", category: INV },
  { term: "EOQ", full: "Economic Order Quantity", def: "Cantidad económica de pedido: el tamaño de lote que equilibra el costo de pedir y el de mantener inventario.", category: INV },
  { term: "Revisión periódica", def: "Política de inventario que revisa y pide cada cierto intervalo fijo, en lugar de hacerlo al cruzar un punto de reorden.", category: INV },
  { term: "CSL", full: "Cycle Service Level", def: "Nivel de servicio por ciclo: probabilidad de no quedarse sin stock durante un ciclo de reposición. Determina el stock de seguridad. Aquí lo fija tu propuesta de valor por categoría; la disponibilidad real (OSA) puede quedar abajo de esa meta.", category: INV },
  { term: "Stock de seguridad", def: "Inventario adicional para absorber la variabilidad de la demanda y del lead time.", aliases: ["inventario de seguridad"], category: INV },
  { term: "SKU", full: "Stock Keeping Unit", def: "Unidad de inventario: cada producto distinto (por presentación, tamaño, etc.) que se gestiona por separado.", aliases: ["SKUs"], category: INV },
  { term: "FIFO", full: "First In, First Out", def: "Primero en entrar, primero en salir: se venden primero las unidades más antiguas.", category: INV },
  { term: "Tanpin kanri", def: "Gestión por artículo de Seven-Eleven Japan: el encargado de tienda pide con base en hipótesis sobre la demanda (clima, eventos) apoyado en datos de POS.", category: INV },

  // Información y colaboración
  { term: "POS", full: "Point of Sale", def: "Punto de venta: el sistema de caja que registra cada venta. Sus datos permiten pronosticar y compartir la demanda real.", category: INFO },
  { term: "RMI", full: "Retailer-Managed Inventory", def: "Inventario administrado por el minorista: tú pronosticas y decides cuándo y cuánto reponer; el proveedor solo surte lo que pides. Es el punto de partida.", category: INFO },
  { term: "CPFR", full: "Collaborative Planning, Forecasting and Replenishment", def: "Planeación, pronóstico y reposición colaborativos entre cliente y proveedor: los dos comparten datos y acuerdan un pronóstico. Baja el error y el lead time, pero cuesta implementarlo y madura en varios trimestres.", category: INFO },
  { term: "Arm's-length", def: "Relación transaccional con el proveedor, sin compartir información ni planear en conjunto.", category: INFO },
  { term: "Pronóstico avanzado", def: "Sistema de pronóstico de las tiendas operado por un equipo de analítica: tiene menor error que el básico, sobre todo en los cambios de temporada, y reduce el efecto látigo. Cuesta implementarlo y mantener al equipo. Es distinto del pronóstico anual que captura el equipo.", category: INFO },

  // Dinero
  { term: "Utilidad", def: "Puntaje definitivo: EBITDA logístico (margen bruto − merma − rebajas − costos logísticos − TI) − inversión − penalizaciones por servicio, acumulado en los 12 trimestres.", aliases: ["utilidad acumulada"], category: "Dinero" },
  { term: "Penalización por servicio", def: "Cada trimestre en que rompes un guardrail de servicio de tu propuesta de valor (p. ej., OSA mínima) pierdes un % de las ventas del trimestre: penalizaciones y clientes que se van.", aliases: ["penalizaciones por servicio"], category: "Dinero" },
  { term: "Tope de inversión", def: "Máximo que puedes gastar en decisiones en un año (CEDIS nuevos, conversiones, ampliaciones y cierres; aperturas y cierres de tiendas; escaneo y POS). Si un trimestre lo excede no lo puedes confirmar: prioriza o difiere al año siguiente. Se renueva cada T1. Las indemnizaciones por cerrar CEDIS o tiendas también lo consumen.", aliases: ["presupuesto de inversión"], category: "Dinero" },
  { term: "Rebajas", def: "Pérdida por comprar más de lo que se vende cuando el pronóstico es alto: la mercancía sobrante se vende con descuento o se desecha.", category: "Dinero" },

  // Pronóstico y series de tiempo
  { term: "Pronóstico", def: "Estimación de la demanda futura. En el simulador se captura en T1 de cada año con parámetros estimados de los datos y fija el inventario de las tiendas.", aliases: ["pronosticar", "pronosticas"], category: FC },
  { term: "Serie de tiempo", def: "Datos ordenados en el tiempo (aquí, demanda por tienda por semana). Se descompone en tendencia, estacionalidad y ruido.", aliases: ["series de tiempo"], category: FC },
  { term: "Tendencia", def: "Movimiento de largo plazo de la serie; aquí, el crecimiento anual de la demanda por tienda.", category: FC },
  { term: "Nivel base", def: "Unidades por tienda por día de un trimestre de índice 1, al inicio del año que se pronostica.", category: FC },
  { term: "Índice estacional", def: "Multiplicador de un periodo respecto al promedio (p. ej., T3 ×1.10). Se estima dividiendo la serie entre su tendencia.", aliases: ["índices"], category: FC },
  { term: "Desestacionalizar", def: "Quitar a la serie el efecto de la estacionalidad para ver la tendencia y el ruido.", category: FC },
  { term: "CV", full: "Coeficiente de variación", def: "Desviación estándar / media. Aquí, la variabilidad del residuo semanal una vez quitadas tendencia y estacionalidad.", aliases: ["coeficiente de variación"], category: FC },
  { term: "Residuo", def: "Lo que queda de la serie al quitar tendencia y estacionalidad: el ruido aleatorio de la semana.", category: FC },
  { term: "WAPE", full: "Weighted Absolute Percentage Error", def: "Error absoluto ponderado: Σ|pronóstico − real| / Σ real.", category: FC },
  { term: "Sesgo", full: "Bias", def: "(Σ pronóstico − Σ real) / Σ real. Positivo: pronosticaste de más; negativo: de menos.", category: FC },
  { term: "p95", full: "Percentil 95", def: "Valor que solo el 5% de las semanas supera.", category: FC },

  // Conceptos generales
  { term: "Bullwhip", full: "Efecto látigo", def: "Amplificación de la variabilidad de los pedidos conforme se sube en la cadena de suministro, aunque la demanda final sea estable.", aliases: ["efecto bullwhip", "efecto látigo"], category: GEN },
  { term: "Trade-off", def: "Disyuntiva: mejorar un objetivo empeora otro (p. ej., servicio contra costo).", category: GEN },
  { term: "Canibalización", def: "Ventas que una tienda nueva le quita a otra tienda propia cercana.", category: GEN },
  { term: "Propuesta de valor", def: "Lo que la empresa promete a sus clientes (frescura, precio o conveniencia). Define qué KPI pesan más en el puntaje.", category: GEN },
  { term: "Semilla", def: "Número que fija la secuencia aleatoria de la partida. Misma semilla y mismas decisiones producen la misma corrida.", category: GEN },
];
