/** Textos de la interfaz de última milla: decisiones, opciones, KPIs y territorios (en español; KPIs con sigla en inglés). */
import type { KpiMeta, LabelMap } from "@mt4035/ui-kit";
import { decisions, params, presetOf, type Strategy, type TerritoryId } from "../src/index.ts";

type PlayableTerritory = Exclude<TerritoryId, "minicaso">;

export const TABS = [
  { id: "Pronóstico", label: "Pronóstico" },
  { id: "Red", label: "Red" },
  { id: "Asignación", label: "Asignación" },
  { id: "Promesa", label: "Promesa" },
  { id: "Flota", label: "Flota" },
  { id: "Zonas y ruteo", label: "Zonas y ruteo" },
  { id: "Cliente", label: "Cliente" },
  { id: "Devoluciones", label: "Devoluciones" },
  { id: "Datos y seguridad", label: "Datos y seguridad" },
];

/** Opciones sin ambigüedad entre decisiones; las que cambian de sentido van en LABELS[id].options. */
export const OPTIONS: Record<string, string> = {
  speed: "Velocidad",
  reliability: "Confiabilidad",
  efficiency: "Eficiencia",
  nearest: "Nodo más cercano",
  lowest: "Menor costo",
  threshold: "Umbral de costo dinámico",
  ai: "IA",
  "1h": "1 h",
  "2h": "2 h",
  "4h": "4 h",
  day: "Todo el día",
  customer: "Por cliente",
  category: "Por categoría",
  zone: "Por zona",
  none: "Ninguno",
  "3pl": "3PL",
  own: "Propia",
  own_3pl: "Propia 60% + 3PL",
  own_crowd: "Propia 60% + crowdsourced",
  crowd: "Crowdsourced",
  van: "Camioneta de combustión",
  ev: "Camioneta eléctrica",
  moto: "Moto",
  bike: "Bici de carga",
  reefer: "Refrigerada",
  coolers: "Hieleras",
  multi: "Multi-temperatura",
  lean: "Justa (−10%)",
  standard: "Estándar",
  ample: "Holgada (+25%)",
  fixed: "Fija",
  per_stop: "Por parada",
  mixed: "Mixta",
  advance: "Contrato anticipado",
  spot: "Spot (de último momento)",
  kmeans: "k-means",
  balanced: "Balanceada",
  capacitated: "Con capacidad",
  dynamic: "Dinámica",
  never: "Nunca",
  quarterly: "Trimestral",
  monthly: "Mensual",
  daily: "Diaria",
  manual: "Manual",
  heuristic: "Heurística",
  vrptw: "VRPTW (optimizador)",
  euclid: "Distancia euclidiana",
  avgtime: "Tiempo promedio",
  timedep: "Tiempo según la hora",
  fresh_first: "Frescos primero",
  sms: "SMS con ETA",
  live: "Seguimiento en vivo",
  capture: "Captura con referencias",
  geocode: "Geocodificación",
  retry_same: "Reintentar el mismo día",
  retry_next: "Reintentar al día siguiente",
  divert: "Desviar a locker o tienda",
  neighbor: "Dejar con vecino",
  allow: "Permitido",
  limit: "Limitado",
  remove: "Eliminado",
  pickup: "Recolección a domicilio",
  locker: "Locker",
  dedicated: "Rutas dedicadas",
  backhaul: "En la ruta de salida (backhaul)",
  corrective: "Correctivo",
  preventive: "Preventivo",
  low: "Baja",
  mid: "Media",
  high: "Alta",
};

/**
 * «¿Cómo impacta?» (recurso didáctico): en qué dirección mueve cada decisión los KPIs y por qué. Las direcciones siguen
 * el mapa de decisiones y las reglas de la especificación (§5, §6.4); el efecto exacto depende del territorio y del
 * resto de las decisiones.
 */
