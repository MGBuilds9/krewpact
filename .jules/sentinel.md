## 2024-05-18 - QStash Authorization Bypass via Missing Signature Verification

**Vulnerability:** QStash webhook endpoints (`app/api/executive/knowledge/embed/route.ts` and `app/api/executive/metrics/refresh/route.ts`) were verifying authentication simply by checking if the `upstash-signature` header was present, rather than cryptographically verifying the signature against the request body. This allowed any attacker to bypass authentication by simply sending any request with a spoofed `upstash-signature: anything` header.

**Learning:** When validating webhooks, merely checking for the presence of a signature header is a critical authorization bypass vulnerability. Signatures must always be cryptographically verified using the corresponding webhook secret and raw request body. Also, when verifying signatures in a Next.js API route where the request body may be parsed later in the route, the request must be cloned (`await req.clone().text()`) before reading the raw body so the stream is not consumed.

**Prevention:** Always use `verifyQStashSignature(signature, rawBody)` from `@/lib/queue/verify` for QStash webhooks. Clone the request (`req.clone()`) if the parsed JSON body is needed later in the route.
