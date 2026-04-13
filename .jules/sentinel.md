## 2023-10-27 - [CRITICAL] QStash Signature Verification Pattern Missed
**Vulnerability:** Authorization Bypass in `app/api/executive/knowledge/embed/route.ts` and `app/api/executive/metrics/refresh/route.ts`.
**Learning:** Checking for the presence of the `upstash-signature` header (`if (req.headers.get('upstash-signature'))`) is insufficient. It allows attackers to spoof the header and bypass authentication.
**Prevention:** Always cryptographically verify QStash webhooks using `verifyQStashSignature` from `@/lib/queue/verify`. Ensure the request body is cloned (`req.clone().text()`) before verification so downstream handlers can still parse the body.
