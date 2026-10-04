# Reporte de coherencia — mt4035-scm

Generado: 2026-10-04T04:24:53.763Z · 4800 corridas (200 semillas × 8 bots × 3 escenarios) · 89 ms/corrida

## Alarmas de calibración

- Ninguna alarma P1.

## Propiedades

| | ID | Prioridad | Propiedad | Detalle |
|---|---|---|---|---|
| ✅ | SCM-AUT-01 | P1 | Robustez: sin errores, sin NaN e invariantes al 100% | 600 corridas de BOT-F; 0 corridas con problemas en total |
| ✅ | SCM-AUT-02 | P1 | Desalineación pierde: en Red River, BOT-B queda entre los 2 peores de A–E (≥ 80%) | redriver/freshness 100%, redriver/lowcost 100%, redriver/convenience 100% |
| ✅ | SCM-AUT-03 | P1 | Adaptación gana: en Red River y Valle, BOT-C > BOT-A y BOT-C > BOT-B (≥ 80%) | redriver/freshness 100%, redriver/lowcost 100%, redriver/convenience 100%, valle/freshness 100%, valle/lowcost 100%, valle/convenience 100% |
| ✅ | SCM-AUT-04 | P1 | Ningún extremo domina: BOT-D nunca es el mejor bajo bajo costo; BOT-E nunca bajo frescura (≥ 95%) | ni D ni E dominan en ningún escenario |
| ✅ | SCM-AUT-09 | P1 | Habilidad > suerte: CV de BOT-A < 15% y media(C − B) > 2σ(A) en Red River y Valle | redriver/freshness C−B=55.6 vs 2σ=3.9, redriver/lowcost C−B=65.3 vs 2σ=4.5, redriver/convenience C−B=69.1 vs 2σ=4.3, valle/freshness C−B=56.3 vs 2σ=3.3, valle/lowcost C−B=46.9 vs 2σ=3.4, valle/convenience C−B=49.7 vs 2σ=3.5 |
| ✅ | SCM-AUT-05 | P2 | Decisiones significativas: ≥ 3 configuraciones óptimas distintas entre región × estrategia | 9 óptimos distintos en 9 combinaciones |
| ✅ | SCM-AUT-06 | P2 | Óptimos interiores: n.º de CD, CSL y frecuencia no en los extremos en ≥ 7 de 9 combinaciones | 8/9 interiores; en extremo: valle/lowcost: dcCount+freshFreq |
| ✅ | SCM-AUT-07 | P2 | Validación contra el caso: el óptimo de Kaigan + frescura se parece al diseño SEJ | CD combinado, frescos por CD ≥ 2×/día, POS diario compartido |
| ✅ | SCM-AUT-08 | P2 | La geografía cambia el óptimo: Red River + frescura usa frescos ≤ 2×/día y CD con inventario para ambiente | frescos dsd/14, CD 6×stocking, ambiente por dc |
| ✅ | SCM-AUT-11 | P2 | La información tarda: con solo D-30/D-31, OSA ↑ y BWR ↓ con efecto visible a las 2–4 épocas | efecto con retraso en Red River y Valle |
| ✅ | SCM-AUT-12 | P3 | Estabilidad del reactivo: KPIs en rango y sin costos explosivos | CTS máximo 22% en 600 corridas |
| ✅ | SCM-AUT-14 | P1 | Explicabilidad: ≥ 95% de los cambios de KPI > 10% tienen causa registrada | cobertura 99.9% sobre 67613 cambios relevantes |

## Puntaje por bot (media · p5 · p95)

### kaigan

| Bot | freshness | lowcost | convenience |
|---|---|---|---|
| A | 55.1 · 51.8 · 57.4 | 52.5 · 49.7 · 54.3 | 54.3 · 50.5 · 56.8 |
| B | 55.1 · 51.8 · 57.4 | 52.5 · 49.7 · 54.3 | 54.3 · 50.5 · 56.8 |
| C | 61.6 · 59.1 · 63.3 | 56.8 · 55.0 · 58.2 | 61.5 · 58.8 · 63.6 |
| D | 60.1 · 58.1 · 61.8 | 45.8 · 44.2 · 47.0 | 58.7 · 56.3 · 60.6 |
| E | 0.0 · 0.0 · 0.0 | 0.0 · 0.0 · 0.0 | 0.0 · 0.0 · 0.0 |
| F | 0.0 · 0.0 · 0.0 | 0.0 · 0.0 · 0.0 | 0.0 · 0.0 · 0.0 |
| G | 55.2 · 51.8 · 57.4 | 52.5 · 49.7 · 54.3 | 54.3 · 50.7 · 56.8 |
| I | 50.9 · 47.5 · 53.5 | 49.6 · 46.8 · 51.7 | 50.2 · 46.4 · 53.1 |

### redriver

