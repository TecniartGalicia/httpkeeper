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
 *   # @assert headers.content-type contains json   (o `header.`, da igual)
 *   # @assert time < 2000
 *   # @assert sse.count == 3            (respuestas text/event-stream)
 *   # @assert ws.last contains eco      (transcripciones WebSocket)
 */
import { leerEventos } from './sse';
import { leerTranscripcion } from './websocket';

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
// Escribir `header.` en singular es lo normal: la cabecera es una. Se aceptan
// las dos formas antes que dejar fallar una asercion por una `s`.
const PREFIJOS_CABECERA = ['headers.', 'header.'];

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
    const prefijoCabecera = PREFIJOS_CABECERA.find(pre => sujeto.startsWith(pre));
    if (prefijoCabecera) {
        const nombre = sujeto.slice(prefijoCabecera.length).toLowerCase();
        const cabeceras = r.cabeceras ?? {};
        const clave = Object.keys(cabeceras).find(k => k.toLowerCase() === nombre);
        return clave ? String(cabeceras[clave] ?? '') : '';
    }
    if (sujeto === 'body' || sujeto === 'body.*') {
        return r.cuerpo ?? '';
    }
    if (sujeto.startsWith('sse.')) {
        const eventos = leerEventos(r.cuerpo ?? '');
        switch (sujeto.slice(4)) {
            case 'count': return String(eventos.length);
            case 'first': return eventos[0]?.datos ?? '';
            case 'last': return eventos[eventos.length - 1]?.datos ?? '';
            default: return '';
        }
    }
    if (sujeto.startsWith('ws.')) {
        const { recibidos } = leerTranscripcion(r.cuerpo ?? '');
        switch (sujeto.slice(3)) {
            case 'count': return String(recibidos.length);
            case 'first': return recibidos[0] ?? '';
            case 'last': return recibidos[recibidos.length - 1] ?? '';
            default: return '';
        }
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

/**
 * ¿Es un sujeto que sabemos resolver? Un `header.content-tipe` mal escrito
 * valía '' y la aserción fallaba como si el servidor tuviera la culpa; peor
 * todavía con `!=`, donde pasaba y el fichero parecía verde.
 */
export function sujetoConocido(sujeto: string): boolean {
    return sujeto === 'status'
        || sujeto === 'time'
        || sujeto === 'body'
        || sujeto === 'body.*'
        || sujeto.startsWith('body.$')
        || /^(sse|ws).(count|first|last)$/.test(sujeto)
        || PREFIJOS_CABECERA.some(pre => sujeto.startsWith(pre) && sujeto.length > pre.length);
}

export function comprobar(aserciones: Asercion[], r: RespuestaComprobable): Resultado[] {
    return aserciones.map(a => {
        if (!sujetoConocido(a.sujeto)) {
            return { asercion: a, pasa: false, obtenido: `no sé qué es "${a.sujeto}"` };
        }
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
