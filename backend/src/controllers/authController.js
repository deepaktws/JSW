import { validationResult } from 'express-validator';
import * as authService from '../services/authService.js';

export async function login(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { email, password } = req.body;
    const result = await authService.loginUser({ email, password });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function me(req, res, next) {
  try {
    const user = await authService.getUserProfile(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Account not found' });
    }
    res.json({ user });
  } catch (err) {
    next(err);
  }
}