| Bot | freshness | lowcost | convenience |
|---|---|---|---|
| A | 36.4 · 33.0 · 38.8 | 27.2 · 23.0 · 30.3 | 30.1 · 26.4 · 32.9 |
| B | 20.4 · 17.0 · 22.8 | 6.6 · 3.6 · 8.8 | 7.4 · 3.8 · 9.9 |
| C | 76.0 · 74.9 · 76.6 | 71.9 · 71.0 · 72.5 | 76.5 · 75.5 · 77.3 |
| D | 59.8 · 58.8 · 60.4 | 35.8 · 35.2 · 36.2 | 51.6 · 50.5 · 52.3 |
| E | 0.0 · 0.0 · 0.0 | 0.0 · 0.0 · 0.0 | 0.0 · 0.0 · 0.0 |
| F | 44.7 · 11.7 · 67.5 | 32.5 · 2.9 · 61.9 | 38.5 · 3.9 · 65.9 |
| G | 34.4 · 30.2 · 37.1 | 27.0 · 22.1 · 30.1 | 30.0 · 25.5 · 33.0 |
| I | 59.9 · 57.6 · 61.3 | 54.9 · 52.0 · 56.6 | 57.1 · 54.3 · 58.8 |

### valle

| Bot | freshness | lowcost | convenience |
|---|---|---|---|
| A | 36.9 · 34.1 · 39.4 | 36.7 · 33.6 · 39.3 | 35.1 · 32.0 · 37.8 |
| B | 0.0 · 0.0 · 0.0 | 0.0 · 0.0 · 0.0 | 0.0 · 0.0 · 0.0 |
| C | 56.3 · 52.2 · 59.4 | 46.9 · 42.5 · 50.2 | 49.7 · 45.1 · 53.1 |
| D | 50.1 · 48.5 · 50.9 | 29.2 · 28.0 · 29.8 | 41.0 · 39.2 · 41.9 |
| E | 0.0 · 0.0 · 0.0 | 0.0 · 0.0 · 0.0 | 0.0 · 0.0 · 0.0 |
| F | 9.3 · 0.0 · 41.8 | 6.6 · 0.0 · 34.4 | 7.5 · 0.0 · 37.9 |
| G | 30.0 · 27.0 · 32.5 | 31.3 · 28.1 · 34.0 | 29.9 · 26.7 · 32.6 |
| I | 43.2 · 39.4 · 46.7 | 42.0 · 38.3 · 45.7 | 41.2 · 37.3 · 44.8 |

## Explicabilidad

Cobertura media 99.9% · mínima por corrida 81.3%

KPIs con más cambios sin causa registrada:

- TRUCKS: 75
- BWR: 16

## Óptimos del buscador (BOT-H)

| Escenario | Estrategia | Puntaje | En extremo | dcCount | dcType | dcSize | flowFresh | flowChilled | flowAmbient | flowFrozen | freshFreq | chilledFreq | ambientFreq | frozenFreq | csl | info | sharing | forecast | collaboration | consolidation | receiving | window | maintenance | multiTemp | telemetry | dcSafetyDays | policy | dedicatedFresh |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| kaigan | freshness | 67.8 | freshFreq | -1 | stocking | medium | dc | dc | dc | dc | 21 | 3 | 3 | 3 | 0.97 | pos_terminal | daily | causal | cpfr | combined | scan | offpeak | predictive | true | true | 0 | tanpin | true |
| kaigan | lowcost | 66.4 | freshFreq | -1 | stocking | medium | dc | dc | dc | dc | 21 | 3 | 3 | 2 | 0.97 | pos_terminal | daily | causal | cpfr | combined | scan | offpeak | predictive | false | true | 0 | tanpin | true |
| kaigan | convenience | 71.3 | freshFreq | -1 | stocking | medium | dc | dc | dc | dc | 21 | 3 | 2 | 2 | 0.97 | pos_terminal | daily | causal | cpfr | combined | scan | offpeak | predictive | false | true | 0 | tanpin | true |
| redriver | freshness | 87.0 | — | 6 | stocking | small | dsd | dc | dc | dc | 14 | 3 | 3 | 1 | 0.95 | pos_terminal | daily | causal | cpfr | supplier | scan | offpeak | predictive | false | true | 2 | tanpin | true |
| redriver | lowcost | 76.6 | — | 6 | stocking | small | dsd | dsd | dc | dc | 14 | 7 | 2 | 1 | 0.93 | pos_terminal | daily | causal | cpfr | supplier | scan | offpeak | predictive | false | true | 4 | tanpin | true |
| redriver | convenience | 88.4 | — | 8 | stocking | small | dsd | dc | dc | dc | 14 | 3 | 2 | 1 | 0.97 | basic | daily | causal | cpfr | supplier | scan | offpeak | predictive | false | true | 2 | periodic | true |
| valle | freshness | 83.6 | freshFreq | -1 | stocking | medium | dsd | dc | dc | dc | 21 | 3 | 3 | 2 | 0.95 | pos_terminal | daily | causal | cpfr | supplier | scan | offpeak | predictive | true | true | 2 | tanpin | true |
| valle | lowcost | 74.2 | dcCount, freshFreq | 0 | stocking | medium | dsd | dsd | dsd | dsd | 21 | 14 | 3 | 2 | 0.9 | pos_terminal | daily | causal | cpfr | supplier | scan | offpeak | predictive | true | true | 0 | tanpin | true |
| valle | convenience | 84.8 | freshFreq | -1 | stocking | medium | dsd | dc | dc | dc | 21 | 3 | 2 | 1 | 0.97 | pos_daily | daily | causal | cpfr | supplier | scan | offpeak | predictive | false | true | 2 | periodic | true |
