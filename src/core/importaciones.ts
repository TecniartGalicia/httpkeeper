/**
 * `import ./comun.http` y `run #nombre`, como en JetBrains.
 *
 * Es la otra mitad de la familia más votada del original (#182 +52, #845 +29,
 * #1148 +23, #943 +22, #402 +26): variables y peticiones compartidas entre
 * ficheros. Un fichero importa a otro; con eso hereda sus `@variables` y puede
 * ejecutar sus peticiones con nombre.
 *
 * Sin `vscode`: lo usan el editor y el runner.
 */
import * as fs from 'fs';
import * as path from 'path';
import { Bloque, trocear } from './secuencia';

const IMPORT = /^\s*import\s+(?:"([^"]+)"|'([^']+)'|(\S+))\s*$/gm;
export const LINEA_IMPORT = /^\s*import\s+\S/;
export const RUN = /^\s*run\s+#(\S+)\s*$/m;

export interface Importado {
    fichero: string;
    texto: string;
}

/** Rutas de `import` de un texto, resueltas contra la carpeta del fichero que las contiene. */
export function rutasImportadas(texto: string, ficheroBase: string): string[] {
    const dir = path.dirname(path.resolve(ficheroBase));
    return [...texto.matchAll(IMPORT)].map(m => path.resolve(dir, m[1] ?? m[2] ?? m[3]));
}

/**
 * Todos los ficheros importados, en orden de aparición y sin repetir: un
 * fichero que se importa a sí mismo, o dos que se importan mutuamente, se leen
 * una sola vez. Los que no existen se saltan y se devuelven aparte para poder
 * avisar.
 */
export function cerrarImportaciones(
    fichero: string,
    texto?: string,
    leer: (f: string) => string = (f) => fs.readFileSync(f, 'utf8')
): { importados: Importado[]; faltan: string[] } {
    const raiz = path.resolve(fichero);
    const vistos = new Set<string>([raiz]);
    const cola = rutasImportadas(texto ?? leer(raiz), raiz);
    const importados: Importado[] = [];
    const faltan: string[] = [];
    while (cola.length) {
        const f = cola.shift()!;
        if (vistos.has(f)) {
            continue;
        }
        vistos.add(f);
        if (!fs.existsSync(f)) {
            faltan.push(f);
            continue;
        }
        const t = leer(f);
        importados.push({ fichero: f, texto: t });
        cola.push(...rutasImportadas(t, f));
    }
    return { importados, faltan };
}

/** Bloque con `@name` = nombre: primero en el propio texto, luego en los importados, en orden. */
export function bloqueLlamado(nombre: string, texto: string, importados: Importado[]): (Bloque & { fichero?: string }) | undefined {
    const propio = trocear(texto).find(b => b.nombre === nombre);
    if (propio) {
        return propio;
    }
    for (const i of importados) {
        const b = trocear(i.texto).find(x => x.nombre === nombre);
        if (b) {
            return { ...b, fichero: i.fichero };
        }
    }
    return undefined;
}

/**
 * Si el bloque es `run #x`, devuelve el bloque real (con su `@name`, para que
 * la respuesta se guarde con ese nombre); si no, el mismo bloque. Conserva la
 * línea del `run` para que los errores señalen donde está escrito.
 */
export function resolverRun(bloque: Bloque, texto: string, importados: Importado[]): Bloque & { fichero?: string } {
    const m = RUN.exec(bloque.texto);
    if (!m) {
        return bloque;
    }
    const real = bloqueLlamado(m[1], texto, importados);
    if (!real) {
        throw new Error(`run #${m[1]}: no hay ninguna petición con ese nombre en este fichero ni en los importados`);
    }
    return { ...real, linea: bloque.linea };
}

/** `@variable = valor` de un texto, en orden de aparición (la última definición gana). */
export function variablesDeTexto(texto: string): Record<string, string> {
    const fuera: Record<string, string> = {};
    for (const m of texto.matchAll(/^\s*@([A-Za-z_][\w.-]*)\s*=\s*(.*?)\s*$/gm)) {
        fuera[m[1]] = m[2];
    }
    return fuera;
}

/** Variables de los importados (en orden) con las propias encima. */
export function variablesConImportados(texto: string, importados: Importado[]): Record<string, string> {
    let fuera: Record<string, string> = {};
    for (const i of importados) {
        fuera = { ...fuera, ...variablesDeTexto(i.texto) };
    }
    return { ...fuera, ...variablesDeTexto(texto) };
}
