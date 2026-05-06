import * as userService from '../services/userService.js';

export async function getUsers(req, res, next) {
  try {
    const users = await userService.listUsers();
    res.json({ users });
  } catch (err) {
    next(err);
  }
}
