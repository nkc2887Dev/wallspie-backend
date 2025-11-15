import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authAdmin } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();

// All routes require admin authentication
router.get('/', authAdmin, asyncHandler(UserController.getAll));
router.get('/stats', authAdmin, asyncHandler(UserController.getStats));
router.get('/:id', authAdmin, asyncHandler(UserController.getById));
router.post('/', authAdmin, asyncHandler(UserController.create));
router.put('/:id', authAdmin, asyncHandler(UserController.update));
router.delete('/:id', authAdmin, asyncHandler(UserController.delete));

export default router;
