import { validationResult } from 'express-validator';
import { paginatedHandler } from '../lib/pagination.js';
import * as userService from '../services/userService.js';

export const getUsers = paginatedHandler(userService.listUsers, 'users');

export async function createUsers(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const usersArray = req.body;
    const creatorId = req.user.id;

    const result = await userService.createUsers(usersArray, creatorId);

    // Determine response status
    const hasCreated = result.created.length > 0;
    const hasFailed = result.failed.length > 0;
    
    let statusCode = 201; // All succeeded
    if (hasFailed && !hasCreated) {
      statusCode = 400; // All failed
    } else if (hasFailed && hasCreated) {
      statusCode = 207; // Partial success (Multi-Status)
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

export async function getUserById(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const user = await userService.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { name, email, password } = req.body;
    if (name === undefined && email === undefined && password === undefined) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    const user = await userService.updateUser(
      req.user.id,
      {
        name,
        email,
        password,
      },
      req.user.id,
    );
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(req, res, next) {
  try {
    const user = await userService.softDeleteUser(req.user.id, req.user.id);
    res.json({ message: 'User deleted', user });
  } catch (err) {
    next(err);
  }
}
