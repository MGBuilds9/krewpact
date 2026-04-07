## 2024-05-24 - [Path Traversal in Staging Bulk Import]
**Vulnerability:** A Path Traversal vulnerability existed in `app/api/executive/staging/bulk-import/route.ts` where the `path` attribute of uploaded files wasn't sufficiently sanitized before passing to `fs/promises`' `readFile`.
**Learning:** Even internal admin-only APIs require rigorous path validation when reading local file paths provided by users via JSON payloads, as this allows arbitrary file read on the server.
**Prevention:** Always validate and normalize paths provided via user input (e.g. using `path.normalize` and checking for absolute paths or `..` sequences).
