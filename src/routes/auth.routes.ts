import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import {
  validateRegistration,
  validateLogin,
} from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();

// Public routes
router.post('/register', validateRegistration, asyncHandler(AuthController.register));
router.post('/login', validateLogin, asyncHandler(AuthController.login));
router.post('/guest', asyncHandler(AuthController.guest));
router.post('/refresh', asyncHandler(AuthController.refreshToken));

// Protected routes
router.get('/profile', authenticateToken, asyncHandler(AuthController.getProfile));
router.post('/logout', authenticateToken, asyncHandler(AuthController.logout));

export default router;
