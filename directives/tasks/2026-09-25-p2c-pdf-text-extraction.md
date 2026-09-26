---
id: 2026-09-25-p2c-pdf-text-extraction
directive: 2026-09-25-cmo.md#p2
priority: P2
status: open
assignee: cren-engineer
blocked_by: []
created: 2026-09-25
due: 2026-10-02
attempts: 0
merge_policy: owner
pr:
verified_by:
---
# Give the newsroom a way to read primary-source PDFs

## Goal
The newsroom routine can pull the text out of a city bulletin, agenda, or
staff report PDF and cite it as a primary record.

## Context
- On 2026-09-25 the routine downloaded Columbus City Bulletin #38 (5.1 MB)
  but could not read it: no `pdftotext` and no Python PDF library in the
  research environment. That stopped primary verification of the SR-161
  corridor rezoning (`briefs/2026-09-25.md`, egress table).
- The research environment's setup script is empty and is configured outside
  this repo (`.claude/routines.md`). A repo-level script works without
  changing that environment.

## Scope
A new script `frontend/scripts/pdf-text.mjs`, an npm script entry
`newsroom:pdf-text`, at most one new dependency, and a test with a small PDF
fixture. Telling the newsroom routine to use the script is a prompt change and
belongs on a separate `cren-docs` card; do not edit the prompts here.

## Constraints
- Pure Node, no native binaries, so it runs anywhere `npm install` runs.
- Input is a local file path. The script does no network access itself.
- Output is plain text to stdout, with page markers (`--- page N ---`) so
  claims can cite a page.

## Definition of done
- [ ] `npm run newsroom:pdf-text -- <file.pdf>` prints the text with page
      markers and exits 0; exits non-zero with a clear message on a
      non-PDF or unreadable file.
- [ ] A test with a small committed fixture PDF passes under
      `node --experimental-strip-types --test`.
- [ ] The Log records one real run against a City of Columbus bulletin PDF,
      with the bulletin number and the first heading it extracted.
- [ ] `npm run lint` passes.

## Verification
Run the test. Download any current City Bulletin PDF from columbus.gov, run
the script on it, and confirm readable text with page markers.

## Stop and escalate if
- No pure-JS library extracts the bulletin's text (for example, it is a
  scanned image). Record that and recommend the owner add `poppler-utils` to
  the research environment's setup script instead.

## Log
- 2026-09-25 — cmo — created from directive P2(c).
