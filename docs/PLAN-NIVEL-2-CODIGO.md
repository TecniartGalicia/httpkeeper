# Plan auditado con código — HttpKeeper 1.1.0 (nivel 2)

> **Estado 2026-08-27: EJECUTADO y publicado como 1.1.0.** Las cuatro fases están hechas y auditadas (52 pruebas, runner 15/15, MCP 14/14, auditoría 0 fallos, `.vsix` instalado en limpio). Lo que quedó fuera: `run` con variables en línea y los scripts `{% %}` de JetBrains; la publicación en npm es del humano (ver `TUS-TAREAS.md`).

Fecha: 2026-08-27. Cuatro fases sobre 1.0.0, cada una con su código, sus pruebas (numeradas P-32 en adelante) y su auditoría. Al final, auditoría completa y publicación en las tres plataformas. Versión resultante: **1.1.0** (todo es compatible hacia atrás: semver dice *minor*).

Restricciones comprobadas antes de diseñar:

- `@types/vscode` es 1.81 y `engines.vscode` también: las API nuevas del editor (herramientas para modelos de lenguaje, 1.95+; definiciones de servidores MCP, 1.101+) se llaman con guardas en tiempo de ejecución y tipos `any`; en un VS Code viejo la extensión sigue funcionando sin ellas.
- El runner no puede importar nada que llegue a `vscode` por `import … from` (lo vigila `scripts/rastrear-vscode.mjs`). Todo lo nuevo del runner va en `src/core/` (puro) o `src/cli/`.
- `npm publish` exige sesión interactiva: el paquete se deja preparado y probado; publicarlo es un comando del humano. La acción de GitHub **no** depende de npm.
- Node ≥ 22 trae `WebSocket` global (editor y runner). Sin él, mensaje claro, no excepción.

---

## Fase A — Formato JetBrains completo y secretos

### A.1 Ficheros de entorno `http-client.env.json` / `http-client.private.env.json`

Formato JetBrains: `{ "dev": { "host": "https://dev" }, "prod": { "host": "https://api" } }`. El privado tiene la misma forma, está en `.gitignore`, y **manda** sobre el público. Se buscan desde la carpeta del fichero `.http` hacia arriba hasta la raíz del espacio de trabajo (o del disco en el runner).

Módulo puro, compartido por editor y runner:

```ts
// src/core/entornosJetBrains.ts
import * as fs from 'fs';
import * as path from 'path';

export const FICHERO_PUBLICO = 'http-client.env.json';
export const FICHERO_PRIVADO = 'http-client.private.env.json';

export type Entornos = Record<string, Record<string, string>>;

/** Sube carpeta a carpeta desde `desde` y devuelve la primera que tenga alguno de los dos ficheros. */
export function carpetaDeEntornos(desde: string, tope?: string): string | undefined {
    let dir = path.resolve(desde);
    const limite = tope ? path.resolve(tope) : undefined;
    for (;;) {
        if (fs.existsSync(path.join(dir, FICHERO_PUBLICO)) || fs.existsSync(path.join(dir, FICHERO_PRIVADO))) {
            return dir;
        }
        if (limite && dir === limite) { return undefined; }
        const padre = path.dirname(dir);
        if (padre === dir) { return undefined; }
        dir = padre;
    }
}

/** Público + privado, el privado encima. Un JSON roto no tumba nada: se avisa y se ignora. */
export function leerEntornos(carpeta: string, avisar: (m: string) => void = () => {}): Entornos {
    const fuera: Entornos = {};
    for (const nombre of [FICHERO_PUBLICO, FICHERO_PRIVADO]) {
        const ruta = path.join(carpeta, nombre);
        if (!fs.existsSync(ruta)) { continue; }
        try {
            const json = JSON.parse(fs.readFileSync(ruta, 'utf8'));
            for (const [entorno, vars] of Object.entries(json)) {
                if (typeof vars !== 'object' || vars === null) { continue; }
                fuera[entorno] = { ...(fuera[entorno] ?? {}), ...aTexto(vars as Record<string, unknown>) };
            }
        } catch (e) {
            avisar(`${nombre}: ${e instanceof Error ? e.message : String(e)}`);
        }
    }
    return fuera;
}

const aTexto = (o: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]));
```

Integración en el editor:

- `EnvironmentVariableProvider.getAvailableVariables(document)`: a lo de los ajustes se le suman las variables del entorno elegido leídas del fichero; **el fichero manda** sobre los ajustes para el mismo entorno y misma variable (lo que está en el repositorio es lo que ve el equipo). Se conserva `$shared`.
- `EnvironmentController.switchEnvironment()`: la lista de entornos es la unión de los ajustes y de los ficheros (descripción «http-client.env.json» en los que vienen del fichero).
- El proveedor recibe `document` ya en `has/get`; `getAll()` pasa a recibirlo para los diagnósticos.

