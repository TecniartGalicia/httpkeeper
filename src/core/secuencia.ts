/**
 * Ejecutar todas las peticiones de un fichero en orden.
 *
 * Es la petición número dos más votada del proyecto original (+62 votos desde
 * 2020) y la mitad de lo que hace falta para que un `.http` sirva en
 * integración continua: sin secuencia no hay suite, y sin suite no hay motivo
 * para preferir un fichero a una herramienta de escritorio.
 */

/** Un bloque de fichero: su texto y dónde empieza, para poder situar errores. */
export interface Bloque {
    texto: string;
    /** Línea (base 0) donde empieza el bloque dentro del fichero. */
    linea: number;
    nombre?: string;
}

const SALTOS = new RegExp(String.fromCharCode(13) + '?' + String.fromCharCode(10));
const SEPARADOR = /^#{3,}/;
const NOMBRE = /^\s*(?:#|\/\/)\s*@name\s+(\S+)/m;

/**
 * Trocea un fichero `.http` por sus separadores.
 *
 * Un `###` al principio de línea separa SIEMPRE, sin mirar si estamos dentro
 * de un cuerpo. Parece tosco y lo es, pero es exactamente lo que hace REST
 * Client desde 2016 (`Selector.getDelimiterRows`), y los ficheros que la gente
 * ya tiene escritos cuentan con ello. Ser más listo aquí rompería la
 * compatibilidad, que es lo único que hace este fork instalable sin trabajo.
 *
 * Limitación heredada y conocida: un cuerpo que lleve `###` al principio de una
 * línea —un Markdown dentro de un JSON, por ejemplo— se parte en dos. La salida
 * es indentar esa línea o usar un fichero externo con `< cuerpo.json`.
 */
export function trocear(texto: string): Bloque[] {
    const lineas = texto.split(SALTOS);
    const bloques: Bloque[] = [];
    let actual: string[] = [];
    let inicio = 0;

    const cerrar = () => {
        const t = actual.join(String.fromCharCode(10));
        if (t.trim().length > 0) {
            bloques.push({ texto: t, linea: inicio, nombre: NOMBRE.exec(t)?.[1] });
        }
        actual = [];
    };

    for (let i = 0; i < lineas.length; i++) {
        if (SEPARADOR.test(lineas[i])) {
            cerrar();
            inicio = i + 1;
            continue;
        }
        actual.push(lineas[i]);
    }
    cerrar();
    return bloques;
}

export interface PasoEjecutado {
    nombre: string;
    linea: number;
    estado?: number;
    ms: number;
    error?: string;
    /** Cuerpo de la respuesta, para las aserciones y el informe. */
    cuerpo?: string;
    cabeceras?: Record<string, string | undefined>;
}

export interface OpcionesSecuencia {
    /** Envía un bloque ya resuelto y devuelve la respuesta. */
    enviar(bloque: Bloque): Promise<{ estado: number; cuerpo: string; cabeceras: Record<string, string | undefined> }>;
    /** Sustituye variables usando lo que ya han devuelto las peticiones previas. */
    resolver?(bloque: Bloque): Promise<Bloque>;
    /** Por defecto, un fallo detiene la secuencia. */
    continuarTrasFallo?: boolean;
    /** Se llama al terminar cada paso, para poder ir informando. */
    alTerminarPaso?(paso: PasoEjecutado): void;
}

/**
 * Ejecuta los bloques en orden. Cada respuesta queda disponible para el
 * siguiente bloque antes de resolverlo, que es lo que permite encadenar
 * `{{login.response.body.$.token}}` igual que al enviar a mano.
 *
 * Un fallo detiene la secuencia salvo que se pida lo contrario: encadenar sobre
 * una respuesta que nunca llegó produce errores que no se entienden.
 */
export async function ejecutarSecuencia(bloques: Bloque[], opciones: OpcionesSecuencia): Promise<PasoEjecutado[]> {
    const hechos: PasoEjecutado[] = [];

    for (const bloque of bloques) {
        const t0 = Date.now();
        const nombre = bloque.nombre ?? `#${hechos.length + 1}`;
        let paso: PasoEjecutado;
        try {
            const listo = opciones.resolver ? await opciones.resolver(bloque) : bloque;
            const r = await opciones.enviar(listo);
            paso = { nombre, linea: bloque.linea, estado: r.estado, cuerpo: r.cuerpo, cabeceras: r.cabeceras, ms: Date.now() - t0 };
        } catch (e) {
            paso = { nombre, linea: bloque.linea, error: e instanceof Error ? e.message : String(e), ms: Date.now() - t0 };
        }
        hechos.push(paso);
        opciones.alTerminarPaso?.(paso);
        if (paso.error && !opciones.continuarTrasFallo) {
            break;
        }
    }
    return hechos;
}
