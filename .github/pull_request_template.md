## What

<!-- One or two lines: what this PR changes. -->

## Why

<!-- The problem it solves. Link the issue: "Closes #123". -->

## How to test

<!-- Steps a reviewer can follow, with the expected result. -->

1.

## Screenshots

<!-- For UI changes: desktop and 360 px. Delete if not a UI change. -->

## Checklist

- [ ] One topic; branch named `feat/`, `fix/`, `perf/`, `docs/`, `test/` or `chore/`
- [ ] Respects the product rules (chronological, no ads/trackers, communication free, calm, safe)
- [ ] Backend: tests for success, validation failure, unauthenticated and other-user cases; `npm test` passes
- [ ] Frontend: `npm run lint` and `npm run build` pass; loading, empty and error states; works at 360 px
- [ ] Access is checked on the server; user id comes from the session
- [ ] No secrets, personal data, `console.log` or `alert()` in the diff
- [ ] README updated if an endpoint, env var or script changed

## Security notes

<!-- New endpoints, auth or data changes, new dependencies. Write "None" if not applicable. -->
