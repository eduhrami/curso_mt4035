# Reporte de coherencia — mt4035-lastmile

Generado: 2026-10-05T06:30:11.467Z · 6000 corridas (200 semillas × 10 bots × 3 escenarios) · 288 ms/corrida

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
| ✅ | LOG-AUT-06 | P1 | Se aprende entre ciclos: BOT-H mejora el OTD p95 de nov–dic del año 1 al 2 (≥ 90%) y el año 3 ≥ año 2 | bajio 100% (año 2 0.979, año 3 0.977), megalopolis 100% (año 2 0.982, año 3 0.974), norte 100% (año 2 0.991, año 3 0.990) |
| ✅ | LOG-AUT-07 | P2 | Ningún extremo domina: ≥ 3 óptimos distintos y ninguno es óptimo en todas las combinaciones | 9 óptimos distintos en 9 combinaciones (máx. repetido 1) |
| ✅ | LOG-AUT-08 | P2 | Óptimos interiores: n.º de zonas, ventana, holgura y % SFS no en los extremos en ≥ 7 de 9 combinaciones | 9/9 interiores |
| ✅ | LOG-AUT-09 | P2 | Urbano ≠ rural: el óptimo de Norte consolida más (lockers, micro-hubs, ventanas amplias) que el de Megalópolis | speed: Norte 1.50 vs Megalópolis 0.92, reliability: Norte 1.50 vs Megalópolis 0.58, efficiency: Norte 1.50 vs Megalópolis 0.58 |
| ✅ | LOG-AUT-10 | P1 | Habilidad > suerte: CV de BOT-A < 15% y, en Megalópolis, media(C − A) > 2σ(A) | speed C−A=11.9 vs 2σ=3.1, reliability C−A=10.6 vs 2σ=3.8, efficiency C−A=12.6 vs 2σ=2.9 |
| ✅ | LOG-AUT-11 | P2 | Los picos son el examen: para BOT-A, ≥ 50% de los meses con guardrail violado son meses pico | bajio 79% de 2849, megalopolis 80% de 2816, norte 90% de 2301 |
| ✅ | LOG-AUT-12 | P2 | Medir importa: en Megalópolis, BOT-A tiene OTD promedio − OTD p95 ≥ 10 pp | diferencia media 11.0 pp |
| ✅ | LOG-AUT-13 | P2 | La IA necesita datos: segmentado con IA y datos básicos < segmentado con VRPTW y datos completos (≥ 80%) | bajio/speed 100%, bajio/reliability 100%, bajio/efficiency 100%, megalopolis/speed 100%, megalopolis/reliability 100%, megalopolis/efficiency 100%, norte/speed 100%, norte/reliability 100%, norte/efficiency 100% |
| ✅ | LOG-AUT-14 | P3 | Estabilidad del reactivo: KPIs en rango y sin costos explosivos | CPD máximo USD 10.62 en 600 corridas |
| ✅ | LOG-AUT-16 | P1 | Explicabilidad: ≥ 95% de los cambios de KPI > 10% tienen causa registrada | cobertura 98.1% sobre 691506 cambios relevantes |

## Puntaje por bot (media · p5 · p95)

### bajio

| Bot | speed | reliability | efficiency |
|---|---|---|---|
| A | 49.3 · 47.1 · 51.8 | 49.3 · 46.6 · 52.6 | 54.4 · 52.4 · 56.7 |
| B | 49.4 · 45.7 · 52.5 | 34.2 · 29.0 · 39.0 | 28.1 · 24.9 · 30.9 |
| C | 60.9 · 58.4 · 63.5 | 62.0 · 58.6 · 65.4 | 65.3 · 63.0 · 67.6 |
| D | 57.3 · 54.9 · 59.9 | 58.4 · 55.3 · 61.7 | 62.7 · 60.5 · 65.0 |
| E | 22.7 · 21.2 · 24.7 | 11.5 · 9.5 · 14.0 | 20.4 · 18.9 · 22.1 |
| F | 46.3 · 32.7 · 58.0 | 48.4 · 33.2 · 61.1 | 33.3 · 21.5 · 43.8 |
| G | 57.3 · 54.3 · 60.4 | 60.4 · 56.2 · 64.8 | 55.1 · 52.3 · 58.1 |
| H | 58.7 · 56.8 · 60.7 | 61.6 · 59.2 · 64.2 | 62.8 · 61.1 · 64.7 |
| J | 62.0 · 59.4 · 64.6 | 63.2 · 59.9 · 66.8 | 66.3 · 64.0 · 68.7 |
| K | 62.5 · 59.9 · 65.0 | 63.8 · 60.4 · 67.3 | 66.6 · 64.4 · 69.0 |

### megalopolis

| Bot | speed | reliability | efficiency |
|---|---|---|---|
| A | 37.0 · 34.4 · 39.5 | 38.5 · 35.3 · 41.7 | 43.3 · 40.9 · 45.7 |
| B | 18.5 · 16.6 · 19.9 | 2.5 · 0.6 · 3.7 | 18.8 · 17.3 · 19.9 |
| C | 48.9 · 46.1 · 52.0 | 49.1 · 45.5 · 53.1 | 55.9 · 53.4 · 58.8 |
| D | 45.8 · 43.6 · 48.6 | 48.0 · 45.1 · 51.4 | 53.0 · 50.8 · 55.6 |
| E | 0.0 · 0.0 · 0.0 | 0.0 · 0.0 · 0.0 | 0.0 · 0.0 · 0.0 |
| F | 46.3 · 27.6 · 62.5 | 47.9 · 25.9 · 65.9 | 47.5 · 26.4 · 63.9 |
| G | 40.5 · 37.4 · 43.4 | 42.6 · 38.8 · 46.1 | 46.7 · 43.7 · 49.5 |
| H | 46.9 · 44.9 · 48.8 | 50.8 · 48.3 · 53.0 | 52.7 · 50.8 · 54.4 |
| J | 51.4 · 48.6 · 54.4 | 52.2 · 48.3 · 56.3 | 58.1 · 55.5 · 61.0 |
| K | 53.1 · 50.0 · 56.2 | 54.1 · 50.1 · 58.4 | 59.4 · 56.7 · 62.2 |

