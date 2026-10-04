/** Persistencia de corridas (AD-11): localStorage con respaldo en memoria. */

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class MemoryStorage implements KeyValueStorage {
  private data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.has(key) ? this.data.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
}

export interface StorageHandle {
  storage: KeyValueStorage;
  /** false si se cayó al respaldo en memoria: la UI debe pedir exportar antes de cerrar. */
  persistent: boolean;
  reason?: string;
}

/**
 * Detecta si el almacenamiento candidato (por omisión globalThis.localStorage) funciona de verdad:
 * en modo privado o en iframes con almacenamiento bloqueado, el acceso o la escritura lanzan error.
 */
export function openStorage(candidate?: () => KeyValueStorage | undefined): StorageHandle {
  try {
    const s = candidate ? candidate() : (globalThis as { localStorage?: KeyValueStorage }).localStorage;
    if (!s) return { storage: new MemoryStorage(), persistent: false, reason: "localStorage no existe" };
    const probe = "__mt4035_probe__";
    s.setItem(probe, "1");
    if (s.getItem(probe) !== "1") throw new Error("lectura inconsistente");
    s.removeItem(probe);
    return { storage: s, persistent: true };
  } catch (err) {
    return { storage: new MemoryStorage(), persistent: false, reason: `localStorage no disponible: ${(err as Error).message}` };
  }
}

export interface StoredRun<T> {
  id: string;
  schemaVersion: number;
  savedAt: string;
  title: string;
  data: T;
}

interface Envelope<T> {
  schemaVersion: number;
  runs: StoredRun<T>[];
}

export type Migration<T> = (run: StoredRun<unknown>) => StoredRun<T> | null;

/**
 * Repositorio de corridas bajo una sola clave (p. ej. "mt4035.scm.runs.v1").
 * Toda lectura/escritura va en try/catch; los errores se reportan en lastError sin romper el juego.
 */
export class RunRepository<T> {
  lastError: string | null = null;

  constructor(
    private readonly handle: StorageHandle,
    private readonly key: string,
    private readonly schemaVersion: number,
    private readonly migrate?: Migration<T>,
  ) {}

  get persistent(): boolean {
    return this.handle.persistent;
  }

  list(): StoredRun<T>[] {
    try {
      const raw = this.handle.storage.getItem(this.key);
      if (!raw) return [];
      const env = JSON.parse(raw) as Envelope<unknown>;
      if (!Array.isArray(env?.runs)) throw new Error("estructura inválida");
      const out: StoredRun<T>[] = [];
      for (const r of env.runs) {
        if (r.schemaVersion === this.schemaVersion) out.push(r as StoredRun<T>);
        else {
          const m = this.migrate?.(r);
          if (m) out.push(m);
        }
      }
      return out;
    } catch (err) {
      this.lastError = `No se pudieron leer las corridas guardadas: ${(err as Error).message}`;
      return [];
    }
  }

  get(id: string): StoredRun<T> | undefined {
    return this.list().find((r) => r.id === id);
  }

  save(run: Omit<StoredRun<T>, "schemaVersion">): boolean {
    const runs = this.list().filter((r) => r.id !== run.id);
    runs.push({ ...run, schemaVersion: this.schemaVersion });
    return this.write(runs);
  }

  remove(id: string): boolean {
    return this.write(this.list().filter((r) => r.id !== id));
  }

  private write(runs: StoredRun<T>[]): boolean {
    try {
      const env: Envelope<T> = { schemaVersion: this.schemaVersion, runs };
      this.handle.storage.setItem(this.key, JSON.stringify(env));
      this.lastError = null;
      return true;
    } catch (err) {
      this.lastError = `No se pudo guardar (¿almacenamiento lleno o bloqueado?): ${(err as Error).message}`;
      return false;
    }
  }
}
