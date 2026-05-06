import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as userController from '../controllers/userController.js';

const router = Router();

router.get('/', authenticate, userController.getUsers);

export default router;