### norte

| Bot | speed | reliability | efficiency |
|---|---|---|---|
| A | 40.2 · 37.5 · 43.1 | 45.1 · 42.1 · 48.8 | 45.7 · 43.2 · 48.3 |
| B | 0.0 · 0.0 · 0.0 | 0.0 · 0.0 · 0.0 | 0.0 · 0.0 · 0.0 |
| C | 62.9 · 61.1 · 65.0 | 69.9 · 67.7 · 72.7 | 71.8 · 70.2 · 73.6 |
| D | 46.0 · 43.8 · 48.8 | 51.9 · 49.2 · 55.3 | 50.7 · 48.8 · 53.3 |
| E | 0.0 · 0.0 · 0.0 | 0.0 · 0.0 · 0.0 | 0.0 · 0.0 · 0.0 |
| F | 33.3 · 18.1 · 47.4 | 36.8 · 17.7 · 54.0 | 25.0 · 9.7 · 40.0 |
| G | 47.1 · 45.3 · 48.7 | 53.8 · 51.3 · 56.0 | 52.3 · 50.4 · 53.8 |
| H | 49.2 · 47.4 · 51.1 | 56.8 · 54.5 · 59.3 | 53.9 · 52.2 · 55.8 |
| J | 63.9 · 62.1 · 66.0 | 71.1 · 68.8 · 73.7 | 73.0 · 71.4 · 74.8 |
| K | 64.7 · 62.9 · 66.7 | 71.8 · 69.5 · 74.5 | 74.0 · 72.3 · 75.6 |

## Explicabilidad

Cobertura media 98.1% · mínima por corrida 88.7%

KPIs con más cambios sin causa registrada:

- OTD_P95: 10870
- CYCLE_HOURS: 899
- SPOIL_RATE: 301
- OTD: 266
- EXCEPTION_RATE: 230
- CSAT: 16
- FADS: 1

## Óptimos del bot buscador

| Escenario | Estrategia | Puntaje | En extremo | zones | window | buffer | sfsShare | levels | assignment | fleetMix | vehicle | cold | routing | data | costFn | eta | address | lockersPer1000 | hubs | darkStores | mfc | cod | slotting | peakContract | pay | zoning | segmentation | loadSeq |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| megalopolis | speed | 89.0 | — | 12 | 4h | 0 | 0 | sameday_nextday | threshold | crowd | moto | reefer | vrptw | basic | avgtime | live | geocode | 5 | 0 | 0 | 1 | remove | 110 | advance | fixed | capacitated | zone | fresh_first |
| megalopolis | reliability | 94.0 | — | 12 | 2h | 0.05 | 0 | sameday_nextday | threshold | own_crowd | reefer | none | ai | full | avgtime | live | geocode | 5 | 0 | 0 | 1 | remove | 100 | advance | fixed | capacitated | zone | none |
| megalopolis | efficiency | 89.7 | — | 12 | 2h | 0.05 | 0 | sameday_nextday | threshold | own_crowd | van | reefer | vrptw | basic | avgtime | live | geocode | 5 | 0 | 0 | 1 | remove | 110 | advance | fixed | capacitated | zone | none |
| bajio | speed | 88.7 | — | 6 | 4h | 0 | 0 | sameday_nextday | ai | 3pl | reefer | reefer | vrptw | basic | avgtime | sms | geocode | 10 | 0 | 0 | 0 | remove | 100 | advance | fixed | capacitated | zone | fresh_first |
| bajio | reliability | 93.5 | — | 6 | 4h | 0 | 0 | sameday_nextday | ai | 3pl | van | coolers | vrptw | basic | avgtime | sms | geocode | 10 | 0 | 0 | 0 | remove | 100 | advance | fixed | capacitated | zone | fresh_first |
| bajio | efficiency | 87.7 | — | 6 | 4h | 0 | 0 | sameday_nextday | ai | 3pl | van | none | vrptw | basic | avgtime | sms | geocode | 10 | 0 | 0 | 0 | remove | 100 | advance | fixed | capacitated | zone | fresh_first |
| norte | speed | 92.1 | — | 4 | day | 0 | 0.75 | sameday_nextday | lowest | 3pl | ev | coolers | vrptw | basic | avgtime | live | geocode | 10 | 0 | 0 | 0 | remove | 110 | advance | mixed | capacitated | zone | fresh_first |
| norte | reliability | 97.8 | — | 4 | day | 0 | 0.75 | sameday_nextday | lowest | 3pl | ev | coolers | ai | full | avgtime | live | geocode | 10 | 0 | 0 | 0 | remove | 110 | advance | mixed | dynamic | zone | fresh_first |
| norte | efficiency | 97.4 | — | 4 | day | 0 | 0.75 | sameday_nextday | lowest | 3pl | ev | none | ai | full | timedep | live | geocode | 10 | 0 | 0 | 0 | remove | 100 | advance | mixed | dynamic | zone | fresh_first |