export const IMPACT: Record<string, string> = {
  "F-01":
    "Tu pronóstico dimensiona lo que contratas para el año: la capacidad comprometida con el 3PL, los contratos de flota para los picos y el personal de surtido. Si te quedas corto, en los días fuertes faltan rutas: pagas flota de último momento (más cara), crece el Backlog y caen el OTD y la CSAT. Si te pasas, pagas flota y personal ociosos y sube el CPD. Acertar los picos (Hot Sale, Buen Fin, Navidad) y la quincena pesa más que acertar el promedio.",
  "D-01":
    "Surtir desde el CD aprovecha su escala: el picking por pedido es barato y no toca el inventario de las tiendas, así que protege la OSA tienda. A cambio, el CD suele estar lejos de los clientes: las rutas son más largas, sube el Order Cycle Time y cuesta cumplir promesas rápidas. Más capacidad de picking evita que se forme Backlog en días pico.",
  "D-02":
    "Surtir desde tienda acerca el pedido al cliente: rutas cortas, entregas más rápidas y mejor OTD para promesas de mismo día. Pero el picking en tienda es más caro y compite con la operación de piso: si se usa demasiado, cae la OSA tienda y sube el error de surtido (baja el Perfect Order). Más pickers suben la capacidad y el costo; el tope de horas de piso protege a la tienda.",
  "D-03":
    "Que el cliente recoja en tienda elimina el reparto de esos pedidos: baja mucho el CPD y la entrega no falla por cliente ausente (sube FADS). La demanda de recolección es limitada y depende de que haya tiendas cerca; también usa algo de tiempo del personal de piso.",
  "D-04":
    "Una dark store es una tienda cerrada al público dedicada a pedidos en línea en una zona densa: acerca el inventario al cliente, baja el tiempo de entrega y libera a las tiendas de piso (protege la OSA tienda). Tiene un costo fijo alto (renta y personal) y tarda 3 meses en abrir: solo se paga con volumen suficiente; con poco volumen, la Node Util. es baja y el CPD sube.",
  "D-05":
    "Un MFC automatiza el picking: surte su zona y las vecinas con un costo por pedido muy bajo y muy rápido. La inversión es muy alta y tarda 6 meses en operar: conviene solo en zonas muy densas y con volumen alto; con poco volumen, la inversión no se recupera y la Node Util. queda baja.",
  "D-06":
    "Los lockers y puntos de recolección concentran varias entregas en una sola parada: bajan el CPD y suben FADS porque el cliente recoge cuando puede. Rinden más en zonas donde mucha gente no está en casa. Tienen un costo fijo bajo y tardan 1–2 meses en operar; el cliente pierde algo de comodidad.",
  "D-07":
    "Un micro-hub de cross-dock recibe carga consolidada y la reparte en rutas cortas en la periferia o en ciudades secundarias: bajan los kilómetros por ruta y sube la Route Efficiency donde el nodo de origen queda lejos. Tiene un costo fijo medio y tarda 2 meses en operar.",
  "D-10":
    "Define desde qué nodo se surte cada pedido. «El más cercano» es simple, pero satura las tiendas populares (cae la OSA tienda y crece el Backlog). Las reglas de menor costo y de umbral dinámico comparan el costo de cada nodo y bajan el CPD. La asignación con IA es la mejor, pero solo si los datos lo permiten: con datos básicos rinde una fracción de su potencial.",
  "D-11":
    "El batching junta pedidos antes de asignarlos. Un intervalo corto responde rápido (mejor Order Cycle Time) pero asigna peor, pedido por pedido, y sube el CPD. Uno largo asigna mejor y arma rutas más eficientes, pero retrasa los pedidos y complica las promesas rápidas.",
  "D-12":
    "Limita cuántas horas del personal de piso pueden dedicarse a surtir pedidos en línea. Un tope bajo protege la OSA tienda y la experiencia de quien compra en la tienda, pero deja menos capacidad para el canal en línea: en picos crece el Backlog. Si el surtido en tienda rebasa el tope, la OSA tienda cae y sube el error de picking.",
  "D-20":
    "Cada nivel de servicio que ofreces (express, mismo día, día siguiente, estándar) atrae clientes, pero fragmenta la densidad: los pedidos se reparten en más rutas con menos paradas, baja la Vehicle Util. y sube el CPD. El express con densidad baja es especialmente caro.",
  "D-21":
    "Una ventana angosta (1–2 h) da certeza al cliente: sube FADS y la CSAT, pero cada ruta hace menos paradas y sube el CPD. «Todo el día» llena las rutas, pero en zonas donde la gente no está en casa las entregas fallan: bajan FADS y suben los reintentos y el CPD.",
  "D-22":
    "Una hora de corte tardía para el mismo día es más atractiva y sube los pedidos, pero concentra el trabajo en la tarde: se exprime la capacidad, crece el Backlog y baja el OTD si la flota no alcanza.",
  "D-23":
    "La holgura agrega tiempo a la promesa. Sin holgura, la promesa es atractiva pero optimista: en un pico se forma un Backlog que se arrastra días, el OTD se desploma y la CSAT cae más de lo que suma la velocidad. Con holgura, el OTD es más estable a cambio de prometer algo más lento.",
  "D-24":
    "Segmentar (por membresía, por categoría con frescos en ventana corta o por zona urbana o rural) da el mejor servicio solo a quien lo necesita: libera capacidad y baja el CPD sin bajar el servicio global.",
  "D-25":
    "Una tarifa de envío más alta o un umbral de envío gratis más alto suben el tamaño del pedido y los ingresos por envío, pero frenan la demanda. Una tarifa baja atrae pedidos chicos que cuestan más de reparto por peso vendido.",
  "D-26":
    "Publicar una capacidad diaria por ventana y zona evita prometer lo que no cabe: protege el OTD y la CSAT en los picos. Si la capacidad publicada es baja, se rechazan pedidos y se pierden ventas; si es alta, se acumula Backlog.",
  "D-30":
    "La mezcla de flota reparte el riesgo. La flota propia es un costo fijo, controlable y confiable (buen OTD). El 3PL dedicado reserva capacidad a un costo intermedio. La flota crowdsourced es variable y elástica, barata en días normales, pero menos confiable: en picos con choferes escasos puede no cubrir rutas y cae el OTD.",
  "D-31":
    "El vehículo define capacidad, costo y velocidad. La camioneta de combustión carga mucho, pero no circula en contingencias ambientales. La eléctrica tiene energía barata y está exenta de restricciones, pero menos autonomía en rutas largas. La moto y la bici de carga son rápidas para express urbano con poca carga. La refrigerada protege los frescos y cuesta más.",
  "D-32":
    "El equipo de frío (hieleras, vehículo refrigerado o compartimentos multitemperatura) baja el Spoilage de los frescos, sobre todo en rutas de más de 3 horas y con calor, donde sin frío el daño crece rápido. Menos producto dañado significa menos reembolsos y mejor CSAT, a cambio de más costo de equipo.",
  "D-33":
    "Más vehículos propios por zona dan holgura: menos Backlog y mejor OTD en días fuertes, pero en días normales la flota queda ociosa y sube el CPD. Una flota mínima es barata en promedio y se queda corta en los picos.",
  "D-34":
    "Más turnos y fines de semana suben la capacidad de reparto y permiten promesas más amplias: baja el Backlog y sube el OTD. A cambio, sube el costo laboral, que se paga aunque no haya volumen.",
  "D-35":
    "El pago fijo es estable pero no premia la productividad. El pago por parada sube las paradas por hora, pero también las entregas marcadas en falso y los accidentes (bajan FADS real y la CSAT). El esquema mixto con bono por entrega a primer intento y OTD alinea al chofer con el cliente.",
  "D-36":
    "Contratar flota para los picos con anticipación es más barato y seguro que buscarla al momento (spot), que es cara e incierta. Si el contrato queda corto frente al pico real, faltan rutas y cae el OTD; si sobra, pagas capacidad ociosa. Se dimensiona con tu pronóstico de los picos.",
  "D-40":
    "Pocas zonas de reparto hacen rutas largas: sube el Order Cycle Time y cuesta cumplir ventanas. Muchas zonas consolidan menos pedidos por ruta: baja la Vehicle Util. y sube el CPD. El óptimo depende de la densidad del territorio.",
  "D-41":
    "Zonificar por colonias es simple, pero deja zonas desbalanceadas: unas rutas se saturan y otras van medio vacías. El k-means balanceado y el clustering capacitado reparten la carga de forma pareja: menos rutas saturadas, mejor OTD y mejor Route Efficiency. La zonificación dinámica sigue la demanda, pero exige buenos datos.",
  "D-42":
    "Re-zonificar ajusta las zonas a la demanda, pero cada cambio hace que el chofer pierda familiaridad con su zona: bajan las paradas por hora. Re-zonificar a diario sin datos maduros cuesta más de lo que gana.",
  "D-43":
    "Un ruteo más sofisticado (heurística, optimizador con ventanas de tiempo o re-ruteo en tiempo real con IA) acorta las rutas, sube la Route Efficiency y el OTD y baja el CPD. Pero rinde según los datos: con datos básicos, el ruteo con IA logra solo una parte de su potencial.",
  "D-44":
    "La función de costo define cómo «ve» el tiempo el optimizador. La distancia en línea recta y el tiempo medio subestiman el tiempo real, sobre todo en horas pico: las rutas parecen factibles pero llegan tarde y cae el OTD (la lección de UPS/ORION). El tiempo dependiente de la hora es el más realista, pero requiere datos de calidad.",
  "D-45":
    "Cargar los frescos al final del picking y entregarlos primero en la ruta reduce su tiempo fuera de frío: baja el Spoilage y los reembolsos sin costo adicional relevante.",
  "D-50":
    "Avisar al cliente cuándo llega su pedido sube la entrega a primer intento (FADS) y la CSAT: el seguimiento en vivo con ventana de 30 minutos es lo más efectivo. Menos reintentos bajan el CPD. Tiene un costo tecnológico por pedido.",
  "D-51":
    "Validar la dirección al capturarla (o con geocodificación, referencias y foto) baja las direcciones erróneas, sobre todo en zonas de urbanización irregular o nuevos desarrollos: suben FADS y la Route Efficiency y bajan los reintentos.",
  "D-52":
    "Qué hacer si el cliente no está cambia los reintentos y su costo. Reintentar el mismo día sube el costo de ruta; al día siguiente alarga la entrega. Desviar a locker o tienda resuelve con una sola parada. Dejar con un vecino o caseta sube FADS, pero también el riesgo de reclamo.",
  "D-53":
    "El pago contra entrega sube las entregas fallidas (el cliente cambia de opinión o no tiene efectivo): bajan FADS y suben los reintentos y el CPD. Eliminarlo reduce la demanda, sobre todo donde el uso de tarjeta es bajo; limitarlo a clientes recurrentes es un punto medio.",
  "D-55":
    "El canal de devolución equilibra costo y experiencia. Solo en tienda es barato pero incómodo para el cliente; recolectar a domicilio es cómodo y caro; los lockers son un punto medio. Afecta la CSAT y el costo por devolución.",
  "D-56":
    "Recoger las devoluciones en la ruta de salida (backhaul) aprovecha el camión que regresa: bajan las Empty Miles y el costo por devolución, pero la ruta dura más y hace menos paradas de entrega.",
  "D-60":
    "Mejores datos (GPS, tráfico histórico, peso y volumen) no mueven los KPIs por sí solos: habilitan que la asignación con IA, el ruteo dinámico y la función de costo por hora rindan su potencial. Sin datos, esas decisiones rinden poco. Tiene un costo de tecnología.",
  "D-61":
    "No cambia la operación: cambia lo que ves. Con el promedio mensual, los días críticos (lunes, quincenas, picos) quedan ocultos en el dashboard aunque el motor sí los simula. Con la serie diaria o el p95 aparecen los días en que el OTD y FADS se desploman, que son los que el cliente recuerda.",
  "D-62":
    "Las medidas de seguridad en ruta (GPS con botón de pánico, horarios y rutas variables, seguro) bajan la probabilidad y la severidad de los robos de mercancía: menos pedidos perdidos y reembolsos, a cambio de un costo mensual.",
  "D-63":
    "El mantenimiento preventivo cuesta más que el correctivo, pero reduce las averías y las fallas de refrigeración: mejor OTD y menos Spoilage.",
};

