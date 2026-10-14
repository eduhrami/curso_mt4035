# Reporte de coherencia — mt4035-scm

Generado: 2026-10-14T04:48:52.948Z · 5400 corridas (200 semillas × 9 bots × 3 escenarios) · 105 ms/corrida

## Alarmas de calibración

- Ninguna alarma P1.

## Propiedades

| | ID | Prioridad | Propiedad | Detalle |
|---|---|---|---|---|
| ✅ | SCM-AUT-01 | P1 | Robustez: sin errores, sin NaN e invariantes al 100% | 600 corridas de BOT-F; 0 corridas con problemas en total |
| ✅ | SCM-AUT-02 | P1 | Desalineación pierde: en Red River, BOT-B queda entre los 2 peores de A–E (≥ 80%) | redriver/freshness 100%, redriver/lowcost 100%, redriver/convenience 100% |
| ✅ | SCM-AUT-03 | P1 | Adaptación gana: en Red River y Valle, BOT-C > BOT-A y BOT-C > BOT-B (≥ 80%) | redriver/freshness 100%, redriver/lowcost 100%, redriver/convenience 100%, valle/freshness 100%, valle/lowcost 100%, valle/convenience 100% |
| ✅ | SCM-AUT-04 | P1 | Ningún extremo domina: BOT-D nunca es el mejor bajo bajo costo; BOT-E nunca bajo frescura (≥ 95%) | ni D ni E dominan en ningún escenario |
| ✅ | SCM-AUT-09 | P1 | Habilidad > suerte: CV de BOT-A < 15% y media(C − B) > 2σ(A) en Red River y Valle | redriver/freshness C−B=39.0 vs 2σ=3.2, redriver/lowcost C−B=45.8 vs 2σ=4.3, redriver/convenience C−B=48.5 vs 2σ=3.7, valle/freshness C−B=39.5 vs 2σ=2.4, valle/lowcost C−B=32.9 vs 2σ=2.7, valle/convenience C−B=34.8 vs 2σ=2.6 |
| ✅ | SCM-AUT-05 | P2 | Decisiones significativas: ≥ 3 configuraciones óptimas distintas entre región × estrategia | 9 óptimos distintos en 9 combinaciones |
| ✅ | SCM-AUT-06 | P2 | Óptimos interiores: n.º de CD, CSL y frecuencia no en los extremos en ≥ 7 de 9 combinaciones | 7/9 interiores; en extremo: valle/lowcost: dcCount+freshFreq, valle/convenience: dcCount+freshFreq |
| ✅ | SCM-AUT-07 | P2 | Validación contra el caso: el óptimo de Kaigan + frescura se parece al diseño SEJ | CD combinado, frescos por CD ≥ 2×/día, POS diario compartido |
| ✅ | SCM-AUT-08 | P2 | La geografía cambia el óptimo: Red River + frescura usa frescos ≤ 2×/día y CD con inventario para ambiente | frescos dsd/14, CD 8×stocking, ambiente por dc |
| ✅ | SCM-AUT-11 | P2 | La información tarda: con solo D-30/D-31, OSA ↑ y BWR ↓ con efecto visible a las 2–4 épocas | efecto con retraso en Red River y Valle |
| ✅ | SCM-AUT-12 | P3 | Estabilidad del reactivo: KPIs en rango y sin costos explosivos | CTS máximo 23% en 600 corridas |
| ✅ | SCM-AUT-14 | P1 | Explicabilidad: ≥ 95% de los cambios de KPI > 10% tienen causa registrada | cobertura 99.9% sobre 79963 cambios relevantes |
| ✅ | SCM-AUT-15 | P1 | Pronosticar paga: BOT-A (pronóstico perfecto) > BOT-L (pronóstico nominal) bajo las tres estrategias (≥ 80%) | kaigan/freshness 100%, kaigan/lowcost 100%, kaigan/convenience 100%, redriver/freshness 100%, redriver/lowcost 100%, redriver/convenience 100%, valle/freshness 100%, valle/lowcost 100%, valle/convenience 100% |

## Puntaje por bot (media · p5 · p95)

### kaigan

| Bot | freshness | lowcost | convenience |
|---|---|---|---|
| A | 67.7 · 65.5 · 69.6 | 65.9 · 63.9 · 68.0 | 67.1 · 64.6 · 69.4 |
| B | 67.7 · 65.5 · 69.6 | 65.9 · 63.9 · 68.0 | 67.1 · 64.6 · 69.4 |
| C | 72.2 · 70.3 · 73.8 | 68.9 · 67.0 · 70.8 | 72.2 · 70.1 · 74.1 |
| D | 71.0 · 68.9 · 72.9 | 61.0 · 57.8 · 63.7 | 70.0 · 67.4 · 72.3 |
| E | 29.1 · 28.5 · 29.5 | 29.1 · 28.5 · 29.5 | 29.1 · 28.5 · 29.5 |
| F | 29.1 · 28.5 · 29.5 | 29.1 · 28.5 · 29.5 | 29.1 · 28.5 · 29.5 |
| G | 67.7 · 65.5 · 69.6 | 66.0 · 63.9 · 68.0 | 67.1 · 64.6 · 69.4 |
| I | 64.8 · 62.4 · 66.9 | 63.9 · 61.8 · 66.2 | 64.3 · 61.7 · 66.8 |
| L | 60.9 · 53.8 · 65.0 | 60.0 · 54.9 · 63.2 | 59.5 · 51.8 · 64.0 |

### redriver

