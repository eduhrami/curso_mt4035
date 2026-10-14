# Reporte de coherencia — mt4035-scm

Generado: 2026-10-14T17:30:20.211Z · 5400 corridas (200 semillas × 9 bots × 3 escenarios) · 70 ms/corrida

## Alarmas de calibración

- Ninguna alarma P1.

## Propiedades

| | ID | Prioridad | Propiedad | Detalle |
|---|---|---|---|---|
| ✅ | SCM-AUT-01 | P1 | Robustez: sin errores, sin NaN e invariantes al 100% | 600 corridas de BOT-F; 0 corridas con problemas en total |
| ✅ | SCM-AUT-02 | P1 | Desalineación pierde: en Red River, BOT-B queda entre los 2 peores de A–E (≥ 80%) | redriver/freshness 100%, redriver/lowcost 100%, redriver/convenience 100% |
| ✅ | SCM-AUT-03 | P1 | Adaptación gana: en Red River y Valle, BOT-C > BOT-A y BOT-C > BOT-B (≥ 80%) | redriver/freshness 100%, redriver/lowcost 100%, redriver/convenience 100%, valle/freshness 100%, valle/lowcost 100%, valle/convenience 100% |
| ✅ | SCM-AUT-04 | P1 | Ningún extremo domina: BOT-D nunca es el mejor bajo bajo costo; BOT-E nunca bajo frescura (≥ 95%) | ni D ni E dominan en ningún escenario |
| ✅ | SCM-AUT-09 | P1 | Habilidad > suerte: CV de BOT-A < 15% y media(C − B) > 2σ(A) en Red River y Valle | redriver/freshness C−B=31.3 vs 2σ=3.2, redriver/lowcost C−B=37.9 vs 2σ=4.3, redriver/convenience C−B=40.2 vs 2σ=3.7, valle/freshness C−B=32.1 vs 2σ=2.1, valle/lowcost C−B=33.0 vs 2σ=2.4, valle/convenience C−B=35.0 vs 2σ=2.4 |
| ✅ | SCM-AUT-05 | P2 | Decisiones significativas: ≥ 3 configuraciones óptimas distintas entre región × estrategia | 9 óptimos distintos en 9 combinaciones |
| ✅ | SCM-AUT-06 | P2 | Óptimos interiores: n.º de CD, CSL y frecuencia no en los extremos en ≥ 7 de 9 combinaciones | 7/9 interiores; en extremo: valle/lowcost: dcCount+csl+freshFreq, valle/convenience: dcCount+freshFreq |
| ✅ | SCM-AUT-07 | P2 | Validación contra el caso: el óptimo de Kaigan + frescura se parece al diseño SEJ | CD combinado, frescos por CD ≥ 2×/día, POS diario compartido |
| ✅ | SCM-AUT-08 | P2 | La geografía cambia el óptimo: Red River + frescura usa frescos ≤ 2×/día y CD con inventario para ambiente | frescos dsd/14, CD 8×stocking, ambiente por dc |
| ✅ | SCM-AUT-11 | P2 | La información tarda: con solo D-30/D-31, OSA ↑ y BWR ↓ con efecto visible a las 2–4 épocas | efecto con retraso en Red River y Valle |
| ✅ | SCM-AUT-12 | P3 | Estabilidad del reactivo: KPIs en rango y sin costos explosivos | CTS máximo 21% en 600 corridas |
| ✅ | SCM-AUT-14 | P1 | Explicabilidad: ≥ 95% de los cambios de KPI > 10% tienen causa registrada | cobertura 99.9% sobre 52495 cambios relevantes |
| ✅ | SCM-AUT-15 | P1 | Pronosticar paga: BOT-A (pronóstico perfecto) > BOT-L (pronóstico nominal) bajo las tres estrategias (≥ 80%) | kaigan/freshness 100%, kaigan/lowcost 100%, kaigan/convenience 100%, redriver/freshness 100%, redriver/lowcost 100%, redriver/convenience 100%, valle/freshness 100%, valle/lowcost 100%, valle/convenience 100% |

## Puntaje por bot (media · p5 · p95)

### kaigan

| Bot | freshness | lowcost | convenience |
|---|---|---|---|
| A | 67.7 · 65.5 · 69.4 | 65.4 · 63.5 · 67.3 | 67.0 · 64.3 · 69.0 |
| B | 67.7 · 65.5 · 69.4 | 65.4 · 63.5 · 67.3 | 67.0 · 64.3 · 69.0 |
| C | 71.8 · 69.7 · 73.4 | 68.1 · 66.3 · 69.9 | 71.6 · 69.2 · 73.5 |
| D | 70.1 · 68.0 · 72.0 | 60.6 · 58.0 · 62.9 | 69.2 · 66.8 · 71.5 |
| E | 29.1 · 28.4 · 29.6 | 29.1 · 28.4 · 29.6 | 29.1 · 28.4 · 29.6 |
| F | 29.2 · 28.4 · 29.7 | 29.5 · 28.4 · 32.5 | 29.2 · 28.4 · 29.6 |
| G | 67.7 · 65.5 · 69.4 | 65.4 · 63.5 · 67.3 | 67.0 · 64.3 · 69.0 |
| I | 64.7 · 62.1 · 66.6 | 63.4 · 61.3 · 65.4 | 64.1 · 61.1 · 66.2 |
| L | 62.4 · 57.5 · 66.0 | 61.0 · 57.0 · 63.8 | 61.0 · 55.6 · 65.0 |

### redriver

