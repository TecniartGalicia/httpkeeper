# HttpKeeper — plan auditado de todas las fases

Argalla · Tecniart Galicia, S.L. · 24 de agosto de 2026

Fork mantenido de [REST Client](https://github.com/Huachao/vscode-restclient) (MIT, © Huachao Mao): 7,5 millones de instalaciones, nota 4,9, **congelado desde junio de 2022**, 529 issues y 61 PRs que nadie mergea.

F1 y F2 están hechas y medidas. Este documento fija el código de F3 a F6, que es donde una decisión equivocada obliga a rehacer trabajo.

Convenciones: **[medido]** comprobado sobre el repositorio real el 24 de agosto de 2026.

---

## 1. Lo que ya está hecho

| | Antes | Ahora |
|---|---|---|
| Pruebas | **0** | **15**, de integración, con peticiones HTTP reales |
| Vulnerabilidades en producción | 75 (6 críticas, 24 altas) | **5**, ninguna crítica |
| Paquetes | 1.487 | **399** |
| Bundle | 4,79 MB | 3,11 MB |
| Telemetría | Application Insights | **ninguna** |

Lo que costó descubrir y queda escrito en las pruebas: el documento de respuesta **se reutiliza** entre peticiones, y por defecto **se lleva el foco** —lo que hacía que la segunda petición de una cadena se ejecutase sobre el documento equivocado—.

## 2. La sonda que decide F6

El runner de línea de comandos es la petición más difícil (+44 votos desde 2019) y la que parecía inviable. **No lo es** [medido]:

| Fichero del camino crítico | ¿Importa `vscode`? |
|---|---|
| `httpRequestParser.ts` — el parser de `.http` | **limpio** |
| `requestParserFactory.ts` | **limpio** |
| `httpRequest.ts` · `httpResponse.ts` · `mimeUtility.ts` · `misc.ts` | **limpios** |
| `environmentVariableProvider.ts` | **limpio** |
| `httpClient.ts` | solo `window.showWarningMessage` (3 avisos de certificados) y un `Uri.parse` |
| `requestParserUtil.ts` | solo `Uri` |

42 de 76 ficheros importan `vscode`, pero **ninguno de los que hacen el trabajo de verdad**. Extraer el núcleo es inyectar dos dependencias, no reescribir.

---

## 3. F3 · Identidad

### D-F3.1 · Los ajustes viejos se siguen leyendo

Quien migra no puede perder ocho años de configuración. La lectura cae en cascada: primero lo propio, luego lo heredado, luego el valor por defecto.

```ts
// src/models/configurationSettings.ts
import { workspace } from 'vscode';

const SECCION = 'httpkeeper';
/** Sección de REST Client: se sigue leyendo para no romper a quien migra. */
const HEREDADA = 'rest-client';

/**
 * Lee un ajuste propio y, si no está definido, el equivalente heredado.
 *
 * `inspect` distingue «no configurado» de «configurado con el valor por
 * defecto», que es justo lo que hace falta: si el usuario nunca tocó el ajuste
 * propio, manda el suyo de REST Client.
 */
export function ajuste<T>(clave: string, porDefecto: T): T {
  const propio = workspace.getConfiguration(SECCION).inspect<T>(clave);
  const definido =
    propio?.workspaceFolderValue ?? propio?.workspaceValue ?? propio?.globalValue;
  if (definido !== undefined) return definido;

  const heredado = workspace.getConfiguration(HEREDADA).inspect<T>(clave);
  return (
    heredado?.workspaceFolderValue ??
    heredado?.workspaceValue ??
    heredado?.globalValue ??
    propio?.defaultValue ??
    porDefecto
  );
}
```

Y un aviso, **una sola vez**, para que nadie se quede a medias sin saberlo:

```ts
// src/vscode/migracion.ts
import { ExtensionContext, window, workspace, l10n } from 'vscode';

const YA_AVISADO = 'httpkeeper.avisoMigracion';

/** Si hay ajustes de REST Client, se dice que se están usando. Una vez. */
export async function avisarSiMigra(ctx: ExtensionContext): Promise<void> {
  if (ctx.globalState.get<boolean>(YA_AVISADO)) return;

  const viejos = workspace.getConfiguration('rest-client');
  const usados = CLAVES.filter((c) => {
    const i = viejos.inspect(c);
    return (i?.globalValue ?? i?.workspaceValue ?? i?.workspaceFolderValue) !== undefined;
  });
  if (!usados.length) return;

  await ctx.globalState.update(YA_AVISADO, true);
  void window.showInformationMessage(
    l10n.t('HttpKeeper is using your {0} REST Client settings. Nothing to reconfigure.', usados.length),
  );
}
```

### D-F3.2 · Identificadores propios, formato idéntico

Los comandos pasan a `httpkeeper.*` para que dos extensiones instaladas a la vez no se peleen. El **lenguaje `http` y la extensión `.http` no se tocan**: son el estándar de facto que también usa JetBrains, y romperlo sería tirar la única ventaja de compatibilidad que hay.

```jsonc
// package.json
{
  "name": "httpkeeper",
  "displayName": "HttpKeeper",
  "publisher": "argalla",
  "pricing": "Free",
  "description": "Send HTTP requests from a .http file and read the response in the editor. No account, no cloud, no paywall. A maintained fork of REST Client.",
  "activationEvents": [],
  "contributes": {
    "languages": [{ "id": "http", "extensions": [".http", ".rest"], "aliases": ["HTTP"] }],
    "commands": [
      { "command": "httpkeeper.request", "title": "%cmd.request%", "category": "HttpKeeper" },
      { "command": "httpkeeper.runAll", "title": "%cmd.runAll%", "category": "HttpKeeper" }
    ]
  }
}
```

### D-F3.3 · CI que corre la suite de verdad

Las pruebas necesitan pantalla en Linux; sin eso, el CI daría verde sin haber probado nada.

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push: { branches: [main] }
  pull_request:
permissions: { contents: read }
jobs:
  check:
    name: check (${{ matrix.os }})
    runs-on: ${{ matrix.os }}
    timeout-minutes: 30
    strategy:
      fail-fast: false
      matrix: { os: [ubuntu-latest, windows-latest, macos-latest] }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx tsc -p ./ --noEmit --skipLibCheck
      - run: npm run compile-tests
      - name: Integration tests (Linux needs a display)
        if: runner.os == 'Linux'
        run: xvfb-run -a npm run test:integration
      - name: Integration tests
        if: runner.os != 'Linux'
        run: npm run test:integration
      - name: No production vulnerabilities above moderate
        run: npm audit --omit=dev --audit-level=high
```

---

## 4. F4 · La deuda de la comunidad

61 PRs abiertos, algunos de 2020, con trabajo hecho. El triaje se automatiza para no leer 61 diffs a mano:

```js
// scripts/triaje-prs.mjs
// Clasifica los PRs abiertos por si aún aplican limpiamente sobre main.
import { execSync } from 'node:child_process';

const token = process.env.GITHUB_TOKEN;
const api = async (ruta) =>
  (await fetch(`https://api.github.com/repos/Huachao/vscode-restclient${ruta}`, {
    headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json' },
  })).json();

const prs = await api('/pulls?state=open&per_page=100');
const clasificado = { aplica: [], conflicto: [], tocaPruebas: [] };

for (const pr of prs) {
  const ficheros = await api(`/pulls/${pr.number}/files`);
  const rutas = ficheros.map((f) => f.filename);
  try {
    // Se intenta el merge en seco: lo que aplica limpio es lo que se revisa primero.
    execSync(`git fetch origin pull/${pr.number}/head:pr-${pr.number} -q`);
    execSync(`git merge-tree $(git merge-base HEAD pr-${pr.number}) HEAD pr-${pr.number}`, { stdio: 'pipe' });
    clasificado.aplica.push({ n: pr.number, titulo: pr.title, rutas: rutas.length });
  } catch {
    clasificado.conflicto.push({ n: pr.number, titulo: pr.title });
  }
  if (rutas.some((r) => r.includes('test'))) clasificado.tocaPruebas.push(pr.number);
}

console.log(`aplican limpio: ${clasificado.aplica.length} · con conflicto: ${clasificado.conflicto.length}`);
for (const p of clasificado.aplica) console.log(`  #${p.n} · ${p.rutas} ficheros · ${p.titulo}`);
```

**Regla que no se salta:** ningún PR se mergea sin una prueba que cubra lo que añade. Si el PR no la trae, se escribe. Es lo que hace que este fork sea distinto del original, donde llevan seis años parados precisamente por no tenerla.

---

## 5. F6 · Lo que llevan ocho años pidiendo

### 5.1 · Núcleo sin VS Code

Es la pieza que habilita las tres funciones. La sonda dice que el parser ya está limpio; lo único que hay que hacer es sacar los avisos y la resolución de rutas fuera.

```ts
// src/core/entorno.ts
/**
 * Lo único que el núcleo necesita del mundo exterior. En VS Code lo implementa
 * la extensión; en la terminal, el runner. Nada más se inyecta: el parser y el
 * cliente HTTP ya son código puro.
 */
export interface Entorno {
  /** Avisos al usuario: un diálogo en el editor, una línea en stderr fuera. */
  avisar(mensaje: string): void;
  /** Resuelve una ruta relativa (certificados, cuerpos en fichero). */
  resolver(ruta: string, base?: string): string;
  /** Lee un ajuste ya resuelto. */
  ajuste<T>(clave: string, porDefecto: T): T;
}

export const entornoTerminal = (raiz: string): Entorno => ({
  avisar: (m) => process.stderr.write(`aviso: ${m}\n`),
  resolver: (ruta, base) => require('node:path').resolve(base ?? raiz, ruta),
  ajuste: (_c, porDefecto) => porDefecto,
});
```

```ts
// src/utils/httpClient.ts — el cambio, en su totalidad
-import { Uri, window } from 'vscode';
+import type { Entorno } from '../core/entorno';

 export class HttpClient {
-    public constructor() {
+    public constructor(private readonly entorno: Entorno) {
     }
 ...
-            window.showWarningMessage(`Certificate path ${p} doesn't exist...`);
+            this.entorno.avisar(`Certificate path ${p} doesn't exist...`);
```

### 5.2 · Ejecutar en secuencia (+62 votos, 2020)

```ts
// src/core/secuencia.ts
import { HttpClient } from '../utils/httpClient';
import { RequestParserFactory } from '../models/requestParserFactory';
import type { HttpRequest } from '../models/httpRequest';
import type { HttpResponse } from '../models/httpResponse';

export interface PasoEjecutado {
  nombre: string;
  peticion: HttpRequest;
  respuesta?: HttpResponse;
  error?: string;
  ms: number;
}

/**
 * Ejecuta en orden todas las peticiones de un fichero.
 *
 * Cada respuesta se guarda con el nombre de su petición ANTES de resolver la
 * siguiente: así `{{login.response.body.$.token}}` funciona igual que cuando se
 * envían a mano, que es lo que la gente espera.
 *
 * Un fallo detiene la secuencia por defecto: encadenar peticiones sobre una
 * respuesta que no llegó produce errores que no se entienden.
 */
export async function ejecutarSecuencia(
  texto: string,
  cliente: HttpClient,
  opciones: { pararEnFallo?: boolean; resolver: (crudo: string) => Promise<string> } ,
): Promise<PasoEjecutado[]> {
  const bloques = trocearPorSeparador(texto);
  const hechos: PasoEjecutado[] = [];

  for (const bloque of bloques) {
    const t0 = Date.now();
    const nombre = nombreDe(bloque) ?? `#${hechos.length + 1}`;
    try {
      // Se resuelven las variables AHORA, con las respuestas anteriores ya dentro.
      const resuelto = await opciones.resolver(bloque);
      const peticion = new RequestParserFactory().createRequestParser(resuelto).parseHttpRequest('');
      const respuesta = await cliente.send(peticion);
      hechos.push({ nombre, peticion, respuesta, ms: Date.now() - t0 });
    } catch (e) {
      hechos.push({ nombre, peticion: undefined!, error: e instanceof Error ? e.message : String(e), ms: Date.now() - t0 });
      if (opciones.pararEnFallo !== false) break;
    }
  }
  return hechos;
}

/** Separa por `###` respetando los que van dentro de un cuerpo. */
export function trocearPorSeparador(texto: string): string[] {
  const lineas = texto.split(/\r?\n/);
  const bloques: string[][] = [[]];
  let enCuerpo = false;
  for (const l of lineas) {
    if (/^#{3,}/.test(l)) {
      bloques.push([]);
      enCuerpo = false;
      continue;
    }
    if (l.trim() === '') enCuerpo = true;
    bloques[bloques.length - 1].push(l);
  }
  return bloques.map((b) => b.join('\n')).filter((b) => b.trim().length > 0);
}

const nombreDe = (bloque: string): string | undefined =>
  /^\s*(?:#|\/\/)\s*@name\s+(\S+)/m.exec(bloque)?.[1];
```

### 5.3 · Aserciones (+59 votos, 2018)

La sintaxis va donde ya va todo lo demás: en un comentario con `@`, para que un fichero con aserciones lo siga entendiendo cualquier otra herramienta.

```http
# @name login
POST {{host}}/auth
Content-Type: application/json

{"user":"ana","pass":"..."}

# @assert status == 200
# @assert body.$.token exists
# @assert headers.content-type contains json
# @assert time < 2000
```

```ts
// src/core/aserciones.ts
import type { HttpResponse } from '../models/httpResponse';

export interface Asercion {
  crudo: string;
  sujeto: string;
  operador: string;
  esperado?: string;
}

export interface Resultado {
  asercion: Asercion;
  pasa: boolean;
  obtenido: string;
}

const LINEA = /^\s*(?:#|\/\/)\s*@assert\s+(.+?)\s*$/gm;
const PARTES = /^(\S+)\s+(==|!=|<|>|contains|matches|exists)\s*(.*)$/;

export function leerAserciones(bloque: string): Asercion[] {
  const fuera: Asercion[] = [];
  for (const m of bloque.matchAll(LINEA)) {
    const p = PARTES.exec(m[1]);
    if (p) fuera.push({ crudo: m[1], sujeto: p[1], operador: p[2], esperado: p[3] || undefined });
  }
  return fuera;
}

/**
 * Comprueba las aserciones contra una respuesta.
 *
 * El sujeto reutiliza la MISMA sintaxis de las variables de petición
 * (`body.$.campo`, `headers.nombre`, `status`, `time`), para que no haya dos
 * lenguajes distintos que aprender dentro del mismo fichero.
 */
export function comprobar(
  aserciones: Asercion[],
  respuesta: HttpResponse,
  ms: number,
  extraer: (sujeto: string, r: HttpResponse) => string | undefined,
): Resultado[] {
  return aserciones.map((a) => {
    const obtenido =
      a.sujeto === 'status' ? String(respuesta.statusCode)
      : a.sujeto === 'time' ? String(ms)
      : extraer(a.sujeto, respuesta) ?? '';

    const e = a.esperado ?? '';
    let pasa: boolean;
    switch (a.operador) {
      case '==': pasa = obtenido === e; break;
      case '!=': pasa = obtenido !== e; break;
      case '<': pasa = Number(obtenido) < Number(e); break;
      case '>': pasa = Number(obtenido) > Number(e); break;
      case 'contains': pasa = obtenido.includes(e); break;
      case 'matches': pasa = seguroMatches(obtenido, e); break;
      case 'exists': pasa = obtenido !== '' && obtenido !== 'undefined'; break;
      default: pasa = false;
    }
    return { asercion: a, pasa, obtenido };
  });
}

/** Una expresión del usuario no puede colgar el editor: se acota y se aísla. */
function seguroMatches(texto: string, patron: string): boolean {
  if (patron.length > 200) return false;
  try {
    return new RegExp(patron).test(texto.slice(0, 100_000));
  } catch {
    return false;
  }
}
```

### 5.4 · Runner de línea de comandos (+44 votos, 2019)

El mismo fichero que usas en el editor, ejecutable en CI. Sin VS Code, sin cuenta, sin servicio.

```ts
// src/cli/index.ts
#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { HttpClient } from '../utils/httpClient';
import { entornoTerminal } from '../core/entorno';
import { ejecutarSecuencia, trocearPorSeparador } from '../core/secuencia';
import { comprobar, leerAserciones } from '../core/aserciones';

/**
 * httpkeeper run peticiones.http [--env produccion] [--var host=...] [--json]
 *
 * Código de salida 0 si todas las aserciones pasan, 1 si alguna falla: es lo
 * que espera cualquier CI, y sin eso el runner no sirve para nada.
 */
async function main(argv: string[]): Promise<number> {
  const fichero = argv.find((a) => !a.startsWith('-'));
  if (!fichero) {
    process.stderr.write('uso: httpkeeper run <fichero.http> [--env nombre] [--var clave=valor] [--json]\n');
    return 2;
  }
  const texto = fs.readFileSync(fichero, 'utf8');
  const entorno = entornoTerminal(path.dirname(path.resolve(fichero)));
  const cliente = new HttpClient(entorno);

  const pasos = await ejecutarSecuencia(texto, cliente, { resolver: resolverVariables(argv) });
  const bloques = trocearPorSeparador(texto);

  let fallos = 0;
  const informe = pasos.map((paso, i) => {
    const resultados = paso.respuesta
      ? comprobar(leerAserciones(bloques[i]), paso.respuesta, paso.ms, extraerDeRespuesta)
      : [];
    const malas = resultados.filter((r) => !r.pasa);
    fallos += malas.length + (paso.error ? 1 : 0);

    if (!argv.includes('--json')) {
      const estado = paso.error ? 'ERROR' : malas.length ? 'FALLA' : '  ok ';
      process.stdout.write(`${estado}  ${paso.nombre}  ${paso.respuesta?.statusCode ?? ''} ${paso.ms} ms\n`);
      for (const m of malas) {
        process.stdout.write(`        ${m.asercion.crudo}  →  obtenido: ${recortar(m.obtenido)}\n`);
      }
      if (paso.error) process.stdout.write(`        ${paso.error}\n`);
    }
    return { nombre: paso.nombre, ms: paso.ms, estado: paso.respuesta?.statusCode, error: paso.error, aserciones: resultados };
  });

  if (argv.includes('--json')) process.stdout.write(JSON.stringify({ fichero, pasos: informe }, null, 2) + '\n');
  return fallos ? 1 : 0;
}

const recortar = (s: string) => (s.length > 80 ? s.slice(0, 77) + '…' : s);

main(process.argv.slice(3)).then((c) => process.exit(c));
```

```jsonc
// package.json — el runner se publica aparte del VSIX
{
  "bin": { "httpkeeper": "./dist/cli.js" },
  "files": ["dist/cli.js"]
}
```

---

## 6. Pruebas de las fases nuevas

| # | Prueba | Cierra |
|---|---|---|
| P-16 | Un ajuste de `rest-client` se usa cuando no hay uno propio; el propio gana cuando existe | D-F3.1 |
| P-17 | El aviso de migración sale **una vez** y no vuelve | D-F3.1 |
| P-18 | `###` dentro del cuerpo de una petición no la parte en dos | 5.2 |
| P-19 | Una secuencia de tres peticiones encadena variables entre ellas | 5.2 |
| P-20 | Un fallo detiene la secuencia; con `--continue` no | 5.2 |
| P-21 | Los siete operadores de aserción, cada uno con su caso que pasa y su caso que falla | 5.3 |
| P-22 | Una expresión regular monstruosa en `matches` no cuelga la interfaz | 5.3 |
| P-23 | El runner devuelve 0 con todo en verde y 1 si algo falla | 5.4 |
| P-24 | El runner produce el mismo resultado que el editor sobre el mismo fichero | 5.4 |
| P-25 | El núcleo no importa `vscode`: se comprueba en CI con un grep | 5.1 |

## 7. Riesgos

| Riesgo | Control |
|---|---|
| Romper a quien migra de REST Client | Los ajustes viejos se leen (D-F3.1) y el formato `.http` no se toca (D-F3.2). P-16 |
| Que el runner y el editor se comporten distinto | Comparten el mismo parser y el mismo cliente. P-24 lo comprueba sobre el mismo fichero |
| Heredar 529 issues y ahogarse | Triaje automático, y nada se mergea sin prueba |
| Que el fork sea peor que el original | 15 pruebas hoy, y cada función nueva trae las suyas |
| El autor original vuelve | Crédito visible y los cambios se le ofrecen de vuelta |
| Thunder Client rectifica y cierra la fuga | No se controla. Es motivo para ir pronto, no para ir mal |

## 8. Lo que este plan no cubre

Interfaz gráfica tipo Postman, colecciones en la nube, sincronización de equipo, cuentas de usuario. El producto es un fichero de texto en tu repositorio y así se queda.