Runner: `--env dev` elige el entorno; se leen los ficheros desde la carpeta del `.http` hacia arriba. Prioridad de menor a mayor: entorno → `@variables` del fichero → `--var`.

### A.2 `import` y `run #nombre`

Sintaxis JetBrains (2023.2+):

```http
import ./comun.http

run #login

###
GET {{host}}/facturas
Authorization: Bearer {{login.response.body.$.token}}
```

Reglas:

- `import <ruta>` en cualquier línea del fichero, ruta relativa al fichero. Se importan las `@variables` del importado (las locales mandan) y sus peticiones con `@name`.
- `run #nombre` como línea de petición ejecuta la petición con ese nombre: primero se busca en el fichero actual, luego en los importados, en orden.
- Variables de petición entre ficheros: `{{login.response…}}` resuelve si `login` está en el fichero o en un importado y **ya se envió** (desde donde fuera).

Módulo puro:

```ts
// src/core/importaciones.ts
import * as fs from 'fs';
import * as path from 'path';
import { Bloque, trocear } from './secuencia';

const IMPORT = /^\s*import\s+(?:"([^"]+)"|'([^']+)'|(\S+))\s*$/gm;
export const RUN = /^\s*run\s+#(\S+)\s*$/m;

export function rutasImportadas(texto: string, ficheroBase: string): string[] {
    const dir = path.dirname(ficheroBase);
    return [...texto.matchAll(IMPORT)].map(m => path.resolve(dir, m[1] ?? m[2] ?? m[3]));
}

/** Ficheros importados, en orden y sin ciclos (un fichero que se importa a sí mismo o en bucle se lee una vez). */
export function cerrarImportaciones(fichero: string, leer = (f: string) => fs.readFileSync(f, 'utf8')): { fichero: string; texto: string }[] {
    const vistos = new Set<string>([path.resolve(fichero)]);
    const cola = rutasImportadas(leer(fichero), fichero);
    const fuera: { fichero: string; texto: string }[] = [];
    while (cola.length) {
        const f = cola.shift()!;
        if (vistos.has(f) || !fs.existsSync(f)) { continue; }
        vistos.add(f);
        const texto = leer(f);
        fuera.push({ fichero: f, texto });
        cola.push(...rutasImportadas(texto, f));
    }
    return fuera;
}

/** Bloque con `@name` = nombre, buscando primero en el propio texto y luego en los importados. */
export function bloqueLlamado(nombre: string, texto: string, importados: { texto: string }[]): Bloque | undefined {
    for (const t of [texto, ...importados.map(i => i.texto)]) {
        const b = trocear(t).find(x => x.nombre === nombre);
        if (b) { return b; }
    }
    return undefined;
}

/** Si el bloque es `run #x`, devuelve el bloque real; si no, el mismo. */
export function resolverRun(bloque: Bloque, texto: string, importados: { texto: string }[]): Bloque {
    const m = RUN.exec(bloque.texto);
    if (!m) { return bloque; }
    const real = bloqueLlamado(m[1], texto, importados);
    if (!real) { throw new Error(`run #${m[1]}: no hay ninguna petición con ese nombre`); }
    return { ...real, linea: bloque.linea };
}
```

Editor: `Selector.getRequest` aplica `resolverRun` sobre el bloque elegido (los importados se leen del disco con `cerrarImportaciones(document.fileName)`); `FileVariableProvider.getFileVariables` incorpora las `@variables` de los importados (antes que las locales); `RequestVariableProvider.getRequestVariables` incorpora los `@name` de los importados; `RequestVariableCache` guarda además un índice global por nombre (`ultimaPorNombre`) del que tira el proveedor cuando el documento no tiene esa respuesta. Runner: mismo módulo, `previas` ya está indexado por nombre.

Limitación aceptada: `run` no admite todavía sobrescribir variables en la misma línea (`run #x (@a = 1)` de JetBrains). Documentada.

### A.3 `{{$secret NOMBRE}}`

Un secreto nunca está en el fichero. En el editor vive en el almacén de secretos de VS Code (cifrado por el sistema operativo), en el runner viene por variable de entorno o argumento.

- Editor: `SystemVariableProvider` registra `$secret`. Si no existe, pide el valor con un cuadro de contraseña y lo guarda. Comandos `httpkeeper.set-secret` y `httpkeeper.delete-secret`.
- Runner: `--secret NOMBRE=valor` o variable de entorno `HTTPKEEPER_SECRET_NOMBRE`. Si falta, error que dice cuál.
- El texto del secreto no aparece nunca en la salida `--json` ni en el panel salvo como parte de la petición que el propio usuario escribió.

