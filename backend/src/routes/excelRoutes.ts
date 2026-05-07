import { Router } from 'express';
import multer, { type FileFilterCallback } from 'multer';
import type { Request } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as excelController from '../controllers/excelController.js';
import { AppError } from '../lib/errors.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (/\.xlsx?$/i.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new AppError('Only Excel files (.xls, .xlsx) are allowed', 400));
    }
  },
});

const router = Router();

router.post('/upload', authenticate, upload.single('file'), excelController.uploadExcel);

export default router;
