"use strict";
/**
 * Ejecutar todas las peticiones de un fichero en orden.
 *
 * Es la petición número dos más votada del proyecto original (+62 votos desde
 * 2020) y la mitad de lo que hace falta para que un `.http` sirva en
 * integración continua: sin secuencia no hay suite, y sin suite no hay motivo
 * para preferir un fichero a una herramienta de escritorio.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.trocear = trocear;
exports.ejecutarSecuencia = ejecutarSecuencia;
const SEPARADOR = /^#{3,}/;
const NOMBRE = /^\s*(?:#|\/\/)\s*@name\s+(\S+)/m;
/**
 * Trocea un fichero `.http` por sus separadores.
 *
 * Un `###` solo separa peticiones cuando está al principio de la línea y fuera
 * del cuerpo: dentro de un cuerpo —un Markdown en un JSON, por ejemplo— es
 * contenido, y partirlo ahí rompería la petición sin decir por qué.
 */
function trocear(texto) {
    const lineas = texto.split(/\r?\n/);
    const bloques = [];
    let actual = [];
    let inicio = 0;
    let enCuerpo = false;
    const cerrar = () => {
        const t = actual.join('\n');
        if (t.trim().length > 0) {
            bloques.push({ texto: t, linea: inicio, nombre: NOMBRE.exec(t)?.[1] });
        }
        actual = [];
        enCuerpo = false;
    };
    for (let i = 0; i < lineas.length; i++) {
        const l = lineas[i];
        if (SEPARADOR.test(l) && !enCuerpo) {
            cerrar();
            inicio = i + 1;
            continue;
        }
        // La primera línea en blanco tras las cabeceras abre el cuerpo.
        if (!enCuerpo && l.trim() === '' && actual.some(x => x.trim() !== '')) {
            enCuerpo = true;
        }
        actual.push(l);
    }
    cerrar();
    return bloques;
}
/**
 * Ejecuta los bloques en orden. Cada respuesta queda disponible para el
 * siguiente bloque antes de resolverlo, que es lo que permite encadenar
 * `{{login.response.body.$.token}}` igual que al enviar a mano.
 *
 * Un fallo detiene la secuencia salvo que se pida lo contrario: encadenar sobre
 * una respuesta que nunca llegó produce errores que no se entienden.
 */
async function ejecutarSecuencia(bloques, opciones) {
    const hechos = [];
    for (const bloque of bloques) {
        const t0 = Date.now();
        const nombre = bloque.nombre ?? `#${hechos.length + 1}`;
        let paso;
        try {
            const listo = opciones.resolver ? await opciones.resolver(bloque) : bloque;
            const r = await opciones.enviar(listo);
            paso = { nombre, linea: bloque.linea, estado: r.estado, cuerpo: r.cuerpo, cabeceras: r.cabeceras, ms: Date.now() - t0 };
        }
        catch (e) {
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
//# sourceMappingURL=secuencia.js.map