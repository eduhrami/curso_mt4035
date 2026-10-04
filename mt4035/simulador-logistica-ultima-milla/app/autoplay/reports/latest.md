# Reporte de coherencia — mt4035-lastmile

Generado: 2026-10-04T20:26:57.221Z · 6000 corridas (200 semillas × 10 bots × 3 escenarios) · 253 ms/corrida

## Alarmas de calibración

- Ninguna alarma P1.

## Propiedades

| | ID | Prioridad | Propiedad | Detalle |
|---|---|---|---|---|
| ✅ | LOG-AUT-01 | P1 | Robustez: sin errores, sin NaN e invariantes al 100% | 600 corridas de BOT-F; 0 corridas con problemas en total |
| ✅ | LOG-AUT-02 | P1 | Segmentar gana: en Megalópolis, BOT-C > BOT-A bajo las tres estrategias (≥ 80%) | megalopolis/speed 100%, megalopolis/reliability 99%, megalopolis/efficiency 100% |
| ✅ | LOG-AUT-03 | P1 | Velocidad no lo es todo: BOT-B tiene el mejor tiempo de ciclo, nunca el mejor puntaje bajo eficiencia y bajo confiabilidad ≤ 10% | B es el más rápido y no gana bajo eficiencia ni confiabilidad |
| ✅ | LOG-AUT-04 | P1 | Geografía importa: en Norte, BOT-E queda entre los 2 peores de A–E bajo eficiencia y confiabilidad (≥ 80%) | norte/efficiency 100%, norte/reliability 100% |
| ✅ | LOG-AUT-05 | P2 | Eficiencia coherente: BOT-D tiene el mejor CPD de A–E en Megalópolis y Bajío (≥ 80%) | megalopolis 100%, bajio 100% |
| ✅ | LOG-AUT-06 | P1 | Se aprende entre ciclos: BOT-H mejora el OTD p95 de nov–dic del año 1 al 2 (≥ 90%) y el año 3 ≥ año 2 | bajio 100% (año 2 0.974, año 3 0.974), megalopolis 100% (año 2 0.977, año 3 0.973), norte 100% (año 2 0.988, año 3 0.986) |
| ✅ | LOG-AUT-07 | P2 | Ningún extremo domina: ≥ 3 óptimos distintos y ninguno es óptimo en todas las combinaciones | 7 óptimos distintos en 9 combinaciones (máx. repetido 2) |
| ✅ | LOG-AUT-08 | P2 | Óptimos interiores: n.º de zonas, ventana, holgura y % SFS no en los extremos en ≥ 7 de 9 combinaciones | 9/9 interiores |
| ✅ | LOG-AUT-09 | P2 | Urbano ≠ rural: el óptimo de Norte consolida más (lockers, micro-hubs, ventanas amplias) que el de Megalópolis | speed: Norte 1.50 vs Megalópolis 0.58, reliability: Norte 1.50 vs Megalópolis 0.58, efficiency: Norte 1.50 vs Megalópolis 0.58 |
| ✅ | LOG-AUT-10 | P1 | Habilidad > suerte: CV de BOT-A < 15% y, en Megalópolis, media(C − A) > 2σ(A) | speed C−A=8.2 vs 2σ=3.1, reliability C−A=5.3 vs 2σ=3.9, efficiency C−A=9.2 vs 2σ=2.9 |
| ✅ | LOG-AUT-11 | P2 | Los picos son el examen: para BOT-A, ≥ 50% de los meses con guardrail violado son meses pico | bajio 79% de 2849, megalopolis 80% de 2814, norte 90% de 2301 |
| ✅ | LOG-AUT-12 | P2 | Medir importa: en Megalópolis, BOT-A tiene OTD promedio − OTD p95 ≥ 10 pp | diferencia media 11.0 pp |
| ✅ | LOG-AUT-13 | P2 | La IA necesita datos: segmentado con IA y datos básicos < segmentado con VRPTW y datos completos (≥ 80%) | bajio/speed 100%, bajio/reliability 100%, bajio/efficiency 100%, megalopolis/speed 100%, megalopolis/reliability 100%, megalopolis/efficiency 100%, norte/speed 100%, norte/reliability 100%, norte/efficiency 100% |
| ✅ | LOG-AUT-14 | P3 | Estabilidad del reactivo: KPIs en rango y sin costos explosivos | CPD máximo USD 10.62 en 600 corridas |
| ✅ | LOG-AUT-16 | P1 | Explicabilidad: ≥ 95% de los cambios de KPI > 10% tienen causa registrada | cobertura 98.3% sobre 723845 cambios relevantes |

