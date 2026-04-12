## 2025-04-12 - [Critical] Authentication Bypass via Queue Signature
**Vulnerability:** API routes exposed to QStash were verifying the presence of the `upstash-signature` header instead of cryptographically validating the signature with the request body, allowing complete auth bypass via header spoofing.
**Learning:** Checking for header existence instead of verifying it is a recurring trap when integrating third-party webhooks. Furthermore, using strict string comparison instead of `timingSafeEqual` for fallback token checks introduced a potential timing attack vector.
**Prevention:** Always use `verifyQStashSignature` with `req.clone().text()` to consume and validate the raw body. Use `timingSafeEqual` for all secret comparison fallback methods.
