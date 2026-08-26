Another maintained fork, for anyone weighing options in this thread: **HttpKeeper** (https://github.com/TecniartGalicia/httpkeeper - `argalla.httpkeeper` on the Marketplace and on Open VSX, so it installs in Cursor and VSCodium too).

@tutilus's rest-client-next and this one started from the same place, and I would rather join forces than split the users. @marcellourbani's organisation idea is the right one; I am in if you both are.

What HttpKeeper has done so far, in case it is useful to either fork:

- A test suite: 37 tests against a real local server. The original had none, which is why the 61 open PRs were never safe to merge.
- Production dependencies at 0 vulnerabilities (from 75). `aws-amplify` - the whole AWS SDK - was pulled in for a Cognito login; it is now a small HTTP client, 1,088 packages gone. Telemetry removed.
- PRs #1440 (the Cursor fix, #1434), #1432 and #853 merged after testing them; #1396 and #532 rejected, with the reasons written down.
- The three most-voted requests here implemented: #267 assertions in the file, #724 / #444 running a whole file in order with chained variables, and #432 a CLI runner with exit codes for CI.

Same `.http` format, `rest-client.*` settings still read, same `~/.rest-client` folder: switching in either direction costs nothing.

Huachao's copyright and MIT license are kept, and everything is offered back upstream.
