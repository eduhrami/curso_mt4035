# Reporte de coherencia — mt4035-lastmile

Generado: 2026-10-14T05:21:57.084Z · 6600 corridas (200 semillas × 11 bots × 3 escenarios) · 290 ms/corrida

## Alarmas de calibración

- Ninguna alarma P1.

## Propiedades

| | ID | Prioridad | Propiedad | Detalle |
|---|---|---|---|---|
| ✅ | LOG-AUT-01 | P1 | Robustez: sin errores, sin NaN e invariantes al 100% | 600 corridas de BOT-F; 0 corridas con problemas en total |
| ✅ | LOG-AUT-02 | P1 | Segmentar gana: en Megalópolis, BOT-C > BOT-A bajo las tres estrategias (≥ 80%) | megalopolis/speed 100%, megalopolis/reliability 100%, megalopolis/efficiency 100% |
| ✅ | LOG-AUT-03 | P1 | Velocidad no lo es todo: BOT-B tiene el mejor tiempo de ciclo, nunca el mejor puntaje bajo eficiencia y bajo confiabilidad ≤ 10% | B es el más rápido y no gana bajo eficiencia ni confiabilidad |
| ✅ | LOG-AUT-04 | P1 | Geografía importa: en Norte, BOT-E queda entre los 2 peores de A–E bajo eficiencia y confiabilidad (≥ 80%) | norte/efficiency 100%, norte/reliability 100% |
| ✅ | LOG-AUT-05 | P2 | Eficiencia coherente: BOT-D tiene el mejor CPD de A–E en Megalópolis y Bajío (≥ 80%) | megalopolis 100%, bajio 100% |
| ✅ | LOG-AUT-06 | P1 | Se aprende entre ciclos: BOT-H mejora el OTD p95 de nov–dic del año 1 al 2 (≥ 90%) y el año 3 ≥ año 2 | bajio 100% (año 2 0.996, año 3 0.995), megalopolis 100% (año 2 0.976, año 3 0.995), norte 100% (año 2 0.998, año 3 0.997) |
| ✅ | LOG-AUT-07 | P2 | Ningún extremo domina: ≥ 3 óptimos distintos y ninguno es óptimo en todas las combinaciones | 7 óptimos distintos en 9 combinaciones (máx. repetido 2) |
| ✅ | LOG-AUT-08 | P2 | Óptimos interiores: n.º de zonas, ventana, holgura y % SFS no en los extremos en ≥ 7 de 9 combinaciones | 9/9 interiores |
| ✅ | LOG-AUT-09 | P2 | Urbano ≠ rural: el óptimo de Norte consolida más (lockers, micro-hubs, ventanas amplias) que el de Megalópolis | speed: Norte 1.50 vs Megalópolis 0.58, reliability: Norte 1.50 vs Megalópolis 0.58, efficiency: Norte 1.50 vs Megalópolis 0.92 |
| ✅ | LOG-AUT-10 | P1 | Habilidad > suerte: CV de BOT-A < 15% y, en Megalópolis, media(C − A) > 2σ(A) | speed C−A=7.4 vs 2σ=3.0, reliability C−A=6.4 vs 2σ=3.7, efficiency C−A=7.3 vs 2σ=2.9 |
| ✅ | LOG-AUT-11 | P2 | Los picos son el examen: para BOT-A, ≥ 50% de los meses con guardrail violado son meses pico | bajio 99% de 2272, megalopolis 92% de 2374, norte 100% de 2019 |
| ✅ | LOG-AUT-12 | P2 | Medir importa: en Megalópolis, BOT-A tiene OTD promedio − OTD p95 ≥ 8 pp | diferencia media 8.6 pp |
| ✅ | LOG-AUT-13 | P2 | La IA necesita datos: segmentado con IA y datos básicos < segmentado con VRPTW y datos completos (≥ 80%) | bajio/speed 100%, bajio/reliability 100%, bajio/efficiency 100%, megalopolis/speed 100%, megalopolis/reliability 100%, megalopolis/efficiency 100%, norte/speed 100%, norte/reliability 100%, norte/efficiency 100% |
| ✅ | LOG-AUT-14 | P3 | Estabilidad del reactivo: KPIs en rango y sin costos explosivos | CPD máximo USD 11.99 en 600 corridas |
| ✅ | LOG-AUT-16 | P1 | Explicabilidad: ≥ 95% de los cambios de KPI > 10% tienen causa registrada | cobertura 99.2% sobre 829151 cambios relevantes |
| ✅ | LOG-AUT-17 | P1 | Pronosticar paga: BOT-A (pronóstico perfecto) > BOT-L (pronóstico nominal) bajo las tres estrategias (≥ 80%) | bajio/speed 100%, bajio/reliability 100%, bajio/efficiency 100%, megalopolis/speed 100%, megalopolis/reliability 100%, megalopolis/efficiency 100%, norte/speed 100%, norte/reliability 100%, norte/efficiency 100% |

