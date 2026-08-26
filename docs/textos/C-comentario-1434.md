Thanks @kit1211 - your PR #1440 is the fix, and it is merged as-is in **HttpKeeper**, another maintained fork of REST Client (https://marketplace.visualstudio.com/items?itemName=argalla.httpkeeper; `argalla.httpkeeper` on Open VSX as well, so it installs from Cursor's extension panel).

Two things that may matter to people landing here from a search:

- It is on the VS Code Marketplace too, for anyone who needs the fix in VS Code or Windsurf as well as in Cursor.
- The fix is covered by an integration test: it sends a real request in an unsplit window and asserts that the response tab appears, so it cannot quietly regress.

Same `.http` format, `rest-client.*` settings still read, same `~/.rest-client` folder: nothing to migrate. The original author's credit and MIT license are kept; what else changed (37 tests, 0 vulnerabilities in dependencies, no telemetry) is in the README.
