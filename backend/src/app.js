import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import authRoutes from './routes/authRoutes.js';
import excelRoutes from './routes/excelRoutes.js';
import userRoutes from './routes/userRoutes.js';
import { openapiSpec } from './openapi/spec.js';
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

app.get('/docs/openapi.json', (req, res) => {
  res.json(openapiSpec);
});

app.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(openapiSpec, {
    explorer: true,
    customSiteTitle: 'JSW API',
  }),
);

app.use('/auth', authRoutes);
app.use('/excel', excelRoutes);
app.use('/users', userRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
