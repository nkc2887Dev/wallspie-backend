import { Router } from 'express';
import { FavoriteController } from '../controllers/favorite.controller';
import { authenticateToken, optionalAuth } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();

// All favorite routes require authentication
router.post('/', authenticateToken, asyncHandler(FavoriteController.add));
router.delete('/:wallpaperId', authenticateToken, asyncHandler(FavoriteController.remove));
router.get('/', authenticateToken, asyncHandler(FavoriteController.getAll));
router.get('/check/:wallpaperId', optionalAuth, asyncHandler(FavoriteController.check));

export default router;
