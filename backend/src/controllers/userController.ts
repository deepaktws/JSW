import { validationResult } from 'express-validator';
import type { Request, Response, NextFunction } from 'express';
import { paginatedHandler } from '../lib/pagination.js';
import * as userService from '../services/userService.js';
import type { CreateUserInput } from '../services/userService.js';

export const getUsers = paginatedHandler(userService.listUsers, 'users');

export async function createUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ message: 'Validation failed', errors: errors.array() });
      return;
    }

    const usersArray = req.body as CreateUserInput[];
    const creatorId = req.user.id;

    const result = await userService.createUsers(usersArray, creatorId);

    const hasCreated = result.created.length > 0;
    const hasFailed = result.failed.length > 0;

    let statusCode = 201;
    if (hasFailed && !hasCreated) {
      statusCode = 400;
    } else if (hasFailed && hasCreated) {
      statusCode = 207;
    }

    res.status(statusCode).json({
      created: result.created.map((c) => c.user),
      failed: result.failed,
      summary: {
        total: usersArray.length,
        succeeded: result.created.length,
        failed: result.failed.length,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ message: 'Validation failed', errors: errors.array() });
      return;
    }

    const user = await userService.getUserById(String(req.params.id));
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ message: 'Validation failed', errors: errors.array() });
      return;
    }

    const { name, email, password } = req.body as {
      name?: string;
      email?: string;
      password?: string;
    };
    if (name === undefined && email === undefined && password === undefined) {
      res.status(400).json({ message: 'No fields to update' });
      return;
    }

    const user = await userService.updateUser(
      req.user.id,
      { name, email, password },
      req.user.id,
    );
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await userService.softDeleteUser(req.user.id, req.user.id);
    res.json({ message: 'User deleted', user });
  } catch (err) {
    next(err);
  }
}
