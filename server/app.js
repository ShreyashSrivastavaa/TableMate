import express from 'express';
import cookieParser from 'cookie-parser';
import publicRouter from './routes/public.js';
import ownerRouter from './routes/owner.js';
import whatsappRouter from './whatsapp/webhook.js';

const app = express();

// Preserve raw body buffer for WhatsApp HMAC signature validation
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Mount API routes
app.use('/api', publicRouter);
app.use('/api', ownerRouter);
app.use('/api', whatsappRouter);

// Fallback for unmatched /api routes
app.use('/api', (req, res) => {
  res.status(404).json({
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `API endpoint ${req.method} ${req.url} does not exist.`,
    },
  });
});

// Centralized error handler returning consistent error shape
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  const status = err.status || 500;
  res.status(status).json({
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred.',
    },
  });
});

export default app;
