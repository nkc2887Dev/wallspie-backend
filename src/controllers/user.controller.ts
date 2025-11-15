import { Request, Response } from 'express';
import { UserModel } from '../models/User.model';
import { UserType } from '../types';
import bcrypt from 'bcrypt';

export class UserController {
  // Get all users (admin only)
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const userType = req.query.userType ? parseInt(req.query.userType as string) : undefined;

      const { users, total } = await UserModel.getAll(page, limit, userType);

      // Remove passwords from response
      const sanitizedUsers = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });

      res.json({
        success: true,
        data: sanitizedUsers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      console.error('Get users error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch users',
      });
    }
  }

  // Get user by ID (admin only)
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const user = await UserModel.findById(parseInt(id));

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      // Remove password from response
      const { password, ...userWithoutPassword } = user;

      res.json({
        success: true,
        data: userWithoutPassword,
      });
    } catch (error: any) {
      console.error('Get user error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user',
      });
    }
  }

  // Create user (admin only)
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, password, user_type } = req.body;

      // Validate required fields
      if (!name || !email) {
        res.status(400).json({
          success: false,
          error: 'Name and email are required',
        });
        return;
      }

      // Check if email already exists
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        res.status(400).json({
          success: false,
          error: 'Email already exists',
        });
        return;
      }

      // Use default password if not provided
      const finalPassword = password || 'Test@123';
      const hashedPassword = await bcrypt.hash(finalPassword, 10);

      // Validate user_type
      const userTypeValue = user_type || UserType.REGISTERED;
      if (![UserType.ADMIN, UserType.REGISTERED].includes(userTypeValue)) {
        res.status(400).json({
          success: false,
          error: 'Invalid user type. Must be ADMIN (1) or REGISTERED (2)',
        });
        return;
      }

      // Create user
      const userId = await UserModel.create({
        name,
        email,
        password: hashedPassword,
        user_type: userTypeValue,
        is_owner: 0, // Only owner can have is_owner = 1
        is_active: 1,
      });

      const user = await UserModel.findById(userId);

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user!;

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: userWithoutPassword,
      });
    } catch (error: any) {
      console.error('Create user error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create user',
      });
    }
  }

  // Update user (admin only)
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, email, password, user_type, is_active } = req.body;

      const user = await UserModel.findById(parseInt(id));
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      // Prevent changing owner status
      if (user.is_owner === 1) {
        res.status(403).json({
          success: false,
          error: 'Cannot modify owner account',
        });
        return;
      }

      // Check if email already exists (exclude current user)
      if (email && email !== user.email) {
        const existingUser = await UserModel.findByEmail(email);
        if (existingUser && existingUser.id !== user.id) {
          res.status(400).json({
            success: false,
            error: 'Email already exists',
          });
          return;
        }
      }

      // Prepare updates
      const updates: any = {};
      if (name) updates.name = name;
      if (email) updates.email = email;
      if (is_active !== undefined) updates.is_active = is_active;

      // Validate and update user_type
      if (user_type !== undefined) {
        if (![UserType.ADMIN, UserType.REGISTERED].includes(user_type)) {
          res.status(400).json({
            success: false,
            error: 'Invalid user type. Must be ADMIN (1) or REGISTERED (2)',
          });
          return;
        }
        updates.user_type = user_type;
      }

      // Update password if provided
      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        updates.password = hashedPassword;
      }

      await UserModel.update(parseInt(id), updates);

      const updatedUser = await UserModel.findById(parseInt(id));

      // Remove password from response
      const { password: _, ...userWithoutPassword } = updatedUser!;

      res.json({
        success: true,
        message: 'User updated successfully',
        data: userWithoutPassword,
      });
    } catch (error: any) {
      console.error('Update user error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update user',
      });
    }
  }

  // Delete user (admin only)
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const user = await UserModel.findById(parseInt(id));
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      // Prevent deleting owner account
      if (user.is_owner === 1) {
        res.status(403).json({
          success: false,
          error: 'Cannot delete owner account',
        });
        return;
      }

      // Prevent deleting yourself
      if (req.user?.userId === user.id) {
        res.status(403).json({
          success: false,
          error: 'Cannot delete your own account',
        });
        return;
      }

      await UserModel.delete(parseInt(id));

      res.json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error: any) {
      console.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete user',
      });
    }
  }

  // Get user stats (admin only)
  static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await UserModel.getStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('Get user stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user stats',
      });
    }
  }
}
