import { Request, Response, NextFunction } from 'express';

// Error handler interface
interface ErrorResponse {
  success: boolean;
  error: string;
  details?: any;
  stack?: string;
}

// Global error handler
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  const response: ErrorResponse = {
    success: false,
    error: message,
  };

  // Add details in development mode
  if (process.env.NODE_ENV === 'development') {
    response.details = err.details || null;
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

// Not found handler
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} not found`,
  });
};

// Async handler wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
