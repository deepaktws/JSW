import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import excelRoutes from './routes/excelRoutes.js';
import userRoutes from './routes/userRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRoutes);
app.use('/excel', excelRoutes);
app.use('/users', userRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
