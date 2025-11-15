import { Router } from 'express';
import { WallpaperController } from '../controllers/wallpaper.controller';
import { authAdmin, optionalAuth } from '../middleware/auth.middleware';
import { validateWallpaper, validatePagination } from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();

// Public routes
router.get('/', validatePagination, asyncHandler(WallpaperController.getAll));
router.get('/featured', asyncHandler(WallpaperController.getFeatured));
router.get('/trending', asyncHandler(WallpaperController.getTrending));
router.get('/search', validatePagination, asyncHandler(WallpaperController.search));
router.get('/:id/resolutions', asyncHandler(WallpaperController.getResolutions));
router.get('/:slug', optionalAuth, asyncHandler(WallpaperController.getBySlug));

// Admin routes
router.post(
  '/',
  authAdmin,
  WallpaperController.upload,
  validateWallpaper,
  asyncHandler(WallpaperController.create)
);
router.put('/:id', authAdmin, asyncHandler(WallpaperController.update));
router.delete('/:id', authAdmin, asyncHandler(WallpaperController.delete));

export default router;
