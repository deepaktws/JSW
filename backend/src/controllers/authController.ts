import { validationResult } from 'express-validator';
import type { Request, Response, NextFunction } from 'express';
import * as authService from '../services/authService.js';

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ message: 'Validation failed', errors: errors.array() });
      return;
    }

    const { email, password } = req.body as { email: string; password: string };
    const result = await authService.loginUser({ email, password });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await authService.getUserProfile(req.user.id);
    if (!user) {
      res.status(404).json({ message: 'Account not found' });
      return;
    }
    res.json({ user });
  } catch (err) {
    next(err);
  }
}
