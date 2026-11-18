# Security Report

Revision reviewed: Harbor Courier Exchange, 18 November 2026. This report contains no secret values.

## Secret handling

- `gitleaks detect --source . --no-git --redact` passed with zero findings on the revised working files and generated output.
- `gitleaks detect --source . --redact` passed with zero findings on the existing one-commit history. This is an established repository; the earlier report's unborn-branch description no longer applies.
- `gitleaks protect --staged --redact` passed with zero findings on the staged revision. The filesystem, staged and history scans are repeated after this report is finalized, and staged/history scans are required again before pushing. Their command results in the recorded session are the evidence for those steps.
- No scanner rule was suppressed or allowlisted. No credentials were added. `.gitignore` covers `.env`, `.env.*`, `*.pem`, `*.key`, `credentials.json`, `secrets.json`, and wallet keypair files. Browser profiles, recorder artifacts, generated dossiers and isolated platform fixtures stay ignored.
- The browser save-slot identifier is application data, and the existing slot is retained for compatibility. The owner's public wallet claim and MIT terms are preserved.

## Boundaries verified

- Version 5 save loading bounds serialized size, reconstructs the known schema, validates courier identifiers, integer clocks, result rewards and records, and rejects obstructed actors before replacing the live world. Version 4 migration starts an empty courier ledger. A result never pays again when loaded.
- Courier payouts clear the active contract before applying cash. Cancellation, timeout, clinic and chapter closure have no reward or fee. Simulation tests cover repeat handoffs, retries and chapter restart.
- Build tests pass in a checkout without `.git` or `.makefun`. Source directories and ancestors, resolved aliases, dangling aliases, output-child links and dossier hardlinks are refused without changing source. Dossier bytes match the unchanged official vendor; two final builds produced identical output hashes.
- The local server passes GET/HEAD parity, module MIME, malformed URL, encoded traversal, resolved symlink, disconnected stream and invalid port checks. It binds to localhost.
- A complete Chromium keyboard/mouse playthrough passed courier delivery and saved records, both story jobs, pursuit escape, combat, completion/restart, focus pause and viewport resizing. It reported zero console, runtime or network errors and requested only local game assets.
- Four unedited Chromium JPEG captures are 1280 × 720 and below 256 KiB each. This model cannot inspect image attachments, so visual review remains with the supervising agent.

## Environment and recording limits

- Creating `/sdcard/media file agent make fun/` and its `/storage/emulated/0/` alias was denied by the host filesystem. No preview directory or `.nomedia` could be created there, and no existing media was changed. Final captures remain in `screenshots/`; the supervisor must copy them into a new isolated preview folder after storage access is available.
- The kit's worktree intake check passed. Local checks do not certify recorded-authorship percentage, final witness coverage, sealed-recording eligibility or a run record. The supervising session must inspect the sealed recording and handle those requirements.
- No make.fun submission was performed by this session.