### A.4 Alias de JetBrains

`{{$uuid}}` (= `$guid`), `{{$isoTimestamp}}` (= `$datetime iso8601`), `{{$random.integer(min,max)}}` (= `$randomInt`). Editor y runner.

### Pruebas de la fase A

| | Prueba | Dónde |
|---|---|---|
| P-32 | público + privado: el privado manda; JSON roto avisa y no tumba | unitaria |
| P-33 | `carpetaDeEntornos` sube hasta encontrarlo y respeta el tope | unitaria |
| P-34 | `cerrarImportaciones` sigue cadenas y corta ciclos | unitaria |
| P-35 | `resolverRun` encuentra en el propio fichero antes que en el importado, y falla claro si no existe | unitaria |
| P-36 | editor: con `http-client.env.json` junto al fichero y el entorno `dev` elegido, `{{host}}` resuelve | integración |
| P-37 | editor: `import` + `run #login` envía la petición importada y `{{login.response…}}` resuelve en el fichero que importa | integración |
| P-38 | editor: `$secret` guardado con el comando se sustituye; el valor no aparece en el fichero | integración |
| P-39 | editor: `$uuid` e `$isoTimestamp` | integración |
| runner | `--env`, `import`/`run`, `--secret`, `HTTPKEEPER_SECRET_*`, y el error si falta un secreto | probar-cli |

Auditoría A: `npm run check` en verde; `rastrear-vscode` limpio para `src/core/entornosJetBrains.ts` e `importaciones.ts`; las claves nuevas de comandos en los dos `package.nls`; README y README.es cuentan las mismas pruebas.

---

## Fase B — Streaming: SSE y WebSocket

### B.1 `text/event-stream` en el panel, en vivo

Hoy `HttpClient.send` espera el cuerpo entero (`got` con `responseType: 'buffer'`). Lo que cambia:

- `send(httpRequest, settings, alRecibir?)`: `alRecibir(trozo, cabeceras, estado)` se llama por cada trozo del cuerpo. `got` sigue resolviendo con el cuerpo completo al final, así que todo lo demás (historial, variables de petición, guardar) no cambia.
- `RequestController.runCore`: si la respuesta anuncia `text/event-stream`, abre el panel **al primer trozo** con la línea de estado y las cabeceras, y va añadiendo eventos con `postMessage({ command: 'trozo', texto })`. Al terminar (o al cancelar), el panel se queda con lo recibido y la respuesta completa entra en la caché como siempre.
- `webview/main.js`: escucha `trozo` y añade líneas al `<code>` sin recargar el HTML.
- Cancelar (`httpkeeper.cancel-request`) corta el stream y conserva lo recibido: es la forma normal de terminar con un endpoint infinito.

Módulo puro para las aserciones:

```ts
// src/core/sse.ts
export interface EventoSse { evento?: string; datos: string; id?: string; }

/** Parser del formato SSE (líneas `event:`, `data:`, `id:`; los eventos se separan por línea en blanco). */
export function leerEventos(texto: string): EventoSse[] {
    const fuera: EventoSse[] = [];
    let actual: { evento?: string; datos: string[]; id?: string } = { datos: [] };
    const cerrar = () => { if (actual.datos.length) { fuera.push({ evento: actual.evento, datos: actual.datos.join('\n'), id: actual.id }); } actual = { datos: [] }; };
    for (const linea of texto.split(/\r?\n/)) {
        if (linea === '') { cerrar(); continue; }
        if (linea.startsWith(':')) { continue; }
        const corte = linea.indexOf(':');
        const campo = corte < 0 ? linea : linea.slice(0, corte);
        const valor = corte < 0 ? '' : linea.slice(corte + 1).replace(/^ /, '');
        if (campo === 'data') { actual.datos.push(valor); }
        else if (campo === 'event') { actual.evento = valor; }
        else if (campo === 'id') { actual.id = valor; }
    }
    cerrar();
    return fuera;
}
```

Aserciones nuevas (`valorDe`): `sse.count`, `sse.first`, `sse.last` (los `data` del primero y del último). Runner: `--timeout ms` (por omisión 30 000) corta un stream que no termina y da por cuerpo lo recibido.

### B.2 WebSocket básico

Sintaxis JetBrains:

```http
WEBSOCKET wss://echo.example/socket
Content-Type: application/json

{"hola": 1}
===
{"segundo": 2}
```