export const LABELS: LabelMap = {
  "F-01": { help: "Se captura en enero de cada año con los datos observados hasta ese momento." },
  "D-01": {
    help: "Surtido desde el CD. Para apagarlo necesitas otro nodo que ya esté operando.",
    fields: { active: "Activo", capacity: "Capacidad de picking" },
    options: { low: "2,000 pedidos/día", mid: "3,500 pedidos/día", high: "5,000 pedidos/día" },
  },
  "D-02": { help: "Las tiendas surten pedidos de su zona: menos troncal, más costo de picking y riesgo para el anaquel. Opera el mes siguiente.", fields: { share: "Tiendas que surten", pickers: "Surtidores por tienda" }, format: "pct", step: 0.05 },
  "D-03": { help: "El cliente recoge en tienda: sin ruta ni primer intento fallido. Opera el mes siguiente." },
  "D-04": { help: "Cada dark store surte su zona y una vecina. Tarda 3 meses; capex de US$ 600 mil.", unit: "dark stores" },
  "D-05": { help: "Cada MFC automatizado surte su zona y tres vecinas. Tarda 6 meses; capex de US$ 4 M.", unit: "MFC" },
  "D-06": { help: "Puntos de entrega desatendidos: una parada recibe muchos pedidos. Opera el mes siguiente.", unit: "lockers" },
  "D-07": { help: "Cross-dock cerca de las zonas lejanas: consolida la troncal. Tarda 2 meses.", unit: "hubs" },
  "D-10": { help: "«Más cercano» ignora la capacidad: si el nodo se llena, el resto se atrasa. El umbral dinámico reparte." },
  "D-11": { options: { "5": "5 min", "15": "15 min", "60": "60 min", "240": "240 min" }, help: "Lotes más cortos: ciclo más rápido, asignación un poco más cara." },
  "D-12": { help: "Tope de horas de piso para picking en línea. Si se excede, cae la disponibilidad en anaquel.", format: "pct", step: 0.05 },
  "D-20": { help: "Más niveles fragmentan las rutas. El express exige un nodo en la zona.", fields: { express: "Express (< 2 h)", sameday: "Mismo día", nextday: "Día siguiente", standard: "Estándar (2–4 días)" } },
  "D-21": { help: "Ventanas más angostas: más clientes en casa, menos paradas por ruta y menos puntualidad." },
  "D-22": { options: { "12": "12:00", "14": "14:00", "16": "16:00" }, help: "Un corte tardío capta más pedidos del mismo día y carga la tarde." },
  "D-23": { help: "Prometer con holgura: más puntualidad y algo menos de demanda. En picos, promete un día más.", format: "pct", step: 0.05 },
  "D-24": { help: "Segmentar por zona agrupa niveles y reduce la fragmentación de rutas." },
  "D-25": { help: "Tarifa más alta: menos pedidos; umbral de envío gratis: canastas más grandes.", fields: { fee: "Tarifa (US$)", freeThreshold: "Envío gratis desde (US$)" }, step: 0.5 },
  "D-26": { options: { none: "Sin tope", "100": "Tope = capacidad", "110": "Tope = capacidad + 10%" }, help: "Publicar capacidad por ventana: rechazas pedidos en picos en lugar de atrasarlos." },
  "D-30": { help: "La propia es costo fijo; el 3PL cobra margen; crowdsourced cobra por entrega y puede no llegar." },
  "D-31": { help: "Eléctricas: energía barata y sin restricción ambiental, con autonomía limitada. Motos y bicis solo desde nodos en la zona." },
  "D-32": { help: "El frío reduce el spoilage de frescos." },
  "D-33": { help: "Tamaño de la flota propia frente a la necesidad del mes anterior." },
  "D-34": { fields: { two: "Dos turnos", weekends: "Fines de semana" } },
  "D-35": { help: "Pago por parada: más paradas por hora y más intentos en falso y accidentes." },
  "D-36": { help: "Flota extra en meses pico. El contrato anticipado se firma un mes antes; el spot es caro y poco confiable." },
  "D-40": { help: "Hay un número óptimo de zonas: pocas son enormes, muchas fragmentan.", unit: "zonas" },
  "D-41": { help: "Cómo se trazan las zonas: las balanceadas y con capacidad reparten mejor la carga; la dinámica necesita datos maduros." },
  "D-42": { help: "Re-zonificar seguido sin datos maduros quita familiaridad a los choferes." },
  "D-43": { help: "La IA con datos básicos rinde ~30% de su potencial." },
  "D-44": { help: "El tiempo según la hora requiere telemetría + tráfico." },
  "D-45": { help: "Cargar los frescos al final para entregarlos primero: menos tiempo fuera del frío." },
  "D-50": {},
  "D-51": {},
  "D-52": { help: "Desviar requiere lockers o recoger en tienda." },
  "D-53": { help: "Quitar el pago contra entrega reduce rechazos, pero pierdes pedidos (más en Norte)." },
  "D-55": { options: { store: "En tienda" }, help: "Devolver en locker requiere lockers." },
  "D-56": {},
  "D-60": { options: { basic: "Básicos", gps: "Telemetría GPS", full: "Telemetría + tráfico" }, help: "Cuesta por vehículo y tarda en implantarse (1–2 meses)." },
  "D-61": { options: { mean: "Promedio del mes", daily: "Serie diaria", p95: "p95 (días críticos)" }, help: "Solo cambia lo que ves en el dashboard; el puntaje usa siempre p95." },
  "D-62": { options: { none: "Ninguna", gps: "GPS", full: "GPS + botón de pánico + horarios variables" } },
  "D-63": {},
};
for (const [id, impact] of Object.entries(IMPACT)) LABELS[id] = { ...LABELS[id], impact };

