## 2025-02-28 - QStash Webhook Authorization Bypass

**Vulnerability:** Checked for the mere presence of the `upstash-signature` header instead of cryptographically verifying it using `@upstash/qstash` receiver. Also used standard `===` string equality for comparing bearer tokens which is vulnerable to timing attacks.
**Learning:** Checking for the presence of a header does not guarantee the request came from the trusted source. Additionally, consuming a stream (such as via `await req.text()`) to verify signatures will cause issues for later parsing unless cloned first.
**Prevention:** Always cryptographically verify signatures using `verifyQStashSignature` when handling QStash requests. Use `timingSafeEqual` for comparing secrets/tokens. Clone requests (`await req.clone().text()`) before reading raw text for signature verification to preserve the body stream for standard JSON parsing later.
