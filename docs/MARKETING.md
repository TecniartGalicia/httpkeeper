# Plan para llegar al público — HttpKeeper

Fecha: 2026-08-26 (día de publicación). Todo lo de aquí lo redacto yo y lo publica el humano desde sus cuentas. Nada de automatización.

## Punto de partida

| Dato | Valor (26-08, 14:30 UTC) |
|---|---|
| Marketplace | publicada 12:38 UTC; contador aún en 0 (se actualiza con retraso) |
| Open VSX | 124 descargas (parte son réplicas automáticas de VSCodium/Coder) |
| GitHub | 0 estrellas, 1 descarga del `.vsix` |
| Búsqueda «rest client» | fuera del top 50 |
| Búsqueda «http client» | fuera del top 50 |
| Búsqueda «.http» | puesto 22 |
| Otros forks | `tutilus.rest-client-next` (feb. 2026, Marketplace, 30 instalaciones) y `kit1211.rest-client-plus` (jun. 2026, sólo Open VSX, 1.547 descargas; autor del PR #1440 que fusionamos). Somos el único de los tres con pruebas y en las dos tiendas |

**El problema es de descubrimiento, no de producto.** El ranking del Marketplace pesa instalaciones y valoración; una extensión nueva con cero de ambas no aparece por mucho que sea la respuesta a la búsqueda. Las primeras instalaciones tienen que venir de fuera de la tienda; a partir de unos cientos, la propia búsqueda empieza a traer las siguientes. El plan entero es conseguir ese arranque sin quemar la reputación.

## Dónde está el público (por orden de rendimiento esperado)

1. **Los usuarios de REST Client que ya sufren**: viven en las 529 incidencias abiertas de su repositorio. La #1394 («This is DEAD. Ask for new maintainers», +28 votos, 2025) es gente pidiendo exactamente lo que hemos hecho. Es el sitio número uno.
2. **Usuarios de Cursor** (y Windsurf, VSCodium): a REST Client no le aparece la respuesta en Cursor (#1434, +13). HttpKeeper lo arregla y está en Open VSX. Es nuestro gancho más concreto y verificable.
3. **Quien pidió las tres funciones más votadas** desde 2018: pruebas (#267, +59), ejecución secuencial (#724, +54; #444, +36) y runner de terminal (#432, +44). Están hechas.
4. **Usuarios de JetBrains** con ficheros `.http` que abren VS Code: mismo formato.
5. **Gente de CI** que quiere pruebas de API sin Postman: el runner.

## Principios (los que no se negocian)

- Crédito a Huachao Mao en cada mensaje. El tono es «recogido y mantenido», nunca «mejor que el suyo».
- Un mensaje por sitio, factual, con enlace al commit o a la prueba. Nada de repetir en cinco incidencias el mismo texto.
- Ni reseñas en su ficha, ni mensajes directos, ni cuentas nuevas para simular, ni automatización.
- Responder a todo comentario en menos de 24 h (lo redacto yo).
- Cada versión nueva es una excusa legítima para volver a hablar: **publicar pequeño y a menudo** vale más que un lanzamiento grande.

## Calendario

### Semana 0 (esta semana) — arranque

| Día | Acción | Texto |
|---|---|---|
| Hoy | Incidencia de cortesía al autor en su repositorio | A |
| Hoy | Comentario en #1394 (piden mantenedor) | B |
| Mañana | Comentario en #1434 (Cursor) | C |
| Mañana | Comentarios en #267, #724 y #432 (una función cada uno) | D |
| Día 3 | Show HN | E |
| Día 3 | Hilo en X (@ArgallaTec) + LinkedIn | F, G |
| Día 4 | r/vscode; r/cursor con el ángulo Cursor | H |
| Día 5 | Artículo en dev.to | I (guion) |

No todo el mismo día: si #1394 despierta, que los siguientes lleguen cuando ya haya conversación.

### Semanas 1–2 — presencia

- PR a `viatsko/awesome-vscode` (sección REST/HTTP). Un fork mantenido con pruebas y CLI cabe.
- Responder cuando pregunten «alternativa a REST Client» en Reddit, Stack Overflow y el foro de Cursor. Buscar cada dos días; contestar sólo donde preguntan.
- Publicar 1.0.1 con lo que salga de los primeros comentarios (siempre sale algo). Cada versión, una nota corta en el repositorio y en X.

### Semanas 3–4 — la primera función nueva

Elegir **una** de las más votadas que aún no tenemos y hacerla: la compatibilidad con los ficheros de entorno de JetBrains (#627, +41; #229, +42) es la que más gente trae (abre la puerta a todo el que usa `.http` en IntelliJ). Publicar 1.1.0 con ella y repetir el ciclo: anuncio en la incidencia correspondiente, X, dev.to.

## Métricas y objetivos

Medir cada lunes (`scripts` de la tienda ya existen para consultarlo):

| | 30 días | 90 días |
|---|---|---|
| Instalaciones Marketplace | 1.000 | 10.000 |
| Posición «rest client» | top 20 | top 5 |
| Estrellas GitHub | 50 | 300 |
| Incidencias abiertas por otros | 5 | 30 |

Si a los 30 días no llegamos a 300 instalaciones, el problema no es de canales: hay que revisar la ficha (primer pantallazo, primera frase) antes de insistir.

## Qué no hacer

- Reseñas en la ficha de REST Client (astroturfing; sólo el editor responde a las suyas).
- Mensajes a los 7,5 millones: no existen como lista, y si existieran sería spam.
- Comparativas «HttpKeeper vs REST Client» en tono de derribo: es su código.
- Pagar promoción: el público que queremos desconfía de ella.

---

## Textos

### A · Incidencia de cortesía al autor (repositorio Huachao/vscode-restclient)

**Título:** A maintained fork exists: HttpKeeper - credit kept, MIT kept, changes offered back

Texto en `docs/textos/A-incidencia-autor.md`; la URL prerrellenada, en `docs/textos/A-url.txt`.

> Hi Huachao,
>
> First, thank you. REST Client has been the tool I reach for every day for years, and so it is for millions of people.
>
> Since there has been no release since June 2022 and 61 pull requests are waiting, I have published a maintained fork: **HttpKeeper** (https://github.com/TecniartGalicia/httpkeeper). Your copyright notice and the MIT license are intact, your name is in the README and in `contributors`, and the full git history is preserved.
>
> What it adds so far: a test suite (37 tests; the original had none), 0 vulnerabilities in production dependencies (from 75), telemetry removed, three of the open PRs merged after testing them (#1440, #1432, #853), and the three most-voted requests since 2018 implemented (#267 assertions, #724 sequential runs, #432 a CLI runner). Two PRs were rejected with the reasons written down (#1396, #532).
>
> I know @tutilus also maintains rest-client-next; I have offered in #1394 to join forces rather than split the users.
>
> Everything is offered back. If you would rather merge any of it here, or if you come back to the project, I will happily help with that instead - a fork is the second-best outcome. And if you would prefer a different name, or that the fork not mention REST Client the way it does, tell me and I will change it.

### B · Comentario en #1394 («This is DEAD. Ask for new maintainers»)

Ojo: en ese hilo ya hay otro fork anunciado (`tutilus.rest-client-next`, feb. 2026, 30 instalaciones, «unos PRs y dependencias al día») y alguien pidió una organización conjunta. El texto lo reconoce y ofrece unir fuerzas: es lo honesto y lo que mejor lee ese hilo. Texto en `docs/textos/B-comentario-1394.md`.

> Another maintained fork, for anyone weighing options in this thread: **HttpKeeper** (https://github.com/TecniartGalicia/httpkeeper - `argalla.httpkeeper` on the Marketplace and on Open VSX, so it installs in Cursor and VSCodium too).
>
> @tutilus's rest-client-next and this one started from the same place, and I would rather join forces than split the users. @marcellourbani's organisation idea is the right one; I am in if you both are.
>
> What HttpKeeper has done so far, in case it is useful to either fork:
>
> - A test suite: 37 tests against a real local server. The original had none, which is why the 61 open PRs were never safe to merge.
> - Production dependencies at 0 vulnerabilities (from 75). `aws-amplify` - the whole AWS SDK - was pulled in for a Cognito login; it is now a small HTTP client, 1,088 packages gone. Telemetry removed.
> - PRs #1440 (the Cursor fix, #1434), #1432 and #853 merged after testing them; #1396 and #532 rejected, with the reasons written down.
> - The three most-voted requests here implemented: #267 assertions in the file, #724 / #444 running a whole file in order with chained variables, and #432 a CLI runner with exit codes for CI.
>
> Same `.http` format, `rest-client.*` settings still read, same `~/.rest-client` folder: switching in either direction costs nothing.
>
> Huachao's copyright and MIT license are kept, and everything is offered back upstream.

### C · Comentario en #1434 («Experiencing Issue on Cursor»)

Ojo: en ese hilo `kit1211` explicó la causa, abrió el PR #1440 (el que fusionamos) y tiene su propio fork, `kit1211.rest-client-plus`, sólo en Open VSX (1.547 descargas). El texto le da las gracias y aporta lo que el suyo no da: Marketplace de VS Code y una prueba de regresión. Texto en `docs/textos/C-comentario-1434.md`.

> Thanks @kit1211 - your PR #1440 is the fix, and it is merged as-is in **HttpKeeper**, another maintained fork of REST Client (https://marketplace.visualstudio.com/items?itemName=argalla.httpkeeper; `argalla.httpkeeper` on Open VSX as well, so it installs from Cursor's extension panel).
>
> Two things that may matter to people landing here from a search:
>
> - It is on the VS Code Marketplace too, for anyone who needs the fix in VS Code or Windsurf as well as in Cursor.
> - The fix is covered by an integration test: it sends a real request in an unsplit window and asserts that the response tab appears, so it cannot quietly regress.
>
> Same `.http` format, `rest-client.*` settings still read, same `~/.rest-client` folder: nothing to migrate. The original author's credit and MIT license are kept; what else changed (37 tests, 0 vulnerabilities in dependencies, no telemetry) is in the README.

### D · Comentarios en las incidencias de funciones (uno por incidencia, distinto cada uno)

**#267 (tests):**
> Implemented in the maintained fork HttpKeeper as `@` comments, so any other tool reading the format ignores them:
> ```http
> # @assert status == 200
> # @assert body.$.token exists
> # @assert header.content-type contains json
> # @assert time < 2000
> ```
> Seven operators over status, time, headers and JSON body; exit code 0/1 from the CLI runner for CI. https://github.com/TecniartGalicia/httpkeeper#what-you-get-on-top

**#724 (sequential execution):**
> The maintained fork HttpKeeper runs every request in a file in order, and later requests can use `{{name.response.body.$.x}}` from earlier ones. A failure stops the run unless you pass `--continuar`. https://github.com/TecniartGalicia/httpkeeper

**#432 (CLI runner):**
> HttpKeeper (maintained fork) ships `httpkeeper api.http` — the same file, in the terminal, with `--json`, `--var key=value` and exit codes for CI. It uses Node's own `http`/`https`, no editor dependency. https://github.com/TecniartGalicia/httpkeeper#what-you-get-on-top

### E · Show HN

**Título (≤80):** Show HN: HttpKeeper – a maintained fork of VS Code's REST Client (7.5M installs, dormant since 2022)

**Texto:**
> REST Client is the `.http` file extension most VS Code users have for sending requests. It has 7.5M installs, 529 open issues, 61 open PRs, and no release since June 2022. The reason nobody merged anything is concrete: the project had zero tests.
>
> So the fork's first job was the safety net (37 tests against a real local server), then the dependency cleanup (75 vulnerabilities to 0; `aws-amplify` — the whole AWS SDK — was being pulled in for a Cognito login: 1,088 packages gone), then three PRs merged after testing them and two rejected with reasons (one "IPv6 fix" broke localhost; the most upvoted one ran shell commands from the .http file).
>
> Then the three features people had asked for since 2018: assertions in the file, sequential runs with chained variables, and a CLI runner with exit codes for CI.
>
> Same format, same settings, no telemetry, no account, free. Huachao Mao's credit and MIT license are kept and everything is offered upstream.
>
> https://github.com/TecniartGalicia/httpkeeper

### F · Hilo en X (@ArgallaTec), 5 publicaciones

1. REST Client for VS Code: 7.5M installs, 529 open issues, 61 open PRs, no release since June 2022. Not broken — parked. We picked it up. Meet HttpKeeper, a maintained fork. Same .http format, same settings, free. 🧵
2. Why nobody merged those 61 PRs for four years: the project had zero tests. So the first thing shipped was the net — 37 tests against a real server. Then the merges: 3 accepted, 2 rejected with reasons (one "IPv6 fix" broke localhost; one ran shell commands from your .http file).
3. Dependencies: 75 vulnerabilities → 0. aws-amplify (the entire AWS SDK) was there for a Cognito login. Now sixty lines of HTTP. 1,088 packages gone. Telemetry: gone.
4. And the three things people asked for since 2018: `# @assert status == 200` in the file, run a whole file in order with chained variables, and `httpkeeper api.http` in your CI with exit codes.
5. Huachao Mao's credit and MIT license stay; everything is offered back upstream. Works in VS Code, Cursor, VSCodium. marketplace.visualstudio.com/items?itemName=argalla.httpkeeper

**Versión en castellano (una publicación):**
> REST Client para VS Code: 7,5 M de instalaciones y sin versión nueva desde 2022. Lo hemos recogido: HttpKeeper es un fork mantenido, con pruebas (el original no tenía), 0 vulnerabilidades, sin telemetría, y las tres funciones más pedidas desde 2018. Mismo formato, mismos ajustes, gratis. Crédito y licencia del autor intactos.

### G · LinkedIn (bilingüe, un solo post)

> **HttpKeeper: hemos recogido REST Client.**
>
> REST Client es la extensión de VS Code para enviar peticiones HTTP desde un fichero de texto: 7,5 millones de instalaciones. Lleva sin una versión nueva desde junio de 2022, con 529 incidencias y 61 propuestas de cambio esperando. No está rota: está parada.
>
> Hoy publicamos HttpKeeper, un fork mantenido. Lo primero no fue una función, fue la red: 37 pruebas contra un servidor real (el original no tenía ninguna, y por eso nadie se atrevía a fusionar nada). Después, de 75 vulnerabilidades a 0, la telemetría fuera, y las tres cosas que la gente pedía desde 2018: comprobaciones escritas en el propio fichero, ejecución en cadena y un ejecutor de terminal para integración continua.
>
> Mismo formato, mismos ajustes, gratis, y con el crédito y la licencia de Huachao Mao intactos. Todo se le ofrece de vuelta.
>
> ---
>
> **HttpKeeper: a maintained fork of REST Client for VS Code.** Same .http format and settings, 37 tests, 0 vulnerabilities, no telemetry, assertions in the file, sequential runs and a CLI runner for CI. Free, MIT, credit kept.
>
> https://marketplace.visualstudio.com/items?itemName=argalla.httpkeeper

### H · Reddit

**r/vscode — título:** I forked REST Client (7.5M installs, no release since 2022): tests, 0 vulnerabilities, assertions and a CLI runner

> Texto: el de Show HN (E), con una línea final: "Happy to answer anything about the fork or the rejected PRs."

**r/cursor — título:** REST Client's "response doesn't show up" bug in Cursor is fixed in a maintained fork (HttpKeeper, on Open VSX)

> If you use `.http` files in Cursor you have probably hit this: Send Request does nothing. The cause is the extension assuming `activeTextEditor.viewColumn` exists. HttpKeeper is a maintained fork of REST Client with that fix (and 37 tests so it stays fixed), same format and settings, available on Open VSX so it installs from Cursor's extension panel. Credit and MIT license of the original author are kept.

Aviso: cuentas de Reddit nuevas caen en AutoModerator (nos pasó con r/ClaudeAI). Publicar desde la cuenta personal más antigua que haya.

### I · Artículo en dev.to (guion)

**Título:** I forked a VS Code extension with 7.5 million installs. Here is what I found inside.

1. Qué es REST Client y por qué importa (el formato `.http`, JetBrains lo usa).
2. Los números de un proyecto parado: 529/61/0 pruebas. Por qué cero pruebas explica todo lo demás.
3. Primera semana: la red. Cómo se prueban peticiones reales dentro de VS Code (`@vscode/test-electron` + servidor local).
4. El triaje de 61 PRs: los 3 fusionados, los 2 rechazados y por qué (#1396 rompía localhost; #532 ejecutaba comandos desde el fichero). Esto es lo que más se comparte.
5. Las dependencias: `aws-amplify` para un login. 1.088 paquetes fuera.
6. Lo que se añadió: aserciones, cadena, runner. Ejemplos cortos.
7. Lo que aprendí sobre hacer un fork con decencia: crédito, licencia, cambios de vuelta, lo que **no** hice (reseñas en su ficha).
8. Enlaces.

---

## Registro de lo publicado

| Fecha | Canal | Enlace | Resultado |
|---|---|---|---|
| 2026-08-26 17:48 UTC | B · comentario en #1394 | https://github.com/Huachao/vscode-restclient/issues/1394#issuecomment-5428966037 | publicado; respondieron tutilus (abierto a la org) y marcellourbani (creó la org `vscode-restclient` y su repo; prefiere HttpKeeper de base) |
| 2026-08-26 20:11 UTC | A · incidencia al autor (#1449) | https://github.com/Huachao/vscode-restclient/issues/1449 | publicada; sin respuesta aún |
| 2026-08-26 20:17 UTC | C · comentario en #1434 (Cursor) | https://github.com/Huachao/vscode-restclient/issues/1434#issuecomment-5430612712 | publicado; sin respuesta aún |
| 2026-08-28 05:33 UTC | E · respuesta a Marcello en #1394 (organización) | https://github.com/Huachao/vscode-restclient/issues/1394#issuecomment-5448849974 | publicada; invitación a la org `vscode-restclient` aceptada (miembro) |
| 2026-08-28 07:10 UTC | F · comparativa de los tres forks en #1394 (cifras medidas) | https://github.com/Huachao/vscode-restclient/issues/1394#issuecomment-5449555176 | publicada; propone HttpKeeper de base + injertar docs/UX de tutilus |
| 2026-08-28 19:34 UTC | (tutilus responde) | https://github.com/Huachao/vscode-restclient/issues/1394#issuecomment-5456928287 | acepta HttpKeeper de base; nos deja portar lo suyo; pide conservar el nombre original o parecido. Somos admin de la org desde hoy |