const P95_NOTE = " (5% de los peores días)";

export const KPI_META: KpiMeta[] = [
  { id: "OTD", acronym: "OTD", name: "Entregas a tiempo", formula: "Entregas dentro de la ventana prometida / entregas", format: "pct", higherIsBetter: true },
  { id: "FADS", acronym: "FADS", name: "Entrega al primer intento", formula: "Entregas exitosas al primer intento / intentos", format: "pct", higherIsBetter: true },
  { id: "CPD", acronym: "CPD", name: "Costo por entrega", formula: "Costo de última milla / entregas exitosas (US$)", format: "num2", higherIsBetter: false },
  { id: "CYCLE_HOURS", acronym: "Order Cycle Time", name: "Tiempo de ciclo del pedido", formula: "Horas promedio de la compra a la entrega", format: "num1", higherIsBetter: false },
  { id: "CSAT", acronym: "CSAT", name: "Satisfacción del cliente", formula: "Calificación promedio (1–5)", format: "num2", higherIsBetter: true },
  { id: "SPOIL_RATE", acronym: "Spoilage", name: "Frescos dañados", formula: "Pedidos frescos que llegan tibios / pedidos frescos", format: "pct", higherIsBetter: false },
  { id: "VEHICLE_UTIL", acronym: "Vehicle Util.", name: "Utilización de vehículo", formula: "Paradas / capacidad de los vehículos en ruta", format: "pct", higherIsBetter: true },
  { id: "MARGIN_PCT", acronym: "Margen", name: "Margen del canal en línea", formula: "(Margen de canasta + tarifas − costo de última milla − reembolsos) / ventas", format: "pct", higherIsBetter: true },
  { id: "BACKLOG", acronym: "Backlog", name: "Pedidos que pasan al día siguiente", formula: "Pedidos no entregados / carga del día", format: "pct", higherIsBetter: false },
  { id: "EXCEPTION_RATE", acronym: "Exceptions", name: "Tasa de excepciones", formula: "Fallas, daños, spoilage y robos / entregas", format: "pct", higherIsBetter: false },
  { id: "OTIF", acronym: "OTIF", name: "A tiempo y completo", formula: "OTD × pedidos completos", format: "pct", higherIsBetter: true },
  { id: "PERFECT", acronym: "Perfect Order", name: "Orden perfecta", formula: "A tiempo × completa × sin daño × documentos correctos", format: "pct", higherIsBetter: true },
  { id: "ETA_ACC", acronym: "ETA accuracy", name: "Precisión del ETA", formula: "1 − error del ETA / ancho de la ventana", format: "pct", higherIsBetter: true },
  { id: "STOPS_ROUTE", acronym: "Stops/route", name: "Paradas por ruta", formula: "Paradas / rutas", format: "num1", higherIsBetter: true },
  { id: "ROUTE_EFF", acronym: "Route Efficiency", name: "Eficiencia de ruta", formula: "km del mejor diseño posible / km reales", format: "pct", higherIsBetter: true },
  { id: "NODE_UTIL", acronym: "Node Util.", name: "Utilización máxima de nodo", formula: "Pedidos surtidos / capacidad de picking (nodo más cargado)", format: "pct", higherIsBetter: false },
  { id: "STORE_OSA", acronym: "OSA tienda", name: "Disponibilidad en anaquel de tiendas SFS", formula: "Baja si el picking en línea excede el tope", format: "pct", higherIsBetter: true },
  { id: "EMPTY_MILES", acronym: "Empty Miles", name: "Kilómetros en vacío", formula: "km sin carga / km totales", format: "pct", higherIsBetter: false },
  { id: "CO2", acronym: "CO₂", name: "Emisiones por entrega", formula: "kg de CO₂ / entrega", format: "num2", higherIsBetter: false },
  { id: "SHIP_PCT", acronym: "Costo/ventas", name: "Costo de última milla / ventas", formula: "Costo de última milla / ventas en línea", format: "pct", higherIsBetter: false },
  { id: "ORDERS", acronym: "Pedidos", name: "Pedidos del mes", formula: "Pedidos capturados", format: "num0", higherIsBetter: true },
  { id: "OTD_P95", acronym: "OTD p95", name: `Entregas a tiempo${P95_NOTE}`, formula: "Percentil 5 del OTD diario", format: "pct", higherIsBetter: true },
  { id: "FADS_P95", acronym: "FADS p95", name: `Primer intento${P95_NOTE}`, formula: "Percentil 5 del FADS diario", format: "pct", higherIsBetter: true },
  { id: "CPD_P95", acronym: "CPD p95", name: `Costo por entrega${P95_NOTE}`, formula: "Percentil 95 del CPD diario (US$)", format: "num2", higherIsBetter: false },
  { id: "CSAT_P95", acronym: "CSAT p95", name: `Satisfacción${P95_NOTE}`, formula: "Percentil 5 de la CSAT diaria", format: "num2", higherIsBetter: true },
];

