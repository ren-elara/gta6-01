# Security Report

- Gitleaks filesystem scan (`gitleaks detect --source . --no-git --redact`): passed with zero findings after cleanup.
- Gitleaks staged scan (`gitleaks protect --staged --redact`): passed with zero findings after staging this report and the final source changes.
- Gitleaks repository scan (`gitleaks detect --source . --redact`): passed with zero findings; it reported zero commits scanned because this was the initial, unborn branch.
- A generic-api-key heuristic had flagged `SAVE_KEY` in the game configuration and generated copy. Review confirmed it is only the descriptive name of a browser `localStorage` save slot, not a credential. The symbol and references are now `SAVE_SLOT`; its value, `neon-harbor-afterglow.save.v1`, is unchanged to preserve save compatibility. No scanner rules were suppressed or allowlisted.
- `.gitignore` covers `.env`, `.env.*`, `*.pem`, `*.key`, `credentials.json`, and `secrets.json`; all existing ignore entries were retained.
- No secret values are included in this report. The filesystem and staged scans covered repository content; the repository-aware scan had no history to inspect before the initial commit. Generated `out/` remains ignored and is rebuilt from source.
