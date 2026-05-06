import { validationResult } from 'express-validator';
import * as userService from '../services/userService.js';

export async function getUsers(req, res, next) {
  try {
    const users = await userService.listUsers();
    res.json({ users });
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

    const user = await userService.updateUser(req.user.id, {
      name,
      email,
      password,
    });
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(req, res, next) {
  try {
    const user = await userService.softDeleteUser(req.user.id);
    res.json({ message: 'User deleted', user });
  } catch (err) {
    next(err);
  }
}