| Bot | freshness | lowcost | convenience |
|---|---|---|---|
| A | 54.8 · 52.2 · 57.3 | 48.4 · 45.2 · 52.0 | 50.4 · 47.6 · 53.5 |
| B | 43.3 · 41.0 · 45.0 | 33.6 · 31.5 · 35.2 | 34.2 · 31.8 · 36.0 |
| C | 82.3 · 81.5 · 83.0 | 79.5 · 78.5 · 80.5 | 82.7 · 81.8 · 83.6 |
| D | 70.9 · 70.1 · 71.5 | 54.1 · 53.5 · 54.7 | 65.2 · 64.3 · 65.9 |
| E | 29.1 · 28.6 · 29.5 | 29.1 · 28.6 · 29.5 | 29.1 · 28.6 · 29.5 |
| F | 60.4 · 37.6 · 76.6 | 51.9 · 30.7 · 72.5 | 56.1 · 30.4 · 75.1 |
| G | 53.2 · 50.2 · 55.7 | 48.1 · 44.3 · 51.8 | 50.1 · 46.8 · 53.1 |
| I | 71.0 · 69.3 · 72.4 | 67.5 · 64.7 · 69.6 | 69.0 · 67.0 · 70.7 |
| L | 43.0 · 34.9 · 48.2 | 34.6 · 28.1 · 39.2 | 37.3 · 28.7 · 42.8 |

### valle

| Bot | freshness | lowcost | convenience |
|---|---|---|---|
| A | 54.9 · 53.0 · 56.8 | 54.8 · 52.6 · 56.9 | 53.7 · 51.6 · 55.8 |
| B | 29.1 · 28.6 · 29.5 | 29.1 · 28.6 · 29.5 | 29.1 · 28.6 · 29.5 |
| C | 68.5 · 65.7 · 70.8 | 62.0 · 58.7 · 64.9 | 63.9 · 60.8 · 66.6 |
| D | 64.1 · 63.0 · 64.9 | 49.5 · 48.7 · 50.2 | 57.8 · 56.5 · 58.6 |
| E | 29.1 · 28.6 · 29.5 | 29.1 · 28.6 · 29.5 | 29.1 · 28.6 · 29.5 |
| F | 35.6 · 28.7 · 58.1 | 33.8 · 28.6 · 52.8 | 34.4 · 28.7 · 55.3 |
| G | 50.1 · 48.0 · 51.9 | 51.1 · 48.7 · 53.2 | 50.0 · 47.6 · 52.0 |
| I | 59.3 · 56.5 · 62.0 | 58.5 · 55.7 · 61.4 | 57.9 · 55.1 · 60.7 |
| L | 46.4 · 37.3 · 51.2 | 46.2 · 36.0 · 51.1 | 44.4 · 33.3 · 49.8 |

## Explicabilidad

Cobertura media 99.9% · mínima por corrida 80.0%

KPIs con más cambios sin causa registrada:

- TRUCKS: 75
- BWR: 16

## Óptimos del bot buscador

| Escenario | Estrategia | Puntaje | En extremo | dcCount | dcType | dcSize | flowFresh | flowChilled | flowAmbient | flowFrozen | freshFreq | chilledFreq | ambientFreq | frozenFreq | csl | info | sharing | forecast | collaboration | consolidation | receiving | window | maintenance | multiTemp | telemetry | dcSafetyDays | policy | dedicatedFresh |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| kaigan | freshness | 76.7 | freshFreq | -1 | stocking | medium | dc | dc | dc | dc | 21 | 3 | 3 | 3 | 0.97 | pos_terminal | daily | causal | cpfr | combined | scan | offpeak | predictive | true | true | 0 | tanpin | true |
| kaigan | lowcost | 75.9 | freshFreq | -1 | stocking | medium | dc | dc | dc | dc | 21 | 3 | 3 | 2 | 0.97 | pos_terminal | daily | causal | cpfr | combined | scan | offpeak | predictive | false | true | 0 | tanpin | true |
| kaigan | convenience | 79.2 | freshFreq | -1 | stocking | medium | dc | dc | dc | dc | 21 | 3 | 2 | 1 | 0.97 | pos_terminal | daily | causal | cpfr | combined | scan | offpeak | predictive | false | true | 0 | tanpin | true |
| redriver | freshness | 90.2 | — | 8 | stocking | small | dsd | dc | dc | dc | 14 | 3 | 3 | 1 | 0.97 | pos_terminal | daily | causal | cpfr | supplier | scan | offpeak | predictive | false | true | 2 | tanpin | true |
| redriver | lowcost | 83.0 | — | 6 | stocking | small | dsd | dsd | dc | dc | 14 | 7 | 2 | 1 | 0.97 | pos_terminal | daily | causal | cpfr | supplier | scan | offpeak | predictive | false | true | 4 | tanpin | true |
| redriver | convenience | 91.2 | — | 8 | stocking | small | dsd | dc | dc | dc | 14 | 3 | 2 | 1 | 0.97 | pos_daily | daily | causal | cpfr | supplier | scan | offpeak | predictive | false | true | 2 | periodic | true |
| valle | freshness | 84.9 | freshFreq | -1 | stocking | medium | dsd | dc | dc | dc | 21 | 14 | 3 | 2 | 0.93 | pos_terminal | daily | causal | cpfr | supplier | scan | offpeak | predictive | false | true | 2 | tanpin | true |
| valle | lowcost | 81.2 | dcCount, freshFreq | 0 | stocking | medium | dsd | dsd | dsd | dsd | 21 | 14 | 3 | 2 | 0.9 | pos_terminal | daily | causal | cpfr | supplier | scan | offpeak | predictive | true | true | 0 | tanpin | true |
| valle | convenience | 80.5 | dcCount, freshFreq | 0 | stocking | medium | dsd | dsd | dsd | dsd | 21 | 14 | 3 | 2 | 0.97 | pos_terminal | daily | causal | cpfr | supplier | scan | offpeak | predictive | true | true | 0 | tanpin | true |
