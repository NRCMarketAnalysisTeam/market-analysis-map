# Analytics browser regression tests

Start the development workflow (`npm run dev`), then run:

```sh
npx playwright install chromium
npm run test:browser
```

For an existing system Chromium installation, skip the download:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/path/to/chromium npm run test:browser
```

`PLAYWRIGHT_BASE_URL` optionally selects a different **development** server.
These tests depend on Vite's source-module URLs, not the production build.

The suite captures calls using a mock `window.umami.track`. Search requests
and map tiles are intercepted, so tests do not call external providers.
PNG rendering is replaced at the module boundary to deterministically test
the real export handler's success, failure, pending and retry behaviour.
It does not verify image fidelity or an actual operating-system download.
Store tests invoke the real Zustand actions in the browser; they are not
coverage of every map gesture. Rendering remains under React StrictMode.

Tests compare the entire event sequence and exact payloads, including after
render frames, rather than checking only whether a named event appeared.
Private sample text and coordinates must never enter the payloads.
Traces for failures go to ignored `generated-artifacts/playwright/`.

Do not enable a live tracker to run these tests. No tracker is loaded on the live site.
Live delivery verification must wait for the approved privacy notice, the
user enabling analytics, and republication.
