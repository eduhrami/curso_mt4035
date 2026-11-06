"""Arma index.html a partir de plantilla.html, el generador de demanda del simulador y modelador.py.

El generador (generador.js) empaqueta con esbuild el código de demanda del simulador SCM
(app/src/forecast.ts + presets + params), para reproducir en el navegador la historia de cualquier
región, escenario y semilla. Requiere node en el PATH y `npm install` en simulador-scm-red/app.

Uso: python3 mt4035/modelador-series-tiempo/construir.py
"""
import subprocess
from pathlib import Path

d = Path(__file__).parent
app = d.parent / "simulador-scm-red" / "app"
subprocess.run(
    ["npx", "esbuild", "scripts/generador-modelador.ts", "--bundle", "--format=iife", "--global-name=HoshiDemanda",
     "--minify", "--target=es2019", "--alias:@mt4035/sim-core=../../simuladores-comun/core/src/rng.ts",
     f"--outfile={d / 'generador.js'}"],
    cwd=app, check=True, capture_output=True,
)
html = (d / "plantilla.html").read_text(encoding="utf-8")
gen = (d / "generador.js").read_text(encoding="utf-8")
python = (d / "modelador.py").read_text(encoding="utf-8")
assert "</script" not in python.lower() and "</script" not in gen.lower()
html = html.replace("/*__GENERADOR__*/", gen).replace("/*__PYTHON__*/", "\n" + python)
(d / "index.html").write_text(html, encoding="utf-8")
print(f"index.html: {len(html) / 1024:.0f} KB")
