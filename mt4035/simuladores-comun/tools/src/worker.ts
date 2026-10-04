/** Proceso de trabajo: carga el adaptador una vez y ejecuta las tareas que le manda el runner. */
import { parentPort, workerData } from "node:worker_threads";
import { runTask } from "./run-task.ts";
import type { AutoplayAdapter, Task } from "./types.ts";

const { adapterUrl } = workerData as { adapterUrl: string };
const adapter = (await import(adapterUrl)).default as AutoplayAdapter;
const engine = adapter.createEngine();

parentPort!.on("message", (task: Task) => {
  parentPort!.postMessage(runTask(adapter, engine, task));
});
parentPort!.postMessage({ ready: true });