/** KPI con los guardrails del territorio (§7.2 y normalización por territorio). */
export function kpiMetaFor(territory: PlayableTerritory): KpiMeta[] {
  const local = (params.score.territories as Record<string, { guardrails?: { kpi: string; op: string; value: number }[] }>)[territory]?.guardrails;
  const gr = local ?? params.score.guardrails;
  return KPI_META.map((m) => {
    const g = gr.find((x) => x.kpi === m.id);
    return g ? { ...m, guardrail: { op: g.op as ">=" | "<=", value: g.value } } : m;
  });
}

/** Con D-61 en p95, las tarjetas principales muestran la versión de días críticos. */
export const P95_OF: Record<string, string> = { OTD: "OTD_P95", FADS: "FADS_P95", CPD: "CPD_P95", CSAT: "CSAT_P95" };

export const KPI_NAMES: Record<string, string> = {
  ...Object.fromEntries(KPI_META.map((m) => [m.id, m.acronym])),
  DELIVERED: "Entregas",
  REVENUE: "Ventas",
  MARGIN: "Margen (US$)",
  CPD_URBAN: "CPD urbano",
  CPD_REMOTE: "CPD foráneo",
  CPD_RURAL: "CPD rural",
  RETURN_COST: "Costo por devolución",
  REJECTED: "Pedidos rechazados",
  CANCELLED: "Pedidos cancelados",
  FLEET_SHORT: "Flota faltante",
  OWN_FLEET: "Flota propia",
  DARK_STORES: "Dark stores",
  MFC_COUNT: "MFC",
  LOCKERS: "Lockers",
  SFS_SHARE: "% SFS",
  LINEHAUL_KM: "km de troncal por pedido",
  FRESH_ROUTE_HOURS: "Horas de ruta con frescos",
  STOPS_HOUR: "Paradas por hora",
  STOPS_RURAL: "Paradas por ruta rural",
  NPS: "NPS",
  PEAK_DAYS: "Días pico",
  MARKET: "Demanda del mercado",
  GROSS_MARGIN: "Margen de la canasta (US$)",
  FEES: "Tarifas de envío (US$)",
  LAST_MILE_COST: "Costo de última milla (US$)",
  REFUNDS: "Reembolsos (US$)",
  LATE_ORDERS: "Entregas tarde",
  LATE_COST: "Compensaciones por retraso (US$)",
  PROFIT_OP: "Utilidad operativa (US$)",
  CAPEX: "Inversión del mes (US$)",
  PROFIT: "Utilidad (US$)",
  SERVICE_PENALTY: "Penalizaciones por servicio (US$)",
  SERVICE_BREACHES: "Guardrails de servicio rotos",
  FC_SCORE: "Puntaje del pronóstico",
  FC_TOTAL: "Pronóstico (pedidos)",
  FC_WAPE: "WAPE del pronóstico",
  FC_BIAS: "Sesgo del pronóstico",
  FC_ABS: "Error absoluto del pronóstico",
  FC_ORACLE: "Error del ruido (piso)",
  FC_EXCEED: "Días sobre el p95 pronosticado",
  FC_DAYS: "Días evaluados",
  FC_CVACC: "Exactitud del CV",
  IDLE_COST: "Capacidad contratada ociosa (US$)",
};

