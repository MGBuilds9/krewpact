## 2024-05-18 - Prevent Stream Consumption in Next.js Authentication Middleware

**Vulnerability:** In `lib/api/cron-auth.ts`, `await req.text()` was consuming the request body stream to verify the QStash signature. This caused subsequent `req.json()` calls in the route handlers to throw `TypeError: body used already`.
**Learning:** Next.js `NextRequest` and Fetch `Request` objects consume the body stream when methods like `.text()` or `.json()` are called. Reading it early in a middleware or auth check breaks downstream processing.
**Prevention:** Always use `await req.clone().text()` when reading a raw request body for signature verification if the parsed body is needed later in the route.
