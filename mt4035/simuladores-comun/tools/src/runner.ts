/** Runner de auto-juego: reparte las tareas entre procesos de trabajo y junta los registros. */
import { Worker } from "node:worker_threads";
import { cpus } from "node:os";
import { runTask } from "./run-task.ts";
import type { AutoplayAdapter, RunRecord, Task } from "./types.ts";

export interface RunOptions {
  bots: string[];
  scenarios: string[];
  seeds: number[];
  /** 0 = en el mismo proceso (útil en pruebas); por omisión núcleos − 1. */
  workers?: number;
  onProgress?: (done: number, total: number) => void;
}

export function makeTasks(o: Pick<RunOptions, "bots" | "scenarios" | "seeds">): Task[] {
  return o.scenarios.flatMap((scenario) => o.seeds.flatMap((seed) => o.bots.map((bot) => ({ bot, scenario, seed }))));
}

const taskKey = (r: Task) => `${r.scenario}|${String(r.seed).padStart(8, "0")}|${r.bot}|${JSON.stringify(r.args ?? null)}`;

/**
 * Grupo persistente de procesos de trabajo. adapterUrl es la URL (file://…) del módulo cuyo export
 * default es el adaptador; cada proceso lo carga una vez. workers = 0 ejecuta en el mismo proceso.
 */
export class WorkerPool {
  private workers: Worker[] = [];
  private adapter?: AutoplayAdapter;
  private engine?: ReturnType<AutoplayAdapter["createEngine"]>;

  private constructor(
    private readonly adapterUrl: string,
    private readonly size: number,
  ) {}

  static async open(adapterUrl: string, workers?: number): Promise<WorkerPool> {
    const pool = new WorkerPool(adapterUrl, workers ?? Math.max(1, cpus().length - 1));
    if (pool.size === 0) {
      pool.adapter = (await import(adapterUrl)).default as AutoplayAdapter;
      pool.engine = pool.adapter.createEngine();
      return pool;
    }
    const boot = new URL("./worker-boot.mjs", import.meta.url);
    pool.workers = await Promise.all(
      Array.from({ length: pool.size }, () => {
        return new Promise<Worker>((resolve, reject) => {
          const w = new Worker(boot, { workerData: { adapterUrl } });
          w.once("message", () => resolve(w));
          w.once("error", reject);
        });
      }),
    );
    return pool;
  }

  async run(tasks: readonly Task[], onProgress?: (done: number, total: number) => void): Promise<RunRecord[]> {
    if (this.size === 0) {
      return tasks.map((t, i) => {
        const r = runTask(this.adapter!, this.engine!, t);
        onProgress?.(i + 1, tasks.length);
        return r;
      });
    }
    const results: RunRecord[] = [];
    let next = 0;
    let done = 0;
    await Promise.all(
      this.workers.map(
        (w) =>
          new Promise<void>((resolve, reject) => {
            const feed = () => {
              if (next >= tasks.length) {
                w.off("message", onMsg);
                w.off("error", reject);
                resolve();
              } else w.postMessage(tasks[next++]!);
            };
            const onMsg = (msg: RunRecord) => {
              results.push(msg);
              onProgress?.(++done, tasks.length);
              feed();
            };
            w.on("message", onMsg);
            w.on("error", reject);
            feed();
          }),
      ),
    );
    // Orden estable independiente del reparto entre procesos.
    return results.sort((a, b) => (taskKey(a) < taskKey(b) ? -1 : taskKey(a) > taskKey(b) ? 1 : 0));
  }

  async close(): Promise<void> {
    await Promise.all(this.workers.map((w) => w.terminate()));
    this.workers = [];
  }
}

export async function runAutoplay(adapterUrl: string, o: RunOptions): Promise<RunRecord[]> {
  const tasks = makeTasks(o);
  const pool = await WorkerPool.open(adapterUrl, Math.min(o.workers ?? Math.max(1, cpus().length - 1), tasks.length));
  try {
    return await pool.run(tasks, o.onProgress);
  } finally {
    await pool.close();
  }
}