| Bot | freshness | lowcost | convenience |
|---|---|---|---|
| A | 59.2 · 56.5 · 61.7 | 54.3 · 50.9 · 57.9 | 55.4 · 52.3 · 58.3 |
| B | 49.7 · 47.8 · 51.3 | 40.0 · 38.2 · 41.5 | 41.0 · 38.9 · 42.6 |
| C | 81.0 · 79.9 · 81.9 | 77.9 · 76.9 · 79.1 | 81.1 · 80.0 · 82.2 |
| D | 72.4 · 71.3 · 73.1 | 56.0 · 55.1 · 56.6 | 66.9 · 65.7 · 67.7 |
| E | 29.1 · 28.4 · 29.6 | 29.1 · 28.4 · 29.6 | 29.1 · 28.4 · 29.6 |
| F | 64.1 · 44.2 · 76.8 | 57.2 · 35.6 · 72.0 | 60.4 · 36.9 · 75.1 |
| G | 58.0 · 55.0 · 60.5 | 54.6 · 50.6 · 58.0 | 55.5 · 52.0 · 58.4 |
| I | 70.4 · 68.5 · 71.7 | 66.7 · 64.1 · 68.7 | 68.4 · 66.2 · 70.0 |
| L | 48.7 · 43.1 · 52.1 | 40.2 · 35.8 · 43.3 | 43.0 · 37.1 · 46.9 |

### valle

| Bot | freshness | lowcost | convenience |
|---|---|---|---|
| A | 58.3 · 56.5 · 60.0 | 57.9 · 55.8 · 59.9 | 57.0 · 54.9 · 58.9 |
| B | 36.6 · 35.7 · 37.5 | 29.1 · 28.4 · 29.6 | 29.1 · 28.4 · 29.6 |
| C | 68.7 · 66.5 · 70.7 | 62.1 · 59.7 · 64.4 | 64.1 · 61.5 · 66.3 |
| D | 65.0 · 63.6 · 65.9 | 51.2 · 50.2 · 52.0 | 58.9 · 57.4 · 60.0 |
| E | 29.1 · 28.4 · 29.6 | 29.1 · 28.4 · 29.6 | 29.1 · 28.4 · 29.6 |
| F | 40.9 · 28.6 · 65.6 | 38.7 · 28.6 · 63.2 | 39.3 · 28.6 · 64.1 |
| G | 53.9 · 52.0 · 55.7 | 54.6 · 52.4 · 56.5 | 53.7 · 51.6 · 55.6 |
| I | 61.3 · 59.1 · 63.4 | 60.3 · 57.9 · 62.5 | 59.8 · 57.5 · 62.1 |
| L | 52.2 · 46.4 · 55.4 | 51.9 · 45.4 · 55.3 | 50.2 · 43.0 · 53.8 |

## Explicabilidad

Cobertura media 99.9% · mínima por corrida 85.7%

KPIs con más cambios sin causa registrada:

- TRUCKS: 40
- BWR: 8

## Óptimos del bot buscador

| Escenario | Estrategia | Puntaje | En extremo | dcCount | dcType | dcSize | flowFresh | flowChilled | flowAmbient | flowFrozen | freshFreq | chilledFreq | ambientFreq | frozenFreq | csl | info | sharing | forecast | collaboration | consolidation | receiving | window | maintenance | multiTemp | telemetry | dcSafetyDays | policy | dedicatedFresh |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| kaigan | freshness | 76.5 | freshFreq | -1 | stocking | medium | dc | dc | dc | dc | 21 | 3 | 3 | 3 | 0.97 | pos_terminal | daily | causal | cpfr | combined | scan | offpeak | predictive | true | true | 0 | tanpin | true |
| kaigan | lowcost | 75.3 | freshFreq | -1 | stocking | medium | dc | dc | dc | dc | 21 | 3 | 3 | 2 | 0.97 | pos_terminal | daily | causal | cpfr | combined | scan | offpeak | predictive | false | true | 0 | tanpin | true |
| kaigan | convenience | 78.9 | freshFreq | -1 | stocking | medium | dc | dc | dc | dc | 21 | 3 | 2 | 1 | 0.97 | pos_terminal | daily | causal | cpfr | combined | scan | offpeak | predictive | false | true | 0 | tanpin | true |
| redriver | freshness | 89.2 | — | 8 | stocking | small | dsd | dc | dc | dc | 14 | 3 | 2 | 1 | 0.97 | pos_terminal | daily | causal | cpfr | supplier | scan | offpeak | predictive | false | true | 2 | tanpin | true |
| redriver | lowcost | 82.0 | — | 6 | stocking | small | dsd | dsd | dc | dc | 14 | 7 | 2 | 1 | 0.95 | pos_terminal | daily | causal | cpfr | supplier | scan | offpeak | predictive | false | true | 4 | tanpin | true |
| redriver | convenience | 90.1 | ambientFreq | 8 | stocking | small | dsd | dc | dc | dc | 14 | 3 | 1 | 1 | 0.97 | pos_terminal | daily | causal | cpfr | supplier | scan | offpeak | predictive | false | true | 2 | tanpin | true |
| valle | freshness | 80.9 | — | -1 | stocking | medium | dc | dsd | dc | dc | 14 | 14 | 3 | 2 | 0.97 | pos_terminal | daily | causal | cpfr | supplier | scan | offpeak | predictive | false | true | 0 | tanpin | true |
| valle | lowcost | 80.2 | dcCount, csl, freshFreq | 0 | stocking | medium | dsd | dsd | dsd | dsd | 21 | 14 | 3 | 2 | 0.85 | pos_terminal | daily | causal | cpfr | supplier | scan | offpeak | predictive | true | true | 0 | tanpin | true |
| valle | convenience | 78.9 | dcCount, freshFreq | 0 | stocking | medium | dsd | dsd | dsd | dsd | 21 | 14 | 3 | 2 | 0.95 | pos_terminal | daily | causal | cpfr | supplier | scan | offpeak | predictive | true | true | 0 | tanpin | true |