Comportamiento: conectar, enviar cada mensaje (separados por `===`), recoger lo que llegue durante `# @timeout 3000` ms (por omisión 3 s) y cerrar. La «respuesta» es una transcripción: `>> mensaje enviado` / `<< mensaje recibido`, estado 101. Aserciones: `ws.count`, `ws.last`. Cliente: el `WebSocket` global de Node ≥ 22 (sin dependencias); si no existe, error con la explicación.

Módulo puro `src/core/websocket.ts` (`hablar(url, cabeceras, mensajes, ms)`), usado por editor y runner; el parser del editor y el `parserMinimo` reconocen el método `WEBSOCKET`.

### Pruebas de la fase B

| | Prueba | Dónde |
|---|---|---|
| P-40 | `leerEventos`: campos, varias líneas `data`, comentarios, evento sin blanco final | unitaria |
| P-41 | aserciones `sse.count/first/last` | unitaria |
| P-42 | editor: `/sse` (3 eventos en 600 ms) llega entero y el panel de streaming aparece antes del final | integración |
| P-43 | editor: `WEBSOCKET` contra el servidor de eco de la suite: transcripción con saludo, eco de dos mensajes y 101 | integración |
| runner | SSE con `--timeout` y aserción `sse.count == 3`; WebSocket con `ws.count` | probar-cli |

El servidor de pruebas gana `/sse` y un WebSocket de eco escrito a mano sobre `http.Server` (`upgrade` + tramas RFC 6455 de texto): sin dependencia nueva.

Auditoría B: lo mismo que A, más: sin dependencia nueva en `package.json` (el `npm ls` de la auditoría lo delata), el panel sigue con CSP y nonce (comprobación de que el HTML del webview no lleva `unsafe-eval`).

---

## Fase C — El cliente HTTP que usan los agentes

### C.1 Herramienta de modelo de lenguaje en VS Code

`package.json`:

```json
"languageModelTools": [{
  "name": "httpkeeper_send_request",
  "displayName": "Send an HTTP request from a .http file",
  "modelDescription": "Sends one request from a .http file (by name, or the first one) and returns status, headers and body. Use it to check what an API actually returns.",
  "toolReferenceName": "httpkeeper",
  "canBeReferencedInPrompt": true,
  "icon": "$(arrow-swap)",
  "inputSchema": { "type": "object", "properties": { "file": { "type": "string" }, "name": { "type": "string" } }, "required": ["file"] }
}, {
  "name": "httpkeeper_list_requests",
  "displayName": "List the requests in a .http file",
  "modelDescription": "Lists the requests (name, method, url) defined in a .http file. No network access.",
  "inputSchema": { "type": "object", "properties": { "file": { "type": "string" } }, "required": ["file"] }
}]
```

