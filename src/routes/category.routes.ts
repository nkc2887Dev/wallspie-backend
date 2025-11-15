import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller';
import { authAdmin } from '../middleware/auth.middleware';
import { validateCategory } from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();

// Public routes
router.get('/', asyncHandler(CategoryController.getAll));
router.get('/:id/wallpapers', asyncHandler(CategoryController.getWallpapers));
router.get('/:slug', asyncHandler(CategoryController.getBySlug));

// Admin routes
router.post('/', authAdmin, validateCategory, asyncHandler(CategoryController.create));
router.put('/:id', authAdmin, validateCategory, asyncHandler(CategoryController.update));
router.delete('/:id', authAdmin, asyncHandler(CategoryController.delete));
router.get('/source/:source', authAdmin, asyncHandler(CategoryController.getBySource));

export default router;
