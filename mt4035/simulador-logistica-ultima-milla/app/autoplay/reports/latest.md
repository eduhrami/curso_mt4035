# Reporte de coherencia — mt4035-lastmile

Generado: 2026-10-14T02:51:42.166Z · 6600 corridas (200 semillas × 11 bots × 3 escenarios) · 448 ms/corrida

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
| ✅ | LOG-AUT-06 | P1 | Se aprende entre ciclos: BOT-H mejora el OTD p95 de nov–dic del año 1 al 2 (≥ 90%) y el año 3 ≥ año 2 | bajio 100% (año 2 0.988, año 3 0.986), megalopolis 100% (año 2 0.959, año 3 0.985), norte 100% (año 2 0.993, año 3 0.991) |
| ✅ | LOG-AUT-07 | P2 | Ningún extremo domina: ≥ 3 óptimos distintos y ninguno es óptimo en todas las combinaciones | 7 óptimos distintos en 9 combinaciones (máx. repetido 2) |
| ✅ | LOG-AUT-08 | P2 | Óptimos interiores: n.º de zonas, ventana, holgura y % SFS no en los extremos en ≥ 7 de 9 combinaciones | 9/9 interiores |
| ✅ | LOG-AUT-09 | P2 | Urbano ≠ rural: el óptimo de Norte consolida más (lockers, micro-hubs, ventanas amplias) que el de Megalópolis | speed: Norte 2.00 vs Megalópolis 0.58, reliability: Norte 2.00 vs Megalópolis 0.58, efficiency: Norte 1.50 vs Megalópolis 0.92 |
| ✅ | LOG-AUT-10 | P1 | Habilidad > suerte: CV de BOT-A < 15% y, en Megalópolis, media(C − A) > 2σ(A) | speed C−A=8.4 vs 2σ=4.0, reliability C−A=7.6 vs 2σ=5.0, efficiency C−A=8.6 vs 2σ=3.7 |
| ✅ | LOG-AUT-11 | P2 | Los picos son el examen: para BOT-A, ≥ 50% de los meses con guardrail violado son meses pico | bajio 78% de 2905, megalopolis 72% de 3024, norte 91% de 2226 |
| ✅ | LOG-AUT-12 | P2 | Medir importa: en Megalópolis, BOT-A tiene OTD promedio − OTD p95 ≥ 10 pp | diferencia media 10.7 pp |
| ✅ | LOG-AUT-13 | P2 | La IA necesita datos: segmentado con IA y datos básicos < segmentado con VRPTW y datos completos (≥ 80%) | bajio/speed 100%, bajio/reliability 100%, bajio/efficiency 100%, megalopolis/speed 100%, megalopolis/reliability 100%, megalopolis/efficiency 100%, norte/speed 100%, norte/reliability 100%, norte/efficiency 100% |
| ✅ | LOG-AUT-14 | P3 | Estabilidad del reactivo: KPIs en rango y sin costos explosivos | CPD máximo USD 11.35 en 600 corridas |
| ✅ | LOG-AUT-16 | P1 | Explicabilidad: ≥ 95% de los cambios de KPI > 10% tienen causa registrada | cobertura 97.7% sobre 830394 cambios relevantes |
| ✅ | LOG-AUT-17 | P1 | Pronosticar paga: BOT-A (pronóstico perfecto) > BOT-L (pronóstico nominal) bajo las tres estrategias (≥ 80%) | bajio/speed 100%, bajio/reliability 100%, bajio/efficiency 100%, megalopolis/speed 100%, megalopolis/reliability 100%, megalopolis/efficiency 100%, norte/speed 100%, norte/reliability 100%, norte/efficiency 100% |

## Puntaje por bot (media · p5 · p95)

### bajio

