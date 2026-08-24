/**
 * Aserciones sobre la respuesta, escritas en el propio fichero `.http`.
 *
 * Es la tercera petición más votada del proyecto original (+59 votos desde
 * 2018). Van en un comentario con `@`, como el resto de metadatos, para que un
 * fichero con aserciones lo siga entendiendo cualquier otra herramienta que lea
 * el formato: quien no las conozca, las ignora.
 *
 *   # @assert status == 200
 *   # @assert body.$.token exists
 *   # @assert headers.content-type contains json
 *   # @assert time < 2000
 */

export type Operador = '==' | '!=' | '<' | '>' | 'contains' | 'matches' | 'exists';

export interface Asercion {
    crudo: string;
    sujeto: string;
    operador: Operador;
    esperado: string;
}

export interface Resultado {
    asercion: Asercion;
    pasa: boolean;
    obtenido: string;
}

export interface RespuestaComprobable {
    estado?: number;
    cuerpo?: string;
    cabeceras?: Record<string, string | undefined>;
    ms: number;
}

const LINEA = /^[ \t]*(?:#|\/\/)[ \t]*@assert[ \t]+(.+?)[ \t]*$/gm;
const PARTES = /^(\S+)[ \t]+(==|!=|<|>|contains|matches|exists)[ \t]*(.*)$/;

export function leerAserciones(bloque: string): Asercion[] {
    const fuera: Asercion[] = [];
    LINEA.lastIndex = 0;
    for (const m of bloque.matchAll(LINEA)) {
        const p = PARTES.exec(m[1]);
        if (p) {
            fuera.push({ crudo: m[1], sujeto: p[1], operador: p[2] as Operador, esperado: p[3] ?? '' });
        }
    }
    return fuera;
}

/**
 * Resuelve el sujeto de una aserción contra la respuesta.
 *
 * Reutiliza la sintaxis que ya existe para las variables de petición
 * (`body.$.campo`, `headers.nombre`), más `status` y `time`, para que no haya
 * dos lenguajes distintos dentro del mismo fichero.
 */
export function valorDe(sujeto: string, r: RespuestaComprobable): string {
    if (sujeto === 'status') {
        return String(r.estado ?? '');
    }
    if (sujeto === 'time') {
        return String(r.ms);
    }
    if (sujeto.startsWith('headers.')) {
        const nombre = sujeto.slice('headers.'.length).toLowerCase();
        const cabeceras = r.cabeceras ?? {};
        const clave = Object.keys(cabeceras).find(k => k.toLowerCase() === nombre);
        return clave ? String(cabeceras[clave] ?? '') : '';
    }
    if (sujeto === 'body' || sujeto === 'body.*') {
        return r.cuerpo ?? '';
    }
    if (sujeto.startsWith('body.$')) {
        return porRuta(r.cuerpo, sujeto.slice('body.$'.length).replace(/^\./, ''));
    }
    return '';
}

/** Camino sencillo dentro de un JSON: `a.b[0].c`. Sin JSONPath completo. */
function porRuta(cuerpo: string | undefined, ruta: string): string {
    if (!cuerpo) {
        return '';
    }
    let actual: unknown;
    try {
        actual = JSON.parse(cuerpo);
    } catch {
        return '';
    }
    if (ruta === '') {
        return typeof actual === 'string' ? actual : JSON.stringify(actual);
    }
    for (const trozo of ruta.split('.')) {
        for (const parte of trozo.split(/\[(\d+)\]/).filter(x => x !== '')) {
            if (actual === null || actual === undefined) {
                return '';
            }
            actual = (actual as Record<string, unknown>)[parte];
        }
    }
    if (actual === undefined || actual === null) {
        return '';
    }
    return typeof actual === 'string' ? actual : JSON.stringify(actual);
}

export function comprobar(aserciones: Asercion[], r: RespuestaComprobable): Resultado[] {
    return aserciones.map(a => {
        const obtenido = valorDe(a.sujeto, r);
        const e = a.esperado;
        let pasa: boolean;
        switch (a.operador) {
            case '==': pasa = obtenido === e; break;
            case '!=': pasa = obtenido !== e; break;
            case '<': pasa = Number(obtenido) < Number(e); break;
            case '>': pasa = Number(obtenido) > Number(e); break;
            case 'contains': pasa = obtenido.includes(e); break;
            case 'matches': pasa = coincideSeguro(obtenido, e); break;
            case 'exists': pasa = obtenido !== ''; break;
            default: pasa = false;
        }
        return { asercion: a, pasa, obtenido };
    });
}

/**
 * Una expresión regular escrita por el usuario no puede colgar el editor: se
 * acota el patrón y el texto antes de evaluarla. Un patrón inválido falla la
 * aserción en vez de lanzar.
 */
function coincideSeguro(texto: string, patron: string): boolean {
    if (patron.length === 0 || patron.length > 200) {
        return false;
    }
    try {
        return new RegExp(patron).test(texto.slice(0, 100_000));
    } catch {
        return false;
    }
}