export const STRATEGY_TEXT: Record<Strategy, string> = {
  speed: "Pesa más el tiempo de ciclo y la satisfacción del cliente.",
  reliability: "Pesa más la puntualidad en los peores días (OTD p95) y la satisfacción.",
  efficiency: "Pesa más el costo por entrega en los peores días (CPD p95).",
};

export const TERRITORY_TEXT: Record<PlayableTerritory, { title: string; tagline: string; facts: string[] }> = {
  megalopolis: {
    title: "Megalópolis Centro",
    tagline: "Urbano denso con tráfico severo y competencia de quick commerce.",
    facts: ["45 tiendas, CD periférico a 25–40 km", "Tráfico lento (~15 km/h) y muy variable", "Clientes fuera de casa de día; edificios y cotos", "Lluvias e inundaciones (jun–sep); no circula los días de contingencia"],
  },
  bajio: {
    title: "Ciudad Bajío",
    tagline: "Ciudad media ordenada: direcciones de calidad y tráfico moderado.",
    facts: ["15 tiendas, CD a 10–15 km", "Tráfico medio (~30 km/h)", "Fraccionamientos con caseta; presencia media", "Marketplaces como competencia"],
  },
  norte: {
    title: "Región Norte",
    tagline: "Ciudad principal + 4 ciudades lejanas + zona rural, con calor extremo.",
    facts: ["60% de la demanda en la ciudad principal", "Ciudades a 80–250 km; zona rural dispersa", "30% de pedidos con pago contra entrega", "Calor extremo (may–ago); pocos repartidores crowdsourced"],
  },
};