Registro con guarda: `const lm = (vscode as any).lm; if (lm?.registerTool) { … }`. `prepareInvocation` devuelve `confirmationMessages` («Send GET https://… from api.http?») para que el editor pida permiso antes de tocar la red; la lista de peticiones no lo necesita.

Para ejecutar una petición sin depender del editor activo, `RequestController` gana `enviarDesdeFichero(uri, nombre?)`: abre el documento, localiza el bloque (por `@name` o el primero), lo pasa por `Selector`/`VariableProcessor` con ese documento y devuelve la `HttpResponse`. El comando «Send Request» pasa a usar el mismo camino.

### C.2 Servidor MCP

`httpkeeper mcp [--raiz carpeta]` en el runner: JSON-RPC 2.0 por stdio, sin dependencias.

```ts
// src/cli/mcp.ts (esqueleto)
const HERRAMIENTAS = [
  { name: 'run_http_file', description: 'Run every request of a .http file in order, with assertions. Returns one entry per request.',
    inputSchema: { type: 'object', properties: { file: { type: 'string' }, env: { type: 'string' }, vars: { type: 'object' }, continueOnFailure: { type: 'boolean' } }, required: ['file'] } },
  { name: 'send_request', description: 'Send one named request of a .http file and return status, headers and body.',
    inputSchema: { type: 'object', properties: { file: { type: 'string' }, name: { type: 'string' }, env: { type: 'string' }, vars: { type: 'object' } }, required: ['file', 'name'] } },
  { name: 'list_requests', description: 'List the requests of a .http file without sending anything.',
    inputSchema: { type: 'object', properties: { file: { type: 'string' } }, required: ['file'] } },
];
// initialize -> { protocolVersion, capabilities: { tools: {} }, serverInfo }
// tools/list -> { tools }
// tools/call -> { content: [{ type: 'text', text }], isError }
// Todo fichero fuera de --raiz (por omisión, el directorio actual) se rechaza: un agente no lee lo que no le toca.
```

En el editor, además, `registerMcpServerDefinitionProvider` (VS Code ≥ 1.101, con guarda) anuncia ese servidor apuntando al `dist/cli.js` de la propia extensión: instalar HttpKeeper deja la herramienta disponible en el modo agente de Copilot sin configurar nada.

### Pruebas de la fase C

| | Prueba | Dónde |
|---|---|---|
| P-44 | editor: `vscode.lm.invokeTool('httpkeeper_list_requests')` devuelve las peticiones; `httpkeeper_send_request` envía y devuelve el estado | integración (si `lm.registerTool` existe) |
| MCP | `initialize`, `tools/list`, `tools/call` de las tres herramientas, rechazo de rutas fuera de la raíz, petición mal formada → error JSON-RPC | probar-mcp |

Auditoría C: la herramienta de envío exige confirmación (`prepareInvocation` presente); el servidor MCP rechaza rutas fuera de la raíz; ninguna de las dos escribe nada en disco.

---

## Fase D — El runner en todas partes

- **Salida JUnit** (`--junit informe.xml`): un `testsuite` por fichero, un `testcase` por petición, un `failure` por aserción fallida y `error` por petición que no pudo enviarse. Es lo que GitHub y GitLab pintan como informe de pruebas.
- **cURL pegado** en el runner: parser propio en `parserMinimo` (`-X`, `-H`, `-d/--data*`, `-u`, `--url`, continuaciones con `\`), sin `yargs`.
- **Multiparte** en el runner: `< ruta` y `<@ ruta` dentro del cuerpo; con `multipart/form-data` los saltos son CRLF y el cuerpo es un `Buffer`.
- **Paquete npm** en `npm/`: `package.json` propio (`httpkeeper`, `bin`, `files: [cli.js]`), `cli.js` copiado del bundle. `npm run preparar-npm` lo deja listo; publicar es `cd npm && npm publish --access public` (sesión del humano).
- **Acción de GitHub** `action.yml` en la raíz (compuesta): descarga `httpkeeper-cli.js` de la publicación de GitHub que corresponda a la versión pedida (`latest` por omisión) y ejecuta el fichero con `--junit`. El flujo de release adjunta ese fichero a cada publicación.

### Pruebas de la fase D

| | Prueba | Dónde |
|---|---|---|
| P-45 | JUnit: XML bien formado, un caso por petición, `failures` cuenta | unitaria |
| P-46 | cURL: `-X POST -H … -d …`, continuaciones y `-u` | unitaria |
| P-47 | multiparte: `< fichero` se inserta con CRLF y el servidor lo recibe | probar-cli |
| acción | `action.yml` válido (YAML, inputs, `runs.using: composite`) y el flujo de release adjunta `httpkeeper-cli.js` | auditoría |
| npm | `npm pack --dry-run` en `npm/` lista sólo `cli.js`, `package.json`, `README.md`, `LICENSE` | auditoría |

---

## Auditoría final y publicación

1. `npm run check` (tipos, unitarias, runner, l10n, auditoría, `.vsix` instalado) y `npm run test:integration`.
2. Auditoría ampliada: contador de pruebas del README (automático), l10n de todo lo nuevo, ausencia de dependencias nuevas de producción, `rastrear-vscode` de los módulos nuevos del núcleo, `action.yml`, `npm/`.
3. `CHANGELOG` 1.1.0, README/README.es con las cuatro funciones, `docs/TUS-TAREAS.md` (npm y difusión), demo regrabada (`npm run demo`) con un plano de SSE.
4. Etiqueta `v1.1.0` → el flujo de release publica en Marketplace y Open VSX y adjunta `.vsix` y `httpkeeper-cli.js`.
5. Anuncio en las incidencias que lo pedían (#229/#627, #182/#845/#1148, #493, #173, #432), un comentario distinto en cada una, publicados por el humano.

## Riesgos y cómo se acotan

| Riesgo | Cómo se acota |
|---|---|
| Un `.http` de JetBrains que use lo que aún no tenemos (`run` con variables en línea, `@no-log`, scripts `{% %}`) | Se documenta lo que no está; el resto del fichero funciona |
| Streaming que no termina | Cancelar conserva lo recibido; `--timeout` en el runner |
| Agentes enviando peticiones | Confirmación en el editor; raíz obligatoria en MCP; nada de escritura en disco |
| `WebSocket` global ausente (Node < 22) | Mensaje explícito; la función falla sola, no la extensión |
| Volumen de cambio | Cada fase cierra con `npm run check` y su commit; nada pasa a la siguiente en rojo |
