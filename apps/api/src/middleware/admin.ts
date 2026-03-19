import { Request, Response, NextFunction } from 'express';
import { env, isDevelopment } from '../config/env';
import { verifyWalletSignature } from './auth';

/**
 * Middleware to verify admin wallet
 * Must be used after verifyWalletSignature
 * In development mode, allows any authenticated wallet
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const wallet = req.wallet;

  if (!wallet) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  // In development mode, allow any wallet to be admin
  if (isDevelopment) {
    next();
    return;
  }

  if (!env.ADMIN_WALLETS.includes(wallet)) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  next();
}

/**
 * Combined middleware: verify signature + check admin
 */
export const adminAuth = [verifyWalletSignature, requireAdmin];
