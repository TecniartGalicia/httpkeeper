# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-08-26

First release of HttpKeeper, a maintained fork of [REST Client](https://github.com/Huachao/vscode-restclient) 0.25.1 by Huachao Mao (MIT), which has had no release since June 2022.

Everything REST Client did still works, with the same `.http` format and the same settings. What follows is what changed.

### Added

- **Run all requests in a file, in order** (+62 votes upstream). Later requests use what earlier ones returned; a failure stops the run unless you ask it to continue.
- **Assertions written in the file** (+59 votes upstream): `# @assert status == 200`, with seven operators over status, time, headers and JSON body. They live in `@` comments, so any other tool that reads the format ignores them.
- **A terminal runner** (+44 votes upstream): `httpkeeper api.http` runs the same file outside the editor, exits 0 or 1, and takes `--json`, `--var` and `--continuar`. Enough for CI.
- Spanish translation of the whole interface: commands, settings, marketplace description, status bar, code lenses, dialogs and diagnostics.
- `header.x` is accepted as well as `headers.x` in assertions, and an assertion whose subject is not recognised now says so instead of comparing against an empty string — with `!=` it used to pass and the file looked green.

### Fixed

- **The response did not show up in Cursor** (upstream PR #1440). The code assumed `window.activeTextEditor.viewColumn` exists; there it can be `undefined`, and nothing happened when you sent a request.
- **Re-sending a request carried mangled headers** (upstream PR #1432, issue #682 from 2021). Preparation now works on a copy.
- **A JSONPath matching several values returned only the first**, silently (upstream PR #853).
- **XPath in request variables was broken** by the move to `@xmldom/xmldom`, which requires an explicit MIME type. Caught by the test suite before release.
- **Three leftovers from the rename**, all invisible to the compiler and visible the moment you open a response: the response panel loaded a stylesheet under its old name and rendered unstyled, the file links in a `.http` document invoked `rest-client._openDocumentLink` (with REST Client installed, the other extension answered), and the response tab icon pointed at a file that no longer exists. The audit now checks that every resource the code asks for exists and travels inside the package.
- Diagnostics were only recalculated when a `rest-client.*` setting changed, never for `httpkeeper.*`.

### Changed

- **Telemetry removed entirely**: file, decorator, setting, instrumentation key and dependency. The extension makes no network request other than the ones you write.
- **`aws-amplify` replaced** by sixty lines that talk to Cognito over HTTP. It was pulling the whole AWS SDK — GraphQL, DataStore, ML predictions, pubsub — for a login: **1,088 packages removed**.
- **Zero vulnerabilities** in production dependencies, down from 75 (6 critical, 24 high). `axios` and `form-data` are pinned through overrides because the package that pulls them, `adal-node`, is abandoned by Microsoft; `uuid` moved from 3 to 11.
- `xmldom` migrated to `@xmldom/xmldom`; `jsonpath-plus` and `httpsnippet` updated.
- Own icon and identity. No asset from the original project ships here.
- `THIRD-PARTY-NOTICES.txt` ships in the package with the license of every bundled dependency (171 packages; all MIT, ISC, BSD or Apache-2.0).
- The default `User-Agent` is now `httpkeeper`.
- History, cookies and environments are still read from `~/.rest-client`, on purpose, so migrating keeps them. `HTTPKEEPER_HOME` overrides it if you want the two extensions kept apart.

### Rejected, after testing them

- **PR #1396, «Fix IPv6 Support for Localhost»** — it does the opposite. With the patch, a request to `localhost` against a server listening only on `::1` does not arrive; without it, it does. Test P-27 stays in the suite guarding the correct behaviour.
- **PR #532, «Eval system variable»** (the most upvoted that still applies) — it runs shell commands taken from the `.http` file. That turns any request file into arbitrary code execution: clone someone's repository, open their file, press Send Request. Rejected as written; the reasoning and what it would need is in `docs/PRS-REVISADOS.md`.

### Known limitations

- `adal-node` (Azure AD) is deprecated upstream by Microsoft. Migrating it cannot be tested without Azure credentials, so it stays until it can.
- The terminal runner uses its own parser: pasted cURL and multipart bodies work in the editor, not yet in the runner.

[1.0.0]: https://github.com/TecniartGalicia/httpkeeper/releases/tag/v1.0.0
