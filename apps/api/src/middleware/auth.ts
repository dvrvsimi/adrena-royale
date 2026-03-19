import { Request, Response, NextFunction } from 'express';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { isDevelopment } from '../config/env';

// Extend Express Request to include wallet
declare global {
  namespace Express {
    interface Request {
      wallet?: string;
    }
  }
}

/**
 * Middleware to verify Solana wallet signature
 *
 * Expects headers:
 * - x-wallet: The wallet public key (base58)
 * - x-signature: The signature (base58)
 * - x-message: The message that was signed
 *
 * Message format should include timestamp for replay protection:
 * "Sign in to Adrena Royale: {timestamp}"
 *
 * In development mode, you can use x-dev-wallet header to bypass signature verification.
 */
export function verifyWalletSignature(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Dev mode bypass - only in development
  if (isDevelopment && req.headers['x-dev-wallet']) {
    req.wallet = req.headers['x-dev-wallet'] as string;
    next();
    return;
  }

  const wallet = req.headers['x-wallet'] as string;
  const signature = req.headers['x-signature'] as string;
  const message = req.headers['x-message'] as string;

  if (!wallet || !signature || !message) {
    res.status(401).json({
      error: 'Missing authentication headers',
      required: ['x-wallet', 'x-signature', 'x-message']
    });
    return;
  }

  try {
    // Decode base58 values
    const publicKeyBytes = bs58.decode(wallet);
    const signatureBytes = bs58.decode(signature);
    const messageBytes = new TextEncoder().encode(message);

    // Verify signature
    const isValid = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes
    );

    if (!isValid) {
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    // Check message timestamp (prevent replay attacks)
    const timestampMatch = message.match(/:\s*(\d+)$/);
    if (timestampMatch) {
      const timestamp = parseInt(timestampMatch[1], 10);
      const now = Date.now();
      const maxAge = 5 * 60 * 1000; // 5 minutes

      if (now - timestamp > maxAge) {
        res.status(401).json({ error: 'Signature expired' });
        return;
      }
    }

    // Attach wallet to request
    req.wallet = wallet;
    next();
  } catch (error) {
    console.error('Signature verification error:', error);
    res.status(401).json({ error: 'Invalid signature format' });
  }
}

/**
 * Optional auth - doesn't fail if no auth provided
 */
export function optionalWalletAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const wallet = req.headers['x-wallet'] as string;
  const signature = req.headers['x-signature'] as string;
  const message = req.headers['x-message'] as string;

  // If no auth headers, just continue
  if (!wallet || !signature || !message) {
    next();
    return;
  }

  // If auth headers present, verify them
  verifyWalletSignature(req, res, next);
}