## Puntaje por bot (media · p5 · p95)

### bajio

| Bot | speed | reliability | efficiency |
|---|---|---|---|
| A | 65.7 · 63.9 · 67.7 | 66.4 · 64.1 · 69.1 | 65.8 · 63.7 · 68.1 |
| B | 64.3 · 61.2 · 67.5 | 53.8 · 48.9 · 58.2 | 49.3 · 46.5 · 52.0 |
| C | 72.4 · 70.2 · 75.1 | 73.4 · 70.3 · 77.3 | 72.2 · 69.7 · 74.7 |
| D | 71.3 · 69.6 · 73.4 | 72.8 · 70.6 · 75.6 | 71.8 · 69.7 · 74.1 |
| E | 48.3 · 46.2 · 50.1 | 40.5 · 38.0 · 42.9 | 41.0 · 37.8 · 44.1 |
| F | 62.8 · 53.8 · 71.1 | 65.0 · 54.5 · 73.3 | 53.3 · 45.0 · 60.5 |
| G | 69.6 · 67.5 · 71.9 | 71.8 · 69.0 · 74.9 | 67.4 · 65.4 · 69.6 |
| H | 71.8 · 70.7 · 73.1 | 74.4 · 72.9 · 76.1 | 71.2 · 69.5 · 73.1 |
| J | 73.2 · 70.9 · 75.8 | 74.3 · 71.1 · 78.1 | 72.9 · 70.6 · 75.4 |
| K | 73.5 · 71.2 · 76.2 | 74.8 · 71.5 · 78.6 | 73.2 · 70.8 · 75.7 |
| L | 57.1 · 52.5 · 60.4 | 57.7 · 52.7 · 61.4 | 56.9 · 52.6 · 60.4 |

### megalopolis

| Bot | speed | reliability | efficiency |
|---|---|---|---|
| A | 56.2 · 54.0 · 58.7 | 57.9 · 55.1 · 61.0 | 59.1 · 56.9 · 61.4 |
| B | 41.8 · 38.6 · 44.8 | 31.0 · 29.6 · 33.5 | 41.6 · 39.1 · 44.0 |
| C | 63.6 · 60.7 · 66.9 | 64.3 · 60.4 · 68.6 | 66.4 · 63.9 · 69.4 |
| D | 62.2 · 60.1 · 64.3 | 64.3 · 61.6 · 67.1 | 65.8 · 63.8 · 68.0 |
| E | 29.8 · 29.6 · 29.9 | 29.8 · 29.6 · 29.9 | 29.8 · 29.6 · 29.9 |
| F | 60.8 · 47.2 · 71.9 | 62.1 · 46.5 · 75.2 | 58.2 · 42.3 · 72.0 |
| G | 59.1 · 55.6 · 62.4 | 61.4 · 57.1 · 65.6 | 62.0 · 58.6 · 65.1 |
| H | 63.0 · 61.9 · 64.3 | 66.5 · 65.1 · 68.0 | 65.2 · 63.8 · 66.6 |
| J | 65.3 · 62.2 · 68.8 | 66.4 · 62.3 · 71.0 | 68.0 · 65.1 · 71.0 |
| K | 66.5 · 63.3 · 69.8 | 67.9 · 63.6 · 72.5 | 68.9 · 66.1 · 72.0 |
| L | 47.5 · 42.2 · 51.6 | 49.1 · 42.8 · 54.0 | 50.2 · 45.2 · 54.2 |

### norte

