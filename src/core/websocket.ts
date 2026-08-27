/**
 * WebSocket básico (#173 del original, +28 votos), con la sintaxis de
 * JetBrains: `WEBSOCKET wss://host/ruta`, cabeceras, y los mensajes en el
 * cuerpo separados por líneas `===`.
 *
 * Abre, envía los mensajes en orden, escucha durante `ms` y cierra. Lo que
 * devuelve es una transcripción: `>> ` lo enviado, `<< ` lo recibido. Usa el
 * `WebSocket` global de Node ≥ 22: sin dependencias, y sin él se dice claro.
 * Sin `vscode`: lo usan el editor y el runner.
 */
export interface ResultadoWs {
    transcripcion: string;
    enviados: string[];
    recibidos: string[];
    cerradoPor: 'tiempo' | 'servidor' | 'error';
    detalle?: string;
}

export const MS_ESCUCHA_POR_DEFECTO = 3000;

/** Los mensajes del cuerpo: separados por líneas `===`; los vacíos no se envían. */
export function mensajesDelCuerpo(cuerpo: string | undefined): string[] {
    if (!cuerpo) {
        return [];
    }
    return cuerpo.split(/^\s*===\s*$/m).map(m => m.trim()).filter(m => m.length > 0);
}

export function hablar(url: string, cabeceras: Record<string, string>, mensajes: string[], ms: number = MS_ESCUCHA_POR_DEFECTO): Promise<ResultadoWs> {
    const Ws = (globalThis as { WebSocket?: new (url: string, opciones?: unknown) => WebSocketMinimo }).WebSocket;
    if (!Ws) {
        return Promise.reject(new Error('WebSocket needs Node 22 or newer (no WebSocket global in this runtime)'));
    }
    return new Promise(resolver => {
        const enviados: string[] = [];
        const recibidos: string[] = [];
        const lineas: string[] = [];
        let terminado = false;
        let socket: WebSocketMinimo;

        const cerrar = (cerradoPor: ResultadoWs['cerradoPor'], detalle?: string) => {
            if (terminado) {
                return;
            }
            terminado = true;
            clearTimeout(temporizador);
            try {
                socket.close();
            } catch { /* ya cerrado */ }
            if (detalle) {
                lineas.push(`-- ${detalle}`);
            }
            resolver({ transcripcion: lineas.join('\n'), enviados, recibidos, cerradoPor, detalle });
        };
        const temporizador = setTimeout(() => cerrar('tiempo', `closed after ${ms} ms`), ms);

        try {
            // undici admite cabeceras propias como extensión de la API estándar.
            socket = new Ws(url, { headers: cabeceras });
        } catch (e) {
            clearTimeout(temporizador);
            resolver({ transcripcion: `-- ${mensajeDe(e)}`, enviados, recibidos, cerradoPor: 'error', detalle: mensajeDe(e) });
            return;
        }
        socket.addEventListener('open', () => {
            for (const m of mensajes) {
                socket.send(m);
                enviados.push(m);
                lineas.push(`>> ${m}`);
            }
        });
        socket.addEventListener('message', (ev: { data: unknown }) => {
            const texto = typeof ev.data === 'string' ? ev.data : `[binary ${(ev.data as { byteLength?: number })?.byteLength ?? '?'} bytes]`;
            recibidos.push(texto);
            lineas.push(`<< ${texto}`);
        });
        socket.addEventListener('close', (ev: { code?: number; reason?: string }) => cerrar('servidor', `server closed (${ev.code ?? ''}${ev.reason ? ' ' + ev.reason : ''})`));
        socket.addEventListener('error', (ev: { message?: string; error?: unknown }) => cerrar('error', ev.message ?? mensajeDe(ev.error) ?? 'connection error'));
    });
}

/** Lo que las aserciones necesitan de una transcripción: cuántos mensajes llegaron y cuál fue el último. */
export function leerTranscripcion(texto: string): { recibidos: string[]; enviados: string[] } {
    const recibidos: string[] = [];
    const enviados: string[] = [];
    for (const l of texto.split(/\r?\n/)) {
        if (l.startsWith('<< ')) {
            recibidos.push(l.slice(3));
        } else if (l.startsWith('>> ')) {
            enviados.push(l.slice(3));
        }
    }
    return { recibidos, enviados };
}

const mensajeDe = (e: unknown) => (e instanceof Error ? e.message : e === undefined ? undefined : String(e));

interface WebSocketMinimo {
    send(datos: string): void;
    close(): void;
    addEventListener(tipo: string, escucha: (ev: never) => void): void;
}
