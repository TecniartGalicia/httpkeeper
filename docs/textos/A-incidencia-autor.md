Hi Huachao,

First, thank you. REST Client has been the tool I reach for every day for years, and so it is for millions of people.

Since there has been no release since June 2022 and 61 pull requests are waiting, I have published a maintained fork: **HttpKeeper** (https://github.com/TecniartGalicia/httpkeeper). Your copyright notice and the MIT license are intact, your name is in the README and in `contributors`, and the full git history is preserved.

What it adds so far: a test suite (37 tests; the original had none), 0 vulnerabilities in production dependencies (from 75), telemetry removed, three of the open PRs merged after testing them (#1440, #1432, #853), and the three most-voted requests since 2018 implemented (#267 assertions, #724 sequential runs, #432 a CLI runner). Two PRs were rejected with the reasons written down (#1396, #532).

I know @tutilus also maintains rest-client-next; I have offered in #1394 to join forces rather than split the users.

Everything is offered back. If you would rather merge any of it here, or if you come back to the project, I will happily help with that instead - a fork is the second-best outcome. And if you would prefer a different name, or that the fork not mention REST Client the way it does, tell me and I will change it.
