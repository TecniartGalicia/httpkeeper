/**
 * Parser del formato `.http` para la terminal.
 *
 * El parser del editor resuelve además variables, entornos y variables de
 * sistema, y para eso depende de los proveedores de VS Code: usarlo aquí
 * arrastraría medio editor. El runner ya trae las variables resueltas cuando
 * llega a este punto, así que sólo hace falta leer la petición.
 *
 * Cubre lo que un fichero de integración continua usa: método, URL, cabeceras,
 * cuerpo en línea y cuerpo desde fichero con `< ruta`. Lo que no cubre —cURL
 * pegado, multipart construido a mano— se dice en el README en vez de fallar
 * a medias.
 */
import * as fs from 'fs';
import * as path from 'path';

export interface PeticionMinima {
    metodo: string;
    url: string;
    cabeceras: Record<string, string>;
    cuerpo?: string;
}

const METODOS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'TRACE', 'CONNECT'];
const SALTOS = new RegExp(String.fromCharCode(13) + '?' + String.fromCharCode(10));

export function parsear(texto: string, base: string): PeticionMinima {
    const lineas = texto.split(SALTOS);
    let i = 0;

    // Comentarios, metadatos y líneas en blanco antes de la petición.
    while (i < lineas.length && (lineas[i].trim() === '' || /^\s*(#|\/\/)/.test(lineas[i]) || /^\s*@\w+\s*=/.test(lineas[i]))) {
        i++;
    }
    if (i >= lineas.length) {
        throw new Error('no hay ninguna petición en este bloque');
    }

    const primera = lineas[i++].trim();
    const partes = primera.split(/\s+/);
    let metodo = 'GET';
    let url: string;
    if (METODOS.includes(partes[0].toUpperCase())) {
        metodo = partes[0].toUpperCase();
        url = partes[1] ?? '';
    } else {
        url = partes[0];
    }
    if (!url) {
        throw new Error(`no encuentro la URL en "${primera}"`);
    }

    // Una URL puede seguir en las líneas siguientes si empiezan por ? o &.
    while (i < lineas.length && /^\s*[?&]/.test(lineas[i])) {
        url += lineas[i++].trim();
    }

    const cabeceras: Record<string, string> = {};
    while (i < lineas.length && lineas[i].trim() !== '') {
        const l = lineas[i++];
        if (/^\s*(#|\/\/)/.test(l)) {
            continue;
        }
        const corte = l.indexOf(':');
        if (corte > 0) {
            cabeceras[l.slice(0, corte).trim()] = l.slice(corte + 1).trim();
        }
    }

    // Todo lo que sigue a la línea en blanco es el cuerpo, menos los comentarios
    // de metadatos (@assert, @name) que van al final del bloque.
    const restantes = lineas.slice(i + 1).filter(l => !/^\s*(?:#|\/\/)\s*@(assert|name)\b/.test(l));
    let cuerpo: string | undefined = restantes.join('\n').trim();
    if (cuerpo === '') {
        cuerpo = undefined;
    } else if (cuerpo.startsWith('<')) {
        const ruta = cuerpo.slice(1).trim();
        const absoluta = path.isAbsolute(ruta) ? ruta : path.join(base, ruta);
        if (!fs.existsSync(absoluta)) {
            throw new Error(`no existe el fichero del cuerpo: ${ruta}`);
        }
        cuerpo = fs.readFileSync(absoluta, 'utf8');
    }

    return { metodo, url, cabeceras, cuerpo };
}