/** Nombre del escenario de mercado de una corrida, o «Escenario propio». */
export const scenarioLabel = (scenario: unknown) => {
  const p = presetOf(scenario as Parameters<typeof presetOf>[0]);
  return p?.title ?? "Escenario propio";
};

export const MARKET_FIELDS: { key: string; label: string; options: Record<string, string> }[] = [
  { key: "growth", label: "Crecimiento del canal en línea", options: { slow: "Lento (+10%/año)", medium: "Medio (+25%/año)", explosive: "Explosivo (+50%/año)" } },
  { key: "speedSensitivity", label: "Sensibilidad a la velocidad", options: { low: "Baja", mid: "Media", high: "Alta" } },
  { key: "feeSensitivity", label: "Sensibilidad a la tarifa de envío", options: { low: "Baja", mid: "Media", high: "Alta" } },
  { key: "freshMix", label: "Mezcla de frescos", options: { low: "Baja", mid: "Media", high: "Alta" } },
  { key: "fuel", label: "Gasolina", options: { stable: "Estable", volatile: "Volátil" } },
  { key: "labor", label: "Mercado de choferes", options: { loose: "Holgado", tight: "Escaso" } },
  { key: "returns", label: "Devoluciones", options: { low: "Bajas (abarrotes)", mid: "Medias (mercancía general)", fashion: "Altas (moda)" } },
];

