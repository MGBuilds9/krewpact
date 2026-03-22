/**
 * QStash webhook signature verification.
 *
 * Verifies incoming requests from QStash using the signing keys.
 * Returns the raw body string so the caller can parse it (since verification
 * consumes the request body stream).
 */

interface VerifyResult {
  valid: boolean;
  body?: string;
  error?: string;
}

/**
 * Verify that a request came from QStash and return the raw body.
 *
 * Uses @upstash/qstash Receiver to verify signatures.
 * In development (no signing keys), passes through without verification.
 */
export async function verifyQStashSignature(
  signature: string | null,
  body: string,
): Promise<VerifyResult> {
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;
  const isStrictEnv = process.env.NODE_ENV === 'production';

  if (!currentSigningKey || !nextSigningKey) {
    if (isStrictEnv) {
      return {
        valid: false,
        error: 'QStash signing keys are not configured in this environment',
      };
    }

    return { valid: true, body };
  }

  if (!signature) {
    return { valid: false, error: 'Missing upstash-signature header' };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Receiver } = require('@upstash/qstash') as typeof import('@upstash/qstash');
    const receiver = new Receiver({
      currentSigningKey,
      nextSigningKey,
    });

    const isValid = await receiver.verify({ signature, body });

    if (isValid) {
      return { valid: true, body };
    }
    return { valid: false, error: 'Invalid signature' };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : 'Signature verification failed',
    };
  }
}
