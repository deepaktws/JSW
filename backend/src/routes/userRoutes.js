import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import * as userController from '../controllers/userController.js';

const router = Router();

const uuidParam = param('id').isUUID().withMessage('Invalid user id');

const updateUserValidators = [
  body('name').optional().trim().notEmpty(),
  body('email').optional().isEmail().normalizeEmail(),
  body('password')
    .optional()
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
];

router.get('/', authenticate, userController.getUsers);

router.patch('/me', authenticate, updateUserValidators, userController.updateUser);
router.delete('/me', authenticate, userController.deleteUser);

router.get('/:id', authenticate, [uuidParam], userController.getUserById);

export default router;