## Puntaje por bot (media · p5 · p95)

### bajio

| Bot | speed | reliability | efficiency |
|---|---|---|---|
| A | 49.3 · 47.1 · 51.8 | 49.3 · 46.6 · 52.6 | 54.4 · 52.4 · 56.7 |
| B | 49.4 · 45.7 · 52.5 | 34.2 · 29.0 · 39.0 | 28.1 · 24.9 · 30.9 |
| C | 54.8 · 51.4 · 58.6 | 53.5 · 49.2 · 58.5 | 59.8 · 57.0 · 63.0 |
| D | 57.3 · 54.9 · 59.9 | 58.4 · 55.3 · 61.7 | 62.7 · 60.5 · 65.0 |
| E | 22.7 · 21.2 · 24.7 | 11.5 · 9.5 · 14.0 | 20.4 · 18.9 · 22.1 |
| F | 47.2 · 32.9 · 59.1 | 49.3 · 33.9 · 62.8 | 34.2 · 21.8 · 45.1 |
| G | 57.3 · 54.4 · 60.5 | 60.4 · 56.2 · 64.9 | 55.1 · 52.3 · 58.1 |
| H | 58.7 · 56.8 · 60.8 | 61.7 · 59.2 · 64.3 | 62.9 · 61.2 · 64.8 |
| J | 55.6 · 52.1 · 59.4 | 54.6 · 50.2 · 59.7 | 60.6 · 57.7 · 63.9 |
| K | 56.0 · 52.4 · 59.8 | 55.0 · 50.5 · 60.2 | 60.8 · 57.8 · 64.2 |

### megalopolis

| Bot | speed | reliability | efficiency |
|---|---|---|---|
| A | 36.6 · 34.2 · 39.5 | 38.1 · 34.9 · 41.6 | 43.0 · 40.6 · 45.6 |
| B | 22.2 · 17.2 · 25.5 | 6.1 · 1.1 · 9.2 | 21.5 · 17.7 · 23.9 |
| C | 44.8 · 41.0 · 48.6 | 43.4 · 38.2 · 48.4 | 52.2 · 48.8 · 55.7 |
| D | 45.8 · 43.5 · 48.5 | 48.0 · 45.1 · 51.4 | 52.8 · 50.8 · 55.4 |
| E | 0.0 · 0.0 · 0.0 | 0.0 · 0.0 · 0.0 | 0.0 · 0.0 · 0.0 |
| F | 47.3 · 28.4 · 63.1 | 49.1 · 27.5 · 67.7 | 48.3 · 27.2 · 65.0 |
| G | 41.7 · 38.6 · 44.1 | 43.8 · 40.1 · 47.1 | 47.8 · 44.8 · 50.2 |
| H | 47.2 · 45.1 · 49.0 | 51.1 · 48.5 · 53.4 | 52.8 · 50.8 · 54.5 |
| J | 47.1 · 43.1 · 51.1 | 46.0 · 40.7 · 51.5 | 54.2 · 50.8 · 57.9 |
| K | 48.5 · 44.5 · 52.5 | 47.8 · 42.3 · 53.3 | 55.4 · 51.9 · 59.0 |

### norte

