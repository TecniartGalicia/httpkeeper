/**
 * Ficheros de entorno del formato JetBrains: `http-client.env.json` y
 * `http-client.private.env.json`.
 *
 * Es la familia de peticiones más votada del proyecto original (#229, #627:
 * +83 votos): entornos que viven en el repositorio, junto a los ficheros
 * `.http`, en vez de en los ajustes del editor. El privado va en `.gitignore`
 * y manda sobre el público, así que el equipo comparte el público y cada uno
 * pone sus claves en el privado.
 *
 * Sin `vscode`: lo usan el editor y el runner.
 */
import * as fs from 'fs';
import * as path from 'path';

export const FICHERO_PUBLICO = 'http-client.env.json';
export const FICHERO_PRIVADO = 'http-client.private.env.json';

export type Entornos = Record<string, Record<string, string>>;

/**
 * Sube carpeta a carpeta desde `desde` y devuelve la primera que tenga alguno
 * de los dos ficheros. `tope` (la raíz del espacio de trabajo, normalmente)
 * frena la búsqueda: más arriba no es del proyecto.
 */
export function carpetaDeEntornos(desde: string, tope?: string): string | undefined {
    let dir = path.resolve(desde);
    const limite = tope ? path.resolve(tope) : undefined;
    for (;;) {
        if (fs.existsSync(path.join(dir, FICHERO_PUBLICO)) || fs.existsSync(path.join(dir, FICHERO_PRIVADO))) {
            return dir;
        }
        if (limite && dir === limite) {
            return undefined;
        }
        const padre = path.dirname(dir);
        if (padre === dir) {
            return undefined;
        }
        dir = padre;
    }
}

/**
 * Público + privado, el privado encima. Un JSON roto no tumba nada: se avisa
 * y se sigue con lo que haya, que es lo que uno quiere mientras edita el
 * fichero.
 */
export function leerEntornos(carpeta: string, avisar: (mensaje: string) => void = () => { /* silencio */ }): Entornos {
    const fuera: Entornos = {};
    for (const nombre of [FICHERO_PUBLICO, FICHERO_PRIVADO]) {
        const ruta = path.join(carpeta, nombre);
        if (!fs.existsSync(ruta)) {
            continue;
        }
        try {
            const json = JSON.parse(fs.readFileSync(ruta, 'utf8'));
            if (typeof json !== 'object' || json === null) {
                avisar(`${nombre}: se esperaba un objeto con un entorno por clave`);
                continue;
            }
            for (const [entorno, vars] of Object.entries(json)) {
                if (typeof vars !== 'object' || vars === null) {
                    continue;
                }
                fuera[entorno] = { ...(fuera[entorno] ?? {}), ...aTexto(vars as Record<string, unknown>) };
            }
        } catch (e) {
            avisar(`${nombre}: ${e instanceof Error ? e.message : String(e)}`);
        }
    }
    return fuera;
}

/** Variables del entorno pedido, o `{}` si no existe. */
export function variablesDelEntorno(carpeta: string | undefined, entorno: string | undefined, avisar?: (m: string) => void): Record<string, string> {
    if (!carpeta || !entorno) {
        return {};
    }
    return leerEntornos(carpeta, avisar)[entorno] ?? {};
}

/** Un valor que no sea texto (número, objeto) se usa tal cual se escribiría en la petición. */
const aTexto = (o: Record<string, unknown>): Record<string, string> =>
    Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]));
