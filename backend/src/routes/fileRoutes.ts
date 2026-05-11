import { Router } from 'express';
import multer from 'multer';
import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { config } from '../config/env.js';
import * as fileController from '../controllers/fileController.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.chunkSizeLimit },
});

const router = Router();

const uuidParam = param('id').isUUID().withMessage('Invalid file id');

const uploadChunkValidators = [
  body('file_id').isUUID().withMessage('Valid file_id is required'),
  body('chunk_index').isInt({ min: 0 }).withMessage('chunk_index must be a non-negative integer'),
  body('total_chunks').isInt({ min: 1 }).withMessage('total_chunks must be at least 1'),
  body('original_name').trim().notEmpty().withMessage('original_name is required'),
  body('mime_type').trim().notEmpty().withMessage('mime_type is required'),
];

router.post(
  '/upload',
  authenticate,
  upload.single('data'),
  uploadChunkValidators,
  fileController.uploadChunk,
);

router.get('/', authenticate, fileController.listFiles);

router.get('/:id', authenticate, [uuidParam], fileController.getFile);

router.get('/:id/download', authenticate, [uuidParam], fileController.downloadFile);

router.post(
  '/:id/send-to-model',
  authenticate,
  [uuidParam],
  fileController.sendStoredFileToModel,
);

router.delete('/:id', authenticate, [uuidParam], fileController.deleteFile);

export default router;