export const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** Texto breve de un valor de decisión (para el diálogo de confirmación). */
export function describeValue(id: string, v: unknown): string {
  const local = LABELS[id]?.options ?? {};
  const opt = (x: unknown) => local[String(x)] ?? OPTIONS[String(x)] ?? String(x);
  if (id === "F-01" && v && typeof v === "object") {
    const f = v as { year: number; level: number; growth: number; quincena: number; peaks: Record<string, number>; cv: number; p95: number };
    return `A${f.year + 1}: nivel ${Math.round(f.level).toLocaleString("es-MX")}/día, crecimiento ${(f.growth * 100).toFixed(1)}%, quincena ×${f.quincena.toFixed(2)}, picos ${Object.values(f.peaks).map((x) => `×${x.toFixed(2)}`).join("/")}, CV ${(f.cv * 100).toFixed(1)}%, p95 ${Math.round(f.p95).toLocaleString("es-MX")}`;
  }
  if ((id === "D-12" || id === "D-23") && typeof v === "number") return `${(v * 100).toFixed(0)}%`;
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : v.toFixed(2);
  if (typeof v === "string") return opt(v);
  if (typeof v === "boolean") return v ? "Sí" : "No";
  if (v && typeof v === "object") {
    const f = LABELS[id]?.fields ?? {};
    if (id === "D-20")
      return (
        Object.entries(v as Record<string, boolean>)
          .filter(([, on]) => on)
          .map(([k]) => f[k] ?? k)
          .join(", ") || "ninguno"
      );
    return Object.entries(v as Record<string, unknown>)
      .map(([k, x]) => `${f[k] ?? k}: ${id === "D-02" && k === "share" && typeof x === "number" ? `${(x * 100).toFixed(0)}%` : typeof x === "number" ? (Number.isInteger(x) ? String(x) : x.toFixed(2)) : typeof x === "boolean" ? (x ? "Sí" : "No") : opt(x)}`)
      .join(", ");
  }
  return String(v);
}

/** Nombre legible de reglas y eventos para la explicación causal (el jugador no ve los códigos internos). */
const RULE_EVENT_NAMES: Record<string, string> = {
  "R-01": "Ruta larga con frescos sin equipo de frío",
  "R-02": "Frescos dañados por encima del umbral",
  "R-03": "Ventana «todo el día» con baja presencia en casa",
  "R-04": "Express con densidad baja",
  "R-05": "Surtido en tienda sobre el tope de horas",
  "R-06": "Promesa sin margen en un pico",
  "R-07": "Re-zonificación diaria sin datos maduros",
  "R-08": "Ruteo con IA y datos básicos",
  "R-09": "Pago por parada",
  "R-10": "Flota crowdsourced en pico con choferes escasos",
  "R-11": "Backhaul de devoluciones",
  "R-12": "Reporte con promedio",
  "R-13": "Restricción ambiental con flota de combustión",
  "R-14": "Lockers en zonas con baja presencia en casa",
  "X-01": "Falla de cadena de frío",
  "X-02": "Inundación o lluvia torrencial",
  "X-03": "Bloqueo o manifestación",
  "X-04": "Contingencia ambiental",
  "X-05": "Pico viral o campaña sorpresa",
  "X-06": "Ausentismo de choferes",
  "X-07": "Plataforma crowdsourced sin capacidad",
  "X-08": "Robo de mercancía en ruta",
  "X-09": "Accidente vial",
  "X-10": "Caída del sistema de ruteo",
  "X-11": "Competidor con entrega en 15–30 min",
  "X-12": "Ola de calor",
  "X-13": "Errores de geocodificación",
  "X-14": "Cierre temporal de una tienda-nodo",
  "X-15": "Alza de gasolina",
};

/** Nombre de cada causa (decisión, regla o evento) por su código interno. */
export const CAUSE_NAMES: Record<string, string> = {
  ...RULE_EVENT_NAMES,
  ...Object.fromEntries(decisions.map((d) => [d.id, d.label])),
};
