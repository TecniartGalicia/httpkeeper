# HttpKeeper

**Send HTTP requests from a `.http` file and read the response in the editor.** No account, no cloud, no paywall, no telemetry.

A maintained fork of [REST Client](https://github.com/Huachao/vscode-restclient) by **Huachao Mao** (MIT) — 7.5 million installs, 4.9 stars, and no release since June 2022. Same `.http` format, same settings, picked up and kept alive.

![A request on the left, the response on the right](https://raw.githubusercontent.com/TecniartGalicia/httpkeeper/master/media/shots/01-send.png)

## Why this fork exists

The original is not broken; it is parked. Its repository has **529 open issues and 61 pull requests** that nobody merges, and the reason is concrete: the project had **zero tests**. Merging sixty-one patches from strangers without a safety net is a coin flip, so nobody did it for four years.

So the first thing this fork shipped was not a feature. It was the net.

| | Original | HttpKeeper |
|---|---|---|
| Tests | 0 | **37** (16 unit, 21 integration against a real server) |
| Vulnerabilities in production deps | 75 (6 critical) | **0** |
| Packages | 1,487 | **399** |
| Telemetry | Application Insights | **none** |

`aws-amplify` — the whole AWS SDK, GraphQL, DataStore, ML predictions and all — was being pulled in for a Cognito login. It is now sixty lines that talk to Cognito over HTTP: **1,088 packages gone**.

## What you get on top

Three bugs its users had been reporting for years are fixed: the response not showing up **in Cursor**, a re-sent request carrying mangled headers, and a JSONPath with several matches quietly returning just the first one.

Two other pull requests were **rejected** after testing them: one that claimed to fix IPv6 and broke `localhost` instead, and the most upvoted of the lot — it ran shell commands straight from the `.http` file.

Then three things the original's users have been asking for since 2018, each with the votes to prove it:

**Run every request in a file, in order** (+62 votes) — later requests use what earlier ones returned.

![The token from one response used in the next request](https://raw.githubusercontent.com/TecniartGalicia/httpkeeper/master/media/shots/02-chain.png)

**Assertions, written in the file** (+59 votes) — as `@` comments, so any other tool that reads the format just ignores them:

```http
# @name login
POST {{host}}/auth
Content-Type: application/json

{"user": "ana"}

# @assert status == 200
# @assert body.$.token exists
# @assert header.content-type contains json
# @assert time < 2000
```

**A terminal runner** (+44 votes) — the same file, in your CI:

```console
$ httpkeeper api.http
  ok   login                200  184 ms
  ok   facturas             200    9 ms

2 peticiones, todo en verde
```

![The same file run from the integrated terminal](https://raw.githubusercontent.com/TecniartGalicia/httpkeeper/master/media/shots/04-runner.png)

Exit code 0 when every assertion passes, 1 when one fails, `--json` for machines. That is all a CI server needs.

## Migrating from REST Client

Nothing to do. The `.http` format is identical — JetBrains uses it too — and **your `rest-client.*` settings are still read**, so eight years of configuration keep working. Your own `httpkeeper.*` settings win when you set them. Your history, cookies and environments are read from the same `~/.rest-client` folder, so you keep them too.

The interface is available in English and Spanish.

## Not covered

No Postman-style GUI, no cloud collections, no team sync, no accounts. The product is a text file in your repository and it stays that way.

The terminal runner uses its own parser for the format: method, URL, headers, inline bodies and `< file` bodies. Pasted cURL and hand-built multipart work in the editor, not yet in the runner.

## Credit

All the hard-won behaviour in here is Huachao Mao's work, kept under MIT. Changes are offered back upstream. If the original comes back to life, so much the better.

---

Argalla · Tecniart Galicia, S.L. — [Español](README.es.md)
