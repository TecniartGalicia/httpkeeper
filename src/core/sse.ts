/**
 * Server-Sent Events (`text/event-stream`), que es como responden en 2026
 * todas las API de modelos de lenguaje. Petición #493 del original (+44).
 *
 * El formato es de líneas: `event:`, `data:`, `id:`, y un evento termina en
 * una línea en blanco. Varias líneas `data:` seguidas se unen con salto de
 * línea. Las líneas que empiezan por `:` son comentarios (latidos, casi
 * siempre). Sin `vscode`: lo usan el editor, las aserciones y el runner.
 */
export interface EventoSse {
    evento?: string;
    datos: string;
    id?: string;
}

export function leerEventos(texto: string): EventoSse[] {
    const fuera: EventoSse[] = [];
    let actual: { evento?: string; datos: string[]; id?: string } = { datos: [] };
    const cerrar = () => {
        if (actual.datos.length > 0) {
            fuera.push({ evento: actual.evento, datos: actual.datos.join('\n'), id: actual.id });
        }
        actual = { datos: [] };
    };
    for (const linea of texto.split(/\r?\n/)) {
        if (linea === '') {
            cerrar();
            continue;
        }
        if (linea.startsWith(':')) {
            continue;
        }
        const corte = linea.indexOf(':');
        const campo = corte < 0 ? linea : linea.slice(0, corte);
        const valor = corte < 0 ? '' : linea.slice(corte + 1).replace(/^ /, '');
        if (campo === 'data') {
            actual.datos.push(valor);
        } else if (campo === 'event') {
            actual.evento = valor;
        } else if (campo === 'id') {
            actual.id = valor;
        }
    }
    cerrar();
    return fuera;
}

export function esEventStream(contentType: string | undefined): boolean {
    return /^\s*text\/event-stream/i.test(contentType ?? '');
}
