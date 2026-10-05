/** Glosario del simulador SCM (AD-32): siglas y conceptos que aparecen en la interfaz. */
import type { GlossaryEntry } from "@mt4035/ui-kit";

const KPI = "Indicadores (KPI)";
const RED = "Red, flujo y transporte";
const INV = "Inventario y tienda";
const INFO = "Información y colaboración";
const GEN = "Conceptos generales";

export const GLOSSARY: GlossaryEntry[] = [
  // Indicadores
  { term: "KPI", full: "Key Performance Indicator", def: "Indicador clave de desempeño: una métrica que resume qué tan bien se cumple un objetivo.", aliases: ["KPIs"], category: KPI },
  { term: "OSA", full: "On-Shelf Availability", def: "Disponibilidad en anaquel: porcentaje del tiempo en que el producto está en el anaquel cuando el cliente lo busca. Tiempo con stock / tiempo total.", category: KPI },
  { term: "OTIF", full: "On-Time In-Full", def: "Entregas del CD a la tienda que llegan a tiempo y completas / total de entregas.", category: KPI },
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
  { term: "CD", full: "Centro de distribución", def: "Instalación que recibe mercancía de proveedores y la reparte a las tiendas. Puede guardar inventario o solo cruzarlo (cross-dock).", category: RED },
  { term: "Cross-dock", def: "Operación en la que la mercancía entra al CD y sale casi de inmediato hacia las tiendas, sin almacenarse.", aliases: ["cross-docking"], category: RED },
  { term: "DSD", full: "Direct Store Delivery", def: "Entrega directa del proveedor a la tienda, sin pasar por un CD.", category: RED },
  { term: "3PL", full: "Third-Party Logistics", def: "Operador logístico externo que presta transporte o almacenaje. «Dedicado» reserva recursos para la empresa; «spot» se contrata al momento.", category: RED },
  { term: "Consolidación", def: "Juntar en un mismo envío la carga de varios proveedores o categorías para llenar mejor los camiones.", category: RED },
  { term: "Multi-temperatura", def: "Vehículo con compartimentos a distintas temperaturas, que permite llevar frescos, refrigerados y congelados en un solo viaje.", category: RED },
  { term: "Telemetría", def: "Sensores en el vehículo que reportan ubicación, temperatura y estado en tiempo real.", category: RED },
  { term: "Horas valle", def: "Horarios de baja actividad (tráfico y ventas) en los que se puede entregar a tienda con menos congestión.", category: RED },
  { term: "Dominancia", def: "Estrategia de apertura que concentra tiendas en zonas compactas (clusters) alrededor de los CD para ganar densidad.", aliases: ["clusters", "cluster"], category: RED },
  { term: "Greenfield", def: "Empezar desde cero, sin tiendas ni CD existentes.", category: RED },
  { term: "Capex", full: "Capital Expenditure", def: "Inversión de capital: gasto en activos de largo plazo, como construir o ampliar un CD.", category: RED },

  // Inventario y tienda
  { term: "ROP", full: "Reorder Point", def: "Punto de reorden: nivel de inventario en el que se lanza un nuevo pedido (revisión continua).", category: INV },
  { term: "EOQ", full: "Economic Order Quantity", def: "Cantidad económica de pedido: el tamaño de lote que equilibra el costo de pedir y el de mantener inventario.", category: INV },
  { term: "Revisión periódica", def: "Política de inventario que revisa y pide cada cierto intervalo fijo, en lugar de hacerlo al cruzar un punto de reorden.", category: INV },
  { term: "CSL", full: "Cycle Service Level", def: "Nivel de servicio por ciclo: probabilidad de no quedarse sin stock durante un ciclo de reposición. Determina el stock de seguridad.", category: INV },
  { term: "Stock de seguridad", def: "Inventario adicional para absorber la variabilidad de la demanda y del lead time.", aliases: ["inventario de seguridad"], category: INV },
  { term: "SKU", full: "Stock Keeping Unit", def: "Unidad de inventario: cada producto distinto (por presentación, tamaño, etc.) que se gestiona por separado.", aliases: ["SKUs"], category: INV },
  { term: "FIFO", full: "First In, First Out", def: "Primero en entrar, primero en salir: se venden primero las unidades más antiguas.", category: INV },
  { term: "Tanpin kanri", def: "Gestión por artículo de Seven-Eleven Japan: el encargado de tienda pide con base en hipótesis sobre la demanda (clima, eventos) apoyado en datos de POS.", category: INV },

  // Información y colaboración
  { term: "POS", full: "Point of Sale", def: "Punto de venta: el sistema de caja que registra cada venta. Sus datos permiten pronosticar y compartir la demanda real.", category: INFO },
  { term: "VMI", full: "Vendor-Managed Inventory", def: "Inventario administrado por el proveedor: el proveedor decide cuándo y cuánto reponer con la información del cliente.", category: INFO },
  { term: "CPFR", full: "Collaborative Planning, Forecasting and Replenishment", def: "Planeación, pronóstico y reposición colaborativos entre cliente y proveedor.", category: INFO },
  { term: "Arm's-length", def: "Relación transaccional con el proveedor, sin compartir información ni planear en conjunto.", category: INFO },
  { term: "Pronóstico causal", def: "Pronóstico que explica la demanda con sus causas (clima, calendario, promociones), no solo con su historia.", category: INFO },

  // Conceptos generales
  { term: "Bullwhip", full: "Efecto látigo", def: "Amplificación de la variabilidad de los pedidos conforme se sube en la cadena de suministro, aunque la demanda final sea estable.", aliases: ["efecto bullwhip", "efecto látigo"], category: GEN },
  { term: "Trade-off", def: "Disyuntiva: mejorar un objetivo empeora otro (p. ej., servicio contra costo).", category: GEN },
  { term: "Canibalización", def: "Ventas que una tienda nueva le quita a otra tienda propia cercana.", category: GEN },
  { term: "Propuesta de valor", def: "Lo que la empresa promete a sus clientes (frescura, precio o conveniencia). Define qué KPI pesan más en el puntaje.", category: GEN },
  { term: "Semilla", def: "Número que fija la secuencia aleatoria de la partida. Misma semilla y mismas decisiones producen la misma corrida.", category: GEN },
];