| Bot | speed | reliability | efficiency |
|---|---|---|---|
| A | 61.9 · 59.3 · 64.2 | 62.1 · 58.5 · 65.2 | 63.9 · 61.5 · 66.1 |
| B | 62.2 · 58.7 · 64.9 | 51.6 · 46.2 · 55.6 | 47.2 · 44.0 · 49.6 |
| C | 68.8 · 65.9 · 72.0 | 69.5 · 65.4 · 73.8 | 70.3 · 67.6 · 72.9 |
| D | 67.6 · 65.2 · 69.9 | 68.6 · 65.4 · 71.9 | 69.8 · 67.5 · 72.1 |
| E | 45.5 · 43.2 · 47.9 | 37.4 · 34.2 · 40.4 | 40.9 · 37.8 · 43.7 |
| F | 58.9 · 49.6 · 67.3 | 60.5 · 50.7 · 69.6 | 49.8 · 41.8 · 56.9 |
| G | 67.6 · 65.2 · 69.9 | 69.9 · 66.9 · 73.0 | 66.1 · 63.7 · 68.3 |
| H | 66.8 · 64.4 · 69.1 | 68.7 · 65.7 · 71.7 | 68.3 · 65.9 · 70.4 |
| J | 69.6 · 66.6 · 72.7 | 70.4 · 66.3 · 74.6 | 71.0 · 68.3 · 73.8 |
| K | 69.9 · 66.9 · 73.1 | 70.8 · 66.7 · 75.1 | 71.3 · 68.5 · 74.1 |
| L | 55.7 · 50.4 · 59.8 | 55.7 · 48.9 · 60.9 | 57.6 · 53.3 · 61.4 |

### megalopolis

| Bot | speed | reliability | efficiency |
|---|---|---|---|
| A | 51.9 · 48.7 · 55.2 | 52.9 · 48.6 · 56.9 | 55.7 · 52.7 · 58.6 |
| B | 39.8 · 36.0 · 43.4 | 28.9 · 26.5 · 32.0 | 39.9 · 37.0 · 42.6 |
| C | 60.3 · 57.1 · 63.7 | 60.5 · 56.0 · 65.2 | 64.4 · 61.3 · 67.4 |
| D | 58.4 · 55.5 · 61.4 | 59.8 · 56.1 · 63.8 | 62.8 · 60.3 · 65.3 |
| E | 27.4 · 26.4 · 28.4 | 27.4 · 26.4 · 28.4 | 27.4 · 26.4 · 28.4 |
| F | 57.7 · 44.2 · 69.0 | 58.5 · 42.3 · 71.7 | 56.7 · 40.0 · 69.8 |
| G | 54.0 · 50.2 · 58.2 | 55.4 · 51.0 · 60.7 | 57.8 · 54.4 · 61.7 |
| H | 58.1 · 55.6 · 60.5 | 60.7 · 57.5 · 63.7 | 61.5 · 59.0 · 63.8 |
| J | 62.1 · 58.7 · 65.9 | 62.6 · 57.9 · 67.5 | 65.9 · 62.8 · 69.2 |
| K | 63.3 · 60.0 · 67.2 | 64.1 · 59.4 · 69.4 | 66.9 · 63.8 · 70.1 |
| L | 45.5 · 38.2 · 50.8 | 46.4 · 37.6 · 52.7 | 49.3 · 43.3 · 54.3 |

### norte

| Bot | speed | reliability | efficiency |
|---|---|---|---|
| A | 55.3 · 52.4 · 58.0 | 59.0 · 55.4 · 62.5 | 57.9 · 55.2 · 60.5 |
| B | 27.6 · 26.6 · 28.6 | 27.4 · 26.4 · 28.4 | 27.4 · 26.4 · 28.4 |
| C | 69.8 · 67.8 · 72.1 | 74.6 · 71.9 · 77.8 | 75.3 · 73.4 · 77.2 |
| D | 59.3 · 56.8 · 61.8 | 63.7 · 60.4 · 67.0 | 61.4 · 58.8 · 63.7 |
| E | 28.5 · 26.9 · 30.2 | 27.4 · 26.4 · 28.4 | 27.4 · 26.4 · 28.4 |
| F | 49.9 · 39.3 · 59.8 | 51.9 · 39.2 · 63.3 | 42.9 · 32.5 · 51.7 |
| G | 60.2 · 58.2 · 61.7 | 65.2 · 62.5 · 67.4 | 62.6 · 60.6 · 64.4 |
| H | 59.4 · 57.0 · 61.5 | 64.6 · 61.9 · 67.4 | 61.8 · 59.3 · 64.1 |
| J | 70.6 · 68.5 · 72.9 | 75.4 · 72.7 · 78.5 | 76.2 · 74.4 · 78.2 |
| K | 71.1 · 69.1 · 73.4 | 76.0 · 73.2 · 79.0 | 76.9 · 75.1 · 78.9 |
| L | 49.1 · 43.6 · 53.3 | 52.7 · 46.1 · 57.9 | 51.6 · 46.8 · 55.6 |

