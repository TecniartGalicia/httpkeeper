/**
 * httpkeeper — el mismo fichero .http, ejecutado desde la terminal.
 *
 *   httpkeeper peticiones.http [--var host=https://api] [--continuar] [--json]
 *
 * Es la petición número seis más votada del proyecto original (+44 votos desde
 * 2019) y lo que convierte un fichero de peticiones en una prueba de
 * integración: sale con código 1 si alguna aserción falla, que es lo único que
 * un servidor de integración continua necesita entender.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { entornoTerminal } from '../core/entorno';
import { parsear } from './parserMinimo';
import { Bloque, ejecutarSecuencia, trocear } from '../core/secuencia';
import { comprobar, leerAserciones, Resultado } from '../core/aserciones';

interface Opciones {
    fichero: string;
    variables: Record<string, string>;
    continuar: boolean;
    json: boolean;
}

export function leerArgumentos(argv: string[]): Opciones | string {
    const variables: Record<string, string> = {};
    let fichero = '';
    let continuar = false;
    let json = false;

    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--var' || a === '-v') {
            const par = argv[++i] ?? '';
            const corte = par.indexOf('=');
            if (corte < 1) {
                return `variable mal escrita: "${par}". Se espera clave=valor`;
            }
            variables[par.slice(0, corte)] = par.slice(corte + 1);
        } else if (a === '--continuar') {
            continuar = true;
        } else if (a === '--json') {
            json = true;
        } else if (!a.startsWith('-')) {
            fichero = a;
        }
    }
    if (!fichero) {
        return 'uso: httpkeeper <fichero.http> [--var clave=valor] [--continuar] [--json]';
    }
    return { fichero, variables, continuar, json };
}

/**
 * Variables de fichero: `@nombre = valor`, declaradas normalmente al principio
 * y válidas para todo el fichero. Se leen del texto completo, no del bloque,
 * porque así es como funcionan en el editor.
 */
export function variablesDeFichero(texto: string): Record<string, string> {
    const fuera: Record<string, string> = {};
    for (const m of texto.matchAll(/^\s*@([A-Za-z_]\w*)\s*=\s*(.*)$/gm)) {
        fuera[m[1]] = m[2].trim();
    }
    return fuera;
}

/** Sustituye `{{variable}}` con lo dado en la línea de órdenes y con el entorno. */
export function sustituir(texto: string, variables: Record<string, string>): string {
    return texto.replace(/\{\{([^{}]+)\}\}/g, (completo, nombre: string) => {
        const clave = nombre.trim();
        if (clave in variables) {
            return variables[clave];
        }
        if (clave.startsWith('$processEnv ')) {
            return process.env[clave.slice('$processEnv '.length).trim()] ?? '';
        }
        return completo;
    });
}

