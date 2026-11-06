"""Arma index.html a partir de plantilla.html, las series del simulador y modelador.py.

Uso (desde mt4035/simulador-scm-red/app):
    npx tsx scripts/series-modelador.ts ../../modelador-series-tiempo/series.json
    python3 ../../modelador-series-tiempo/construir.py
"""
from pathlib import Path

d = Path(__file__).parent
html = (d / "plantilla.html").read_text(encoding="utf-8")
series = (d / "series.json").read_text(encoding="utf-8")
python = (d / "modelador.py").read_text(encoding="utf-8")
assert "</script" not in python.lower() and "</script" not in series.lower()
html = html.replace("/*__SERIES__*/", series).replace("/*__PYTHON__*/", "\n" + python)
(d / "index.html").write_text(html, encoding="utf-8")
print(f"index.html: {len(html) / 1024:.0f} KB")
