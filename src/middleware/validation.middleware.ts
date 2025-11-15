import { Request, Response, NextFunction } from 'express';

// Validate email format
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Registration validation
export const validateRegistration = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { email, password, name } = req.body;

  const errors: string[] = [];

  if (!email) {
    errors.push('Email is required');
  } else if (!validateEmail(email)) {
    errors.push('Invalid email format');
  }

  if (!password) {
    errors.push('Password is required');
  } else if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!name) {
    errors.push('Name is required');
  } else if (name.length < 2) {
    errors.push('Name must be at least 2 characters long');
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      errors,
    });
    return;
  }

  next();
};

// Login validation
export const validateLogin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { email, password } = req.body;

  const errors: string[] = [];

  if (!email) {
    errors.push('Email is required');
  }

  if (!password) {
    errors.push('Password is required');
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      errors,
    });
    return;
  }

  next();
};

// Category validation
export const validateCategory = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { name } = req.body;

  if (!name || name.trim().length === 0) {
    res.status(400).json({
      success: false,
      error: 'Category name is required',
    });
    return;
  }

  if (name.length < 2) {
    res.status(400).json({
      success: false,
      error: 'Category name must be at least 2 characters long',
    });
    return;
  }

  next();
};

// Wallpaper validation
export const validateWallpaper = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let { title, category_ids } = req.body;

  const errors: string[] = [];

  if (!title || title.trim().length === 0) {
    errors.push('Wallpaper title is required');
  }

  category_ids = typeof category_ids === 'string' ? JSON.parse(category_ids) : category_ids;

  if (!category_ids || !Array.isArray(category_ids) || category_ids.length === 0) {
    errors.push('At least one category is required');
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      errors,
    });
    return;
  }

  next();
};

// Pagination validation
export const validatePagination = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  if (page < 1) {
    res.status(400).json({
      success: false,
      error: 'Page must be greater than 0',
    });
    return;
  }

  if (limit < 1 || limit > 100) {
    res.status(400).json({
      success: false,
      error: 'Limit must be between 1 and 100',
    });
    return;
  }

  req.query.page = page.toString();
  req.query.limit = limit.toString();

  next();
};