## Explicabilidad

Cobertura media 97.7% · mínima por corrida 85.6%

KPIs con más cambios sin causa registrada:

- OTD_P95: 12856
- CYCLE_HOURS: 2055
- OTD: 1558
- SPOIL_RATE: 275
- EXCEPTION_RATE: 228
- CSAT: 19
- FADS: 1

## Óptimos del bot buscador

| Escenario | Estrategia | Puntaje | En extremo | zones | window | buffer | sfsShare | levels | assignment | fleetMix | vehicle | cold | routing | data | costFn | eta | address | lockersPer1000 | hubs | darkStores | mfc | cod | slotting | peakContract | pay | zoning | segmentation | loadSeq |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| megalopolis | speed | 89.7 | — | 12 | 2h | 0.1 | 0 | sameday_nextday | threshold | crowd | moto | reefer | vrptw | basic | avgtime | live | geocode | 5 | 0 | 1 | 1 | remove | 100 | spot | fixed | capacitated | zone | fresh_first |
| megalopolis | reliability | 93.3 | — | 12 | 2h | 0.1 | 0 | sameday_nextday | threshold | own_crowd | van | reefer | ai | full | avgtime | live | geocode | 5 | 0 | 0 | 1 | remove | 100 | spot | fixed | capacitated | zone | none |
| megalopolis | efficiency | 90.5 | — | 12 | 4h | 0 | 0 | sameday_nextday | ai | own_crowd | van | coolers | vrptw | basic | avgtime | live | geocode | 5 | 0 | 0 | 1 | remove | 110 | spot | fixed | capacitated | zone | fresh_first |
| bajio | speed | 88.4 | — | 6 | 4h | 0.1 | 0.15 | sameday_nextday | ai | own_3pl | moto | coolers | vrptw | basic | avgtime | sms | geocode | 5 | 0 | 0 | 0 | remove | 100 | none | fixed | capacitated | zone | fresh_first |
| bajio | reliability | 90.3 | — | 6 | 4h | 0.1 | 0.15 | sameday_nextday | ai | own_3pl | moto | coolers | vrptw | basic | avgtime | sms | geocode | 5 | 0 | 0 | 0 | remove | 100 | none | fixed | capacitated | zone | fresh_first |
| bajio | efficiency | 87.5 | — | 6 | 4h | 0 | 0 | sameday_nextday | nearest | own_3pl | moto | none | vrptw | basic | avgtime | sms | geocode | 10 | 0 | 0 | 0 | remove | 100 | spot | fixed | capacitated | zone | fresh_first |
| norte | speed | 90.8 | — | 4 | day | 0 | 0.75 | sameday_nextday | lowest | 3pl | van | coolers | vrptw | basic | avgtime | live | geocode | 20 | 0 | 0 | 0 | remove | none | advance | mixed | capacitated | zone | fresh_first |
| norte | reliability | 94.9 | — | 4 | day | 0 | 0.75 | sameday_nextday | lowest | 3pl | van | coolers | vrptw | basic | avgtime | live | geocode | 20 | 0 | 0 | 0 | remove | none | advance | mixed | capacitated | zone | fresh_first |
| norte | efficiency | 93.9 | — | 4 | day | 0 | 0.75 | sameday_nextday | threshold | 3pl | van | none | vrptw | basic | avgtime | live | geocode | 10 | 0 | 0 | 0 | remove | none | advance | mixed | capacitated | zone | fresh_first |
