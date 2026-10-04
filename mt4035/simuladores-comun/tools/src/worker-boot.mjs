// Arranque de los procesos de trabajo: en Node 20 el cargador de tsx no se hereda con --import,
// así que se registra aquí antes de importar el worker en TypeScript.
import { register } from "tsx/esm/api";

register();
await import("./worker.ts");
