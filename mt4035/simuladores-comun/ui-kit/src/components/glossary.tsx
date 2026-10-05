/**
 * Glosario del simulador (AD-32): diálogo con todos los términos y `Gloss`, que marca en cualquier texto
 * los términos definidos y muestra su definición al pasar el mouse (o al enfocarlos con el teclado).
 * Cada simulador aporta sus entradas con `GlossaryContext.Provider`.
 */
import { createContext, type ComponentChildren } from "preact";
import { useContext, useEffect, useRef, useState } from "preact/hooks";

export interface GlossaryEntry {
  /** Término o sigla tal como aparece en la interfaz (p. ej. "OSA"). */
  term: string;
  /** Nombre completo, con la sigla desarrollada en inglés cuando aplica. */
  full?: string;
  def: string;
  /** Otras formas en que aparece el término (plurales, variantes). */
  aliases?: string[];
  /** Grupo en el diálogo: "KPI", "Red y flujo", etc. */
  category: string;
}

export const GlossaryContext = createContext<GlossaryEntry[]>([]);

interface Matcher {
  re: RegExp;
  byKey: Map<string, GlossaryEntry>;
}

const cache = new WeakMap<GlossaryEntry[], Matcher>();
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function matcherFor(entries: GlossaryEntry[]): Matcher | null {
  if (!entries.length) return null;
  let m = cache.get(entries);
  if (!m) {
    const byKey = new Map<string, GlossaryEntry>();
    for (const e of entries) for (const k of [e.term, ...(e.aliases ?? [])]) byKey.set(k.toLowerCase(), e);
    const alts = [...byKey.keys()].sort((a, b) => b.length - a.length).map(escape);
    // Sin letras ni dígitos pegados al término, para no marcar «CD» dentro de otra palabra.
    m = { re: new RegExp(`(?<![\\p{L}\\p{N}])(${alts.join("|")})(?![\\p{L}\\p{N}])`, "giu"), byKey };
    cache.set(entries, m);
  }
  return m;
}

/** Texto de la definición para un tooltip: «OSA (On-Shelf Availability): …». */
export const definitionText = (e: GlossaryEntry) => `${e.full ? `${e.term} (${e.full})` : e.term}: ${e.def}`;

/** Definiciones de los términos que aparecen en un texto, para el atributo `title` de botones y opciones. */
export function glossaryTitle(text: string, entries: GlossaryEntry[]): string | undefined {
  const m = matcherFor(entries);
  if (!m) return undefined;
  const found = new Set<GlossaryEntry>();
  for (const x of text.matchAll(m.re)) found.add(m.byKey.get(x[0].toLowerCase())!);
  return found.size ? [...found].map(definitionText).join("\n") : undefined;
}

/** Marca los términos del glosario dentro de un texto (la primera aparición de cada uno). */
export function Gloss({ text }: { text: string | undefined | null }) {
  const entries = useContext(GlossaryContext);
  if (!text) return null;
  const m = matcherFor(entries);
  if (!m) return <>{text}</>;
  const out: ComponentChildren[] = [];
  const seen = new Set<GlossaryEntry>();
  let last = 0;
  for (const x of text.matchAll(m.re)) {
    const e = m.byKey.get(x[0].toLowerCase())!;
    if (seen.has(e)) continue;
    seen.add(e);
    out.push(text.slice(last, x.index));
    out.push(
      <abbr class="gloss" title={definitionText(e)} key={x.index}>
        {x[0]}
      </abbr>,
    );
    last = x.index! + x[0].length;
  }
  out.push(text.slice(last));
  return <>{out}</>;
}

/** Diálogo con el glosario completo, agrupado por categoría y con búsqueda. */
export function GlossaryDialog({ open, onClose, title = "Glosario" }: { open: boolean; onClose: () => void; title?: string }) {
  const entries = useContext(GlossaryContext);
  const ref = useRef<HTMLDialogElement>(null);
  const [q, setQ] = useState("");
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setQ("");
      d.showModal?.();
    }
    if (!open && d.open) d.close?.();
  }, [open]);
  const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const nq = norm(q.trim());
  const shown = entries.filter((e) => !nq || norm(`${e.term} ${e.full ?? ""} ${e.def} ${(e.aliases ?? []).join(" ")}`).includes(nq));
  const cats = [...new Set(shown.map((e) => e.category))];
  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby="glossary-title" data-testid="glossary" style={{ maxWidth: "min(760px, calc(100vw - 32px))" }}>
      <div class="row" style={{ justifyContent: "space-between" }}>
        <h2 id="glossary-title" style={{ margin: 0 }}>
          {title}
        </h2>
        <button type="button" onClick={onClose} aria-label="Cerrar glosario">
          ✕
        </button>
      </div>
      <p class="small muted">Siglas y conceptos que usa el simulador. En la interfaz, los términos subrayados con puntos muestran su definición al pasar el mouse.</p>
      <input type="text" placeholder="Buscar término…" aria-label="Buscar en el glosario" value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} style={{ width: "100%" }} />
      <div style={{ maxHeight: "60vh", overflowY: "auto", marginTop: "0.5rem" }}>
        {cats.length === 0 && <p class="muted">Sin resultados.</p>}
        {cats.map((c) => (
          <section key={c}>
            <h3 style={{ marginBottom: "0.25rem" }}>{c}</h3>
            <dl class="glossary-list">
              {shown
                .filter((e) => e.category === c)
                .sort((a, b) => a.term.localeCompare(b.term, "es"))
                .map((e) => (
                  <div key={e.term}>
                    <dt>
                      <strong>{e.term}</strong>
                      {e.full && <span class="muted"> · {e.full}</span>}
                    </dt>
                    <dd>{e.def}</dd>
                  </div>
                ))}
            </dl>
          </section>
        ))}
      </div>
    </dialog>
  );
}