| Bot | speed | reliability | efficiency |
|---|---|---|---|
| A | 57.7 · 55.0 · 60.8 | 61.8 · 58.5 · 65.8 | 59.4 · 56.3 · 62.7 |
| B | 29.8 · 29.6 · 29.9 | 29.8 · 29.6 · 29.9 | 29.8 · 29.6 · 29.9 |
| C | 72.6 · 70.6 · 75.0 | 77.8 · 75.3 · 80.8 | 77.2 · 75.3 · 79.5 |
| D | 61.7 · 58.9 · 64.8 | 66.5 · 63.2 · 70.1 | 62.9 · 59.8 · 65.9 |
| E | 32.3 · 30.6 · 33.9 | 29.8 · 29.6 · 30.0 | 29.8 · 29.6 · 29.9 |
| F | 53.5 · 43.0 · 63.7 | 55.9 · 42.8 · 68.1 | 45.9 · 35.8 · 54.4 |
| G | 64.5 · 63.3 · 65.5 | 70.7 · 69.2 · 72.0 | 66.0 · 64.2 · 67.6 |
| H | 63.1 · 61.4 · 64.9 | 69.0 · 67.1 · 71.1 | 64.1 · 61.6 · 66.6 |
| J | 73.3 · 71.4 · 75.7 | 78.6 · 76.3 · 81.6 | 78.1 · 76.2 · 80.4 |
| K | 73.9 · 71.9 · 76.2 | 79.2 · 76.8 · 82.2 | 78.8 · 76.8 · 81.1 |
| L | 49.1 · 44.3 · 53.0 | 53.2 · 47.9 · 58.0 | 50.5 · 46.3 · 54.5 |

## Explicabilidad

Cobertura media 99.2% · mínima por corrida 90.0%

KPIs con más cambios sin causa registrada:

- OTD_P95: 4696
- CYCLE_HOURS: 611
- OTD: 287
- SPOIL_RATE: 276
- EXCEPTION_RATE: 194
- CSAT: 15
- FADS: 1

## Óptimos del bot buscador

| Escenario | Estrategia | Puntaje | En extremo | zones | window | buffer | sfsShare | levels | assignment | fleetMix | vehicle | cold | routing | data | costFn | eta | address | lockersPer1000 | hubs | darkStores | mfc | cod | slotting | peakContract | pay | zoning | segmentation | loadSeq |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| megalopolis | speed | 91.8 | — | 12 | 2h | 0.1 | 0 | sameday_nextday | threshold | crowd | moto | reefer | vrptw | basic | avgtime | live | geocode | 5 | 0 | 1 | 1 | remove | 100 | spot | fixed | capacitated | zone | fresh_first |
| megalopolis | reliability | 95.6 | — | 12 | 2h | 0.05 | 0 | sameday_nextday | threshold | own_crowd | van | coolers | ai | full | timedep | live | geocode | 5 | 0 | 0 | 1 | remove | 100 | spot | fixed | dynamic | zone | fresh_first |
| megalopolis | efficiency | 92.5 | — | 12 | 4h | 0 | 0 | sameday_nextday | ai | own_crowd | van | coolers | vrptw | basic | avgtime | live | geocode | 5 | 0 | 0 | 1 | remove | 110 | spot | fixed | capacitated | zone | fresh_first |
| bajio | speed | 91.4 | — | 6 | 4h | 0 | 0 | sameday_nextday | threshold | 3pl | van | coolers | vrptw | basic | avgtime | sms | geocode | 10 | 0 | 0 | 0 | remove | 100 | spot | fixed | capacitated | zone | fresh_first |
| bajio | reliability | 94.0 | — | 6 | 4h | 0 | 0 | sameday_nextday | threshold | 3pl | van | coolers | vrptw | basic | avgtime | sms | geocode | 10 | 0 | 0 | 0 | remove | 100 | spot | fixed | capacitated | zone | fresh_first |
| bajio | efficiency | 88.2 | — | 6 | 4h | 0 | 0 | sameday_nextday | threshold | 3pl | van | none | vrptw | basic | avgtime | sms | geocode | 10 | 0 | 0 | 0 | remove | 100 | spot | fixed | capacitated | zone | fresh_first |
| norte | speed | 92.6 | — | 4 | day | 0 | 0.75 | sameday_nextday | lowest | 3pl | van | coolers | vrptw | basic | avgtime | live | geocode | 10 | 0 | 0 | 0 | remove | none | advance | mixed | capacitated | zone | fresh_first |
| norte | reliability | 96.6 | — | 4 | day | 0 | 0.75 | sameday_nextday | lowest | 3pl | van | coolers | vrptw | basic | avgtime | live | geocode | 10 | 0 | 0 | 0 | remove | none | advance | mixed | capacitated | zone | fresh_first |
| norte | efficiency | 94.9 | — | 4 | day | 0 | 0.75 | sameday_nextday | lowest | 3pl | van | none | vrptw | basic | avgtime | live | geocode | 10 | 0 | 0 | 0 | remove | none | advance | mixed | capacitated | zone | fresh_first |
