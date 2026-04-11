## 2024-05-24 - [CRITICAL] QStash Authentication Bypass Via Header Presence

**Vulnerability:** Found two routes (`app/api/executive/knowledge/embed/route.ts` and `app/api/executive/metrics/refresh/route.ts`) that were attempting to authenticate QStash webhooks by merely checking for the presence of the `upstash-signature` header (`if (qstashSignature || authHeader === ...)`).

**Learning:** Checking for the presence of a header without validating it is a severe authentication bypass vulnerability, because an attacker can simply send a request with a fake `upstash-signature` header (e.g., `upstash-signature: 1`) to completely bypass authentication for those routes.

**Prevention:** Always cryptographically verify QStash webhook requests using `verifyQStashSignature` from `@/lib/queue/verify` along with the raw request body. Never rely solely on the presence of the header. Ensure that `rawBody = await req.text()` is read and parsed carefully since it consumes the request stream.
