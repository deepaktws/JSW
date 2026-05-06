import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import * as excelController from '../controllers/excelController.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/\.xlsx?$/i.test(file.originalname)) {
      cb(null, true);
    } else {
      const err = new Error('Only Excel files (.xls, .xlsx) are allowed');
      err.status = 400;
      cb(err);
    }
  },
});

const router = Router();

router.post('/upload', authenticate, upload.single('file'), excelController.uploadExcel);

export default router;
