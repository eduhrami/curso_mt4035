/**
 * Carpeta de los reportes de auto-juego: contienen los óptimos por escenario (las respuestas de referencia),
 * así que viven en el repositorio privado (privado/, ignorado por el público), no en este.
 */
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const REPORTS_DIR = fileURLToPath(new URL("../../../../privado/mt4035/simulador-logistica-ultima-milla/autoplay-reports/", import.meta.url));
mkdirSync(REPORTS_DIR, { recursive: true });
