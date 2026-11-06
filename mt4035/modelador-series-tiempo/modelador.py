# ============================================================
# Modelador de series de tiempo · Hoshi Mart (MT4035)
# Descomposición multiplicativa: y_t = L · (1+g)^(t/52) · S_q · (1 + e_t)
# ============================================================
# Celda 1 · Datos: CSV descargado de la pestaña «Pronóstico» del simulador
import math
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

ARCHIVO = "hoshi-mart-demanda-kaigan-4101-hasta-0.csv"  # cambia por el nombre de tu archivo
ANIO = 0   # año que pronosticas: 0 = A1, 1 = A2, 2 = A3 (en A2 y A3 el CSV trae también las semanas jugadas)

df = pd.read_csv(ARCHIVO)
df = df[df["semana"] < 52 * ANIO].copy()  # toda la historia disponible antes del año a pronosticar
df["t"] = df["semana"] / 52               # años desde el inicio de A1 (negativo en la historia)
df["q"] = (df["semana"] // 13) % 4    # trimestre 0..3 (T1..T4)
y = df["total"].to_numpy()
t = df["t"].to_numpy()
q = df["q"].to_numpy()

# Celda 2 · Paso 1: tendencia preliminar exponencial (años completos: las estaciones se compensan)
b, a = np.polyfit(t, np.log(y), 1)
tendencia = np.exp(a + b * t)

# Celda 3 · Paso 2: índices estacionales = promedio por trimestre de y / tendencia, normalizados a promedio 1
razon = y / tendencia
S = np.array([razon[q == k].mean() for k in range(4)])
S = S / S.mean()

# Celda 4 · Paso 3: desestacionalizar y reestimar nivel y crecimiento
desest = y / S[q]
b, a = np.polyfit(t, np.log(desest), 1)
L = math.exp(a)            # nivel en la semana 0 (inicio de A1), índice 1
g = math.exp(b) - 1        # crecimiento anual compuesto

# Celda 5 · Paso 4: modelo, residuo, CV y p95 del año a pronosticar
modelo = L * (1 + g) ** t * S[q]
residuo = y / modelo - 1
L = L * (1 + residuo.mean())          # corrige el sesgo del logaritmo (residuo promedio 0)
modelo = L * (1 + g) ** t * S[q]
residuo = y / modelo - 1
CV = residuo.std(ddof=1)

nivel_anio = L * (1 + g) ** ANIO      # nivel base al inicio del año a pronosticar
semanas = np.arange(52 * ANIO, 52 * ANIO + 52)
pron = L * (1 + g) ** (semanas / 52) * S[(semanas // 13) % 4]

def cola(x):  # fracción esperada de semanas del año por encima de x (residuo normal)
    z = (x / pron - 1) / CV
    return np.mean([0.5 * math.erfc(v / math.sqrt(2)) for v in z])

lo, hi = 0.0, pron.max() * 3
for _ in range(60):              # bisección: el valor que solo 5% de las semanas supera
    mid = (lo + hi) / 2
    lo, hi = (mid, hi) if cola(mid) > 0.05 else (lo, mid)
p95 = (lo + hi) / 2

wape = np.abs(y - modelo).sum() / y.sum()
print(f"Valores para F-01 (año A{ANIO + 1})")
print(f"  Nivel base:        {nivel_anio:,.1f} unidades por tienda por día")
print(f"  Crecimiento anual: {g * 100:.1f} %")
for k in range(4):
    print(f"  Índice T{k + 1}:         {S[k]:.3f}")
print(f"  CV semanal:        {CV * 100:.1f} %")
print(f"  p95 semanal:       {p95:,.1f}")
print(f"  (WAPE del ajuste en la historia: {wape * 100:.2f} %)")

# Celda 6 · Gráficas: serie real, modelo y pronóstico del año con su p95
fig, ax = plt.subplots(3, 1, figsize=(10, 9), sharex=False)
ax[0].plot(df["semana"], y, label="Real (total)", color="#888")
ax[0].plot(df["semana"], modelo, label="Modelo", color="#1f3b73")
ax[0].plot(semanas, pron, "--", label=f"Pronóstico A{ANIO + 1}", color="#b4490f")
ax[0].axhline(p95, ls=":", color="#b4490f", label=f"p95 A{ANIO + 1}")
ax[0].set_title("Demanda por tienda por día"); ax[0].legend()
ax[1].bar(["T1", "T2", "T3", "T4"], S, color="#1f3b73"); ax[1].axhline(1, color="k", lw=0.8)
ax[1].set_ylim(min(S.min(), 1) * 0.95, max(S.max(), 1) * 1.03); ax[1].set_title("Índices estacionales")
ax[2].bar(df["semana"], residuo * 100, color="#888"); ax[2].set_title("Residuo (%)")
plt.tight_layout(); plt.show()