| Bot | speed | reliability | efficiency |
|---|---|---|---|
| A | 40.2 · 37.5 · 43.1 | 45.1 · 42.1 · 48.8 | 45.7 · 43.2 · 48.3 |
| B | 0.0 · 0.0 · 0.0 | 0.0 · 0.0 · 0.0 | 0.0 · 0.0 · 0.0 |
| C | 58.0 · 55.1 · 60.8 | 63.5 · 59.9 · 67.1 | 67.3 · 64.7 · 69.9 |
| D | 46.0 · 43.8 · 48.8 | 51.9 · 49.2 · 55.3 | 50.7 · 48.8 · 53.3 |
| E | 0.0 · 0.0 · 0.0 | 0.0 · 0.0 · 0.0 | 0.0 · 0.0 · 0.0 |
| F | 34.1 · 19.1 · 47.8 | 37.7 · 18.4 · 55.2 | 26.2 · 10.5 · 40.9 |
| G | 47.3 · 45.4 · 49.0 | 54.0 · 51.3 · 56.2 | 52.5 · 50.4 · 54.1 |
| H | 49.2 · 47.4 · 51.2 | 56.8 · 54.6 · 59.3 | 54.0 · 52.3 · 55.8 |
| J | 59.0 · 56.3 · 61.8 | 64.6 · 61.3 · 68.1 | 68.6 · 66.1 · 71.1 |
| K | 59.7 · 56.9 · 62.4 | 65.4 · 61.9 · 68.8 | 69.5 · 67.0 · 71.9 |

## Explicabilidad

Cobertura media 98.3% · mínima por corrida 88.9%

KPIs con más cambios sin causa registrada:

- OTD_P95: 10282
- CYCLE_HOURS: 893
- SPOIL_RATE: 292
- OTD: 224
- EXCEPTION_RATE: 221
- CSAT: 17
- FADS: 1

## Óptimos del bot buscador

| Escenario | Estrategia | Puntaje | En extremo | zones | window | buffer | sfsShare | levels | assignment | fleetMix | vehicle | cold | routing | data | costFn | eta | address | lockersPer1000 | hubs | darkStores | mfc | cod | slotting | peakContract | pay | zoning | segmentation | loadSeq |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| megalopolis | speed | 89.5 | — | 12 | 2h | 0.2 | 0 | sameday_nextday | threshold | crowd | reefer | reefer | vrptw | basic | avgtime | live | geocode | 5 | 0 | 0 | 1 | remove | 110 | advance | fixed | capacitated | zone | fresh_first |
| megalopolis | reliability | 94.4 | — | 12 | 2h | 0.2 | 0 | sameday_nextday | threshold | own_crowd | van | reefer | vrptw | basic | avgtime | live | geocode | 5 | 0 | 0 | 1 | remove | 110 | advance | fixed | capacitated | zone | none |
| megalopolis | efficiency | 90.0 | — | 12 | 2h | 0.1 | 0 | sameday_nextday | threshold | own_crowd | van | coolers | ai | full | timedep | live | geocode | 5 | 0 | 0 | 1 | remove | 110 | advance | fixed | dynamic | zone | fresh_first |
| bajio | speed | 89.3 | — | 6 | 4h | 0 | 0 | sameday_nextday | ai | 3pl | van | coolers | vrptw | basic | avgtime | sms | geocode | 10 | 0 | 0 | 0 | remove | 100 | advance | fixed | capacitated | zone | fresh_first |
| bajio | reliability | 93.5 | — | 6 | 4h | 0 | 0 | sameday_nextday | ai | 3pl | van | coolers | vrptw | basic | avgtime | sms | geocode | 10 | 0 | 0 | 0 | remove | 100 | advance | fixed | capacitated | zone | fresh_first |
| bajio | efficiency | 87.7 | — | 6 | 4h | 0 | 0 | sameday_nextday | ai | 3pl | van | none | vrptw | basic | avgtime | sms | geocode | 10 | 0 | 0 | 0 | remove | 100 | advance | fixed | capacitated | zone | fresh_first |
| norte | speed | 91.9 | — | 4 | day | 0 | 0.75 | sameday_nextday | lowest | 3pl | ev | coolers | ai | full | avgtime | live | geocode | 10 | 0 | 0 | 0 | remove | 110 | advance | mixed | dynamic | zone | fresh_first |
| norte | reliability | 97.8 | — | 4 | day | 0 | 0.75 | sameday_nextday | lowest | 3pl | ev | coolers | ai | full | avgtime | live | geocode | 10 | 0 | 0 | 0 | remove | 110 | advance | mixed | dynamic | zone | fresh_first |
| norte | efficiency | 97.4 | — | 4 | day | 0 | 0.75 | sameday_nextday | lowest | 3pl | ev | none | ai | full | avgtime | live | geocode | 10 | 0 | 0 | 0 | remove | 100 | advance | mixed | dynamic | zone | fresh_first |
