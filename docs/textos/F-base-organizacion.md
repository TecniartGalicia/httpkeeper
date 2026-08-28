# Para la incidencia «qué fork usar de base» en vscode-restclient/vscode-restclient

Marcello dijo que abriría esa incidencia y que le había pedido a una IA los pros y contras. Esto es lo que se publica cuando la abra (lo publica el humano): hechos comprobables, con lo que tiene cada uno y lo que le falta, y un plan de adopción que le cuesta a él cinco minutos.

---

> Facts first, so the comparison is about code and not about people. Everything below can be checked in the repos.
>
> | | Huachao/master (org repo today) | tutilus/rest-client-next | TecniartGalicia/httpkeeper |
> |---|---|---|---|
> | History | original | independent (re-imported) | original + 15 commits on top, `git log` shows both |
> | Tests | 0 | ? | 52 (24 unit, 28 integration sending real requests through the extension) |
> | Production vulnerabilities (`npm audit --omit=dev`) | 75 (6 critical) | ? | 0 |
> | Dependencies | 1,487 packages | ? | 399 (`aws-amplify` replaced by 60 lines) |
> | Telemetry | Application Insights | ? | removed |
> | CI | Node CI from 2019 (fails) | GitHub Actions | GitHub Actions on Linux/macOS/Windows; release workflow publishes Marketplace + Open VSX + npm + GitHub from one tag; the packaged `.vsix` is installed in a clean VS Code and exercised as part of CI |
> | Upstream PRs | 61 open | some merged | 3 merged after testing (#1440 Cursor, #1432, #853), 2 rejected with reasons (#1396 breaks localhost, #532 runs shell commands), 4 pending, 52 conflict |
> | Most-voted features | — | — | #267 assertions, #724/#444 run a whole file, #432 CLI runner, #229/#627 env files, #182/#845/#1148 import/run, #279 secrets, #493 SSE, #173 WebSocket |
> | Compatibility | — | — | additive only: REST Client files, `rest-client.*` settings and `~/.rest-client` unchanged; 28 integration tests pin the inherited behaviour |
> | Docs | README | split into docs | README + Huachao's full reference verbatim (`docs/REFERENCE.md`) |
> | Published | `humao.rest-client` (2022) | `tutilus.rest-client-next` (Open VSX?) | `argalla.httpkeeper` on Marketplace + Open VSX, `httpkeeper-cli` on npm, GitHub Action |
>
> I filled the tutilus column with question marks where I have not checked; @tutilus, please correct or complete it — I would rather the table be right than favourable.
>
> **How adopting HttpKeeper as the base would work** (five minutes of your time, @marcellourbani): since it is a proper fork of this repo's history, `git fetch https://github.com/TecniartGalicia/httpkeeper master && git push origin FETCH_HEAD:main` puts the whole thing here with the history intact — no rewrite, no squash, every upstream commit still attributable. Then two follow-up PRs from us: (1) graft tutilus's CI/docs/UX work, (2) rename the publishing identity to whatever the org decides. The secrets the release workflow needs (`VSCE_PAT`, `OVSX_PAT`, `NPM_TOKEN`) are the org's to create; I can document each step.
>
> **What I would keep from the others regardless of the base:** tutilus's documentation split and syntax-colouring work, and kit1211's response-tab reuse and `{{$faker}}` from rest-client-plus (#1434) if he is willing to contribute them.
>
> On the name: I have no attachment to "HttpKeeper". If the org publishes as something else, we redirect our listing to it and keep maintaining. The only thing I would not do is strand the people who already installed either fork: whichever ID wins, the others should publish one last version that points to it.
