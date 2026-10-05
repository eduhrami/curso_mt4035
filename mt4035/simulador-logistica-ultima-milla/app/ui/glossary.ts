/** Glosario del simulador de última milla (AD-32): siglas y conceptos que aparecen en la interfaz. */
import type { GlossaryEntry } from "@mt4035/ui-kit";

const KPI = "Indicadores (KPI)";
const RED = "Red de fulfillment";
const PROM = "Asignación y promesa";
const FLOTA = "Flota y ruteo";
const CLI = "Cliente, datos y devoluciones";
const GEN = "Conceptos generales";

export const GLOSSARY: GlossaryEntry[] = [
  // Indicadores
  { term: "KPI", full: "Key Performance Indicator", def: "Indicador clave de desempeño: una métrica que resume qué tan bien se cumple un objetivo.", aliases: ["KPIs"], category: KPI },
  { term: "OTD", full: "On-Time Delivery Rate", def: "Entregas dentro de la ventana prometida / total de entregas.", category: KPI },
  { term: "OTIF", full: "On-Time In-Full", def: "Entregas a tiempo y con el pedido completo / total de entregas.", category: KPI },
  { term: "FADS", full: "First Attempt Delivery Success", def: "Entregas exitosas al primer intento / intentos de entrega.", category: KPI },
  { term: "CPD", full: "Cost per Delivered order", def: "Costo por pedido entregado: costo total de última milla / entregas exitosas (US$).", category: KPI },
  { term: "CTS", full: "Cost-to-Serve", def: "Costo de servir un segmento (zona, cliente o nivel de servicio) / su volumen.", category: KPI },
  { term: "CSAT", full: "Customer Satisfaction", def: "Satisfacción del cliente: calificación promedio de 1 a 5.", category: KPI },
  { term: "NPS", full: "Net Promoter Score", def: "% de clientes promotores − % de detractores.", category: KPI },
  { term: "Spoilage", full: "Spoilage rate", def: "Pedidos frescos que llegan con la cadena de frío rota (tibios) / pedidos frescos.", aliases: ["spoilage rate"], category: KPI },
  { term: "Order Cycle Time", def: "Tiempo de ciclo del pedido: horas desde la compra hasta la entrega.", category: KPI },
  { term: "Vehicle Util.", full: "Vehicle Utilization", def: "Capacidad usada de los vehículos en ruta / capacidad disponible.", aliases: ["utilización de vehículo", "utilización de flota"], category: KPI },
  { term: "Node Util.", full: "Node Utilization", def: "Pedidos surtidos / capacidad de picking del nodo más cargado.", category: KPI },
  { term: "Backlog", def: "Pedidos que no se entregaron en su día y pasan al siguiente / carga del día.", category: KPI },
  { term: "Exceptions", full: "Delivery Exception Rate", def: "Entregas con alguna excepción (falla, daño, spoilage, robo) / entregas.", category: KPI },
  { term: "Perfect Order", def: "Orden perfecta: a tiempo × completa × sin daño × con documentación correcta.", category: KPI },
  { term: "ETA", full: "Estimated Time of Arrival", def: "Hora estimada de llegada que se comunica al cliente. ETA accuracy: 1 − error del ETA / ancho de la ventana.", category: KPI },
  { term: "Stops/route", def: "Paradas por ruta: entregas que hace cada vehículo en su recorrido.", aliases: ["paradas por ruta", "paradas por hora"], category: KPI },
  { term: "Route Efficiency", def: "Distancia del mejor diseño de ruta posible / distancia real recorrida.", category: KPI },
  { term: "Empty Miles", def: "Kilómetros recorridos sin carga / kilómetros totales.", category: KPI },
  { term: "OSA", full: "On-Shelf Availability", def: "Disponibilidad en anaquel de la tienda física. Cae si la tienda dedica demasiadas horas a surtir pedidos en línea.", category: KPI },
  { term: "p95", full: "Percentil 95", def: "Valor que solo el 5% de los días peores supera. Muestra los días críticos que el promedio esconde (para KPI donde más es mejor se usa el percentil 5).", aliases: ["percentil"], category: KPI },
  { term: "Guardrail", def: "KPI de contención: un límite que no debe romperse mientras se mejora el KPI primario.", aliases: ["guardrails", "primario–guardrail"], category: KPI },

  // Red de fulfillment
  { term: "Fulfillment", def: "Proceso de surtir un pedido: recibirlo, prepararlo (picking), empacarlo y entregarlo.", category: RED },
  { term: "Última milla", def: "Último tramo de la entrega: del nodo de surtido a la puerta del cliente. Suele ser el más caro por pedido.", category: RED },
  { term: "CD", full: "Centro de distribución", def: "Almacén central desde el que se surten pedidos o se reabastecen tiendas.", category: RED },
  { term: "SFD", full: "Ship-from-DC", def: "Surtir el pedido en línea desde el CD.", aliases: ["Ship-from-DC"], category: RED },
  { term: "SFS", full: "Ship-from-Store", def: "Surtir el pedido en línea desde una tienda cercana al cliente, con personal de la tienda.", aliases: ["Ship-from-store"], category: RED },
  { term: "BOPIS", full: "Buy Online, Pick-up In Store", def: "Compra en línea y recoge en tienda.", category: RED },
  { term: "Dark store", def: "Tienda cerrada al público que funciona solo como almacén para pedidos en línea.", aliases: ["dark stores"], category: RED },
  { term: "MFC", full: "Micro-Fulfillment Center", def: "Pequeño centro de surtido automatizado, cerca de la demanda urbana.", category: RED },
  { term: "Locker", def: "Casillero o punto de recolección desatendido donde el cliente recoge su pedido.", aliases: ["lockers", "puntos de recolección"], category: RED },
  { term: "Micro-hub", def: "Pequeño centro de cross-dock cerca de zonas lejanas que consolida la carga troncal y la reparte.", aliases: ["micro-hubs"], category: RED },
  { term: "Cross-dock", def: "Operación en la que la mercancía entra y sale casi de inmediato, sin almacenarse.", category: RED },
  { term: "Troncal", full: "Linehaul", def: "Transporte de alto volumen entre el nodo central y los nodos cercanos al cliente.", category: RED },
  { term: "Picking", def: "Recolección de los artículos de un pedido en el almacén o la tienda.", category: RED },

  // Asignación y promesa
  { term: "ATP", full: "Available-to-Promise", def: "Inventario y capacidad disponibles para comprometer un pedido; el batching ATP agrupa pedidos antes de asignarles nodo.", category: PROM },
  { term: "Batching", def: "Agrupar pedidos en lotes por intervalos de tiempo antes de asignarlos o rutearlos.", category: PROM },
  { term: "Slotting", def: "Publicar una capacidad limitada por ventana y zona para no prometer más de lo que se puede entregar.", category: PROM },
  { term: "Hora de corte", full: "Cut-off", def: "Hora límite para que un pedido entre al nivel de servicio del mismo día.", aliases: ["cut-off"], category: PROM },
  { term: "Holgura", full: "Buffer", def: "Margen de tiempo que se agrega a la promesa de entrega sobre el tiempo estimado.", aliases: ["buffer"], category: PROM },
  { term: "Ventana de entrega", def: "Intervalo de tiempo en que se promete la entrega (1 h, 2 h, 4 h o todo el día).", category: PROM },
  { term: "Express", def: "Nivel de servicio de entrega en menos de 2 horas.", category: PROM },
  { term: "Segmentación", def: "Ofrecer distintos niveles de servicio según el cliente, la categoría o la zona.", category: PROM },

  // Flota y ruteo
  { term: "3PL", full: "Third-Party Logistics", def: "Operador logístico externo que presta flota y choferes.", category: FLOTA },
  { term: "Crowdsourced", def: "Repartidores independientes que se contratan por entrega a través de una plataforma.", category: FLOTA },
  { term: "VRPTW", full: "Vehicle Routing Problem with Time Windows", def: "Problema de ruteo de vehículos con ventanas de tiempo; el optimizador busca rutas que respeten las ventanas al menor costo.", category: FLOTA },
  { term: "Heurística", def: "Método de solución aproximado y rápido (p. ej., savings o cluster-first/route-second).", category: FLOTA },
  { term: "k-means", def: "Algoritmo que agrupa puntos (domicilios) en k zonas según su cercanía.", category: FLOTA },
  { term: "Zonificación", def: "División del territorio en zonas de reparto.", aliases: ["re-zonificación"], category: FLOTA },
  { term: "Backhaul", def: "Aprovechar el viaje de regreso de una ruta para recoger devoluciones u otra carga.", category: FLOTA },
  { term: "Telemetría", def: "Sensores en el vehículo que reportan ubicación, velocidad y temperatura en tiempo real.", category: FLOTA },
  { term: "GPS", full: "Global Positioning System", def: "Sistema de posicionamiento por satélite.", category: FLOTA },
  { term: "EV", full: "Electric Vehicle", def: "Vehículo eléctrico.", category: FLOTA },

  // Cliente, datos y devoluciones
  { term: "SMS", full: "Short Message Service", def: "Mensaje de texto al celular del cliente.", category: CLI },
  { term: "Geocodificación", def: "Convertir una dirección escrita en coordenadas para ubicarla con precisión.", category: CLI },
  { term: "Pago contra entrega", full: "COD (Cash on Delivery)", def: "El cliente paga al recibir el pedido.", aliases: ["COD"], category: CLI },
  { term: "IA", full: "Inteligencia artificial", def: "En el simulador, ruteo basado en modelos que aprenden de los datos de operación.", category: CLI },
  { term: "Logística inversa", def: "Flujo de devoluciones del cliente de regreso a la empresa.", aliases: ["devoluciones"], category: CLI },

  // Conceptos generales
  { term: "Trade-off", def: "Disyuntiva: mejorar un objetivo empeora otro (p. ej., velocidad contra costo).", category: GEN },
  { term: "Frontera OTD–CPD", def: "Curva de las mejores combinaciones posibles de puntualidad y costo por pedido: mejorar una exige sacrificar la otra.", aliases: ["frontera"], category: GEN },
  { term: "Semilla", def: "Número que fija la secuencia aleatoria de la partida. Misma semilla y mismas decisiones producen la misma corrida.", category: GEN },
];