export async function ejecutar(opciones: Opciones, salida: (linea: string) => void): Promise<number> {
    const texto = fs.readFileSync(opciones.fichero, 'utf8');
    // Lo de la línea de órdenes manda sobre lo escrito en el fichero: es lo que
    // permite apuntar el mismo fichero a otro entorno desde el servidor de CI.
    const variables = { ...variablesDeFichero(texto), ...opciones.variables };
    const raiz = path.dirname(path.resolve(opciones.fichero));
    void entornoTerminal(raiz, path.resolve(opciones.fichero));
    const bloques = trocear(texto);
    const porBloque = new Map<number, Resultado[]>();
    // Lo que ya han devuelto las peticiones con nombre, para poder encadenar.
    const previas = new Map<string, { cuerpo: string; cabeceras: Record<string, string | undefined>; estado: number }>();

    const pasos = await ejecutarSecuencia(bloques, {
        continuarTrasFallo: opciones.continuar,
        resolver: async (b: Bloque) => ({ ...b, texto: sustituir(resolverPrevias(b.texto, previas), variables) }),
        enviar: async (b: Bloque) => {
            const peticion = parsear(b.texto, raiz);
            const resultado = await enviarPeticion(peticion);
            if (b.nombre) {
                previas.set(b.nombre, resultado);
            }
            return resultado;
        },
    });

    let fallos = 0;
    pasos.forEach((paso, i) => {
        const resultados = paso.error
            ? []
            : comprobar(leerAserciones(bloques[i].texto), { estado: paso.estado, cuerpo: paso.cuerpo, cabeceras: paso.cabeceras, ms: paso.ms });
        porBloque.set(i, resultados);
        const malas = resultados.filter(r => !r.pasa);
        fallos += malas.length + (paso.error ? 1 : 0);

        if (!opciones.json) {
            const marca = paso.error ? 'ERROR' : malas.length ? 'FALLA' : '  ok ';
            salida(`${marca}  ${paso.nombre.padEnd(20)} ${String(paso.estado ?? '').padStart(3)}  ${paso.ms} ms`);
            for (const m of malas) {
                salida(`         ${m.asercion.crudo}   ->  ${recortar(m.obtenido)}`);
            }
            if (paso.error) {
                salida(`         ${paso.error}`);
            }
        }
    });

    if (opciones.json) {
        salida(JSON.stringify({
            fichero: opciones.fichero,
            pasos: pasos.map((p, i) => ({
                nombre: p.nombre, estado: p.estado, ms: p.ms, error: p.error,
                aserciones: (porBloque.get(i) ?? []).map(r => ({ asercion: r.asercion.crudo, pasa: r.pasa, obtenido: r.obtenido }))
            }))
        }, null, 2));
    } else {
        const total = pasos.length;
        salida('');
        salida(fallos === 0 ? `${total} peticiones, todo en verde` : `${total} peticiones, ${fallos} fallo(s)`);
    }
    return fallos === 0 ? 0 : 1;
}

/** Envía la petición con el cliente HTTP de Node: sin dependencias. */
function enviarPeticion(p: { metodo: string; url: string; cabeceras: Record<string, string>; cuerpo?: string }):
    Promise<{ estado: number; cuerpo: string; cabeceras: Record<string, string | undefined> }> {
    return new Promise((resolver, rechazar) => {
        let destino: URL;
        try {
            destino = new URL(p.url);
        } catch {
            rechazar(new Error(`URL no válida: ${p.url}`));
            return;
        }
        const transporte = destino.protocol === 'https:' ? https : http;
        const peticion = transporte.request(destino, { method: p.metodo, headers: p.cabeceras }, respuesta => {
            const trozos: Buffer[] = [];
            respuesta.on('data', t => trozos.push(t as Buffer));
            respuesta.on('end', () => resolver({
                estado: respuesta.statusCode ?? 0,
                cuerpo: Buffer.concat(trozos).toString('utf8'),
                cabeceras: respuesta.headers as Record<string, string | undefined>
            }));
        });
        peticion.on('error', e => rechazar(e));
        if (p.cuerpo !== undefined) {
            peticion.write(p.cuerpo);
        }
        peticion.end();
    });
}

/** Resuelve `{{nombre.response.body.$.x}}` con lo que ya respondió esa petición. */
function resolverPrevias(texto: string, previas: Map<string, { cuerpo: string; cabeceras: Record<string, string | undefined>; estado: number }>): string {
    return texto.replace(/\{\{(\w+)\.response\.(body|headers)\.([^{}]+)\}\}/g, (completo, nombre: string, parte: string, resto: string) => {
        const r = previas.get(nombre);
        if (!r) {
            return completo;
        }
        const sujeto = parte === 'headers' ? `headers.${resto.trim()}` : `body.${resto.trim()}`;
        // Se reutiliza el mismo resolutor que las aserciones: un solo lenguaje.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { valorDe } = require('../core/aserciones');
        const valor = valorDe(sujeto, { estado: r.estado, cuerpo: r.cuerpo, cabeceras: r.cabeceras, ms: 0 });
        return valor === '' ? completo : valor;
    });
}

const recortar = (s: string) => (s.length > 90 ? s.slice(0, 87) + '...' : s);

if (require.main === module) {
    const opciones = leerArgumentos(process.argv.slice(2));
    if (typeof opciones === 'string') {
        process.stderr.write(opciones + '\n');
        process.exit(2);
    }
    ejecutar(opciones, l => process.stdout.write(l + '\n'))
        .then(codigo => process.exit(codigo))
        .catch(e => {
            process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
            process.exit(2);
        });
}
