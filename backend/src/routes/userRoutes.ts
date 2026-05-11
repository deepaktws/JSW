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

const createUserValidators = [
  body()
    .isArray({ min: 1 })
    .withMessage('Request body must be an array with at least one user'),
  body('*.name').optional().trim().notEmpty().withMessage('Name must not be empty if provided'),
  body('*.email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('*.password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('*.isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];

router.get('/', authenticate, userController.getUsers);
router.post('/', authenticate, createUserValidators, userController.createUsers);

router.patch('/me', authenticate, updateUserValidators, userController.updateUser);
router.delete('/me', authenticate, userController.deleteUser);

router.get('/:id', authenticate, [uuidParam], userController.getUserById);

export default router;
