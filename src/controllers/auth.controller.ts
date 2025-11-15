import { Request, Response } from 'express';
import { UserModel } from '../models/User.model';
import { PasswordUtil } from '../utils/password.util';
import { JWTUtil } from '../utils/jwt.util';
import { FingerprintUtil } from '../utils/fingerprint.util';
import { UserType } from '../types';

export class AuthController {
  // Register new user
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, name } = req.body;

      // Check if email already exists
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        res.status(400).json({
          success: false,
          error: 'Email already registered',
        });
        return;
      }

      // Validate password strength
      const passwordValidation = PasswordUtil.validate(password);
      if (!passwordValidation.isValid) {
        res.status(400).json({
          success: false,
          errors: passwordValidation.errors,
        });
        return;
      }

      // Hash password
      const hashedPassword = await PasswordUtil.hash(password);

      // Create user
      const userId = await UserModel.create({
        email,
        password: hashedPassword,
        name,
        user_type: UserType.REGISTERED,
        is_owner: 0,
        ip_address: FingerprintUtil.getClientIP(req),
        is_active: 1,
      });

      // Get created user
      const user = await UserModel.findById(userId);

      if (!user) {
        res.status(500).json({
          success: false,
          error: 'Failed to create user',
        });
        return;
      }

      // Generate tokens
      const tokens = JWTUtil.generateTokens({
        userId: user.id,
        email: user.email,
        userType: user.user_type,
        isOwner: user.is_owner === 1,
      });

      // Update last login
      await UserModel.updateLastLogin(userId);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            user_type: user.user_type,
            is_owner: user.is_owner,
          },
          ...tokens,
        },
      });
    } catch (error: any) {
      console.error('Register error:', error);
      res.status(500).json({
        success: false,
        error: 'Registration failed',
      });
    }
  }

  // Login
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await UserModel.findByEmail(email);
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Invalid email or password',
        });
        return;
      }

      // Check if user is active
      if (user.is_active === 0) {
        res.status(403).json({
          success: false,
          error: 'Account is deactivated',
        });
        return;
      }

      // Verify password
      if (!user.password) {
        res.status(401).json({
          success: false,
          error: 'Invalid email or password',
        });
        return;
      }

      const isValidPassword = await PasswordUtil.compare(password, user.password);
      if (!isValidPassword) {
        res.status(401).json({
          success: false,
          error: 'Invalid email or password',
        });
        return;
      }

      // Generate tokens
      const tokens = JWTUtil.generateTokens({
        userId: user.id,
        email: user.email,
        userType: user.user_type,
        isOwner: user.is_owner === 1,
      });

      // Update last login
      await UserModel.updateLastLogin(user.id);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            user_type: user.user_type,
            is_owner: user.is_owner,
          },
          ...tokens,
        },
      });
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Login failed',
      });
    }
  }

  // Create or get guest user
  static async guest(req: Request, res: Response): Promise<void> {
    try {
      // Generate fingerprint
      const fingerprint = FingerprintUtil.generate(req);

      // Check if guest user already exists
      let user = await UserModel.findByGuestIdentifier(fingerprint);

      if (!user) {
        // Create new guest user
        const userId = await UserModel.create({
          name: `Guest_${Date.now()}`,
          user_type: UserType.GUEST,
          is_owner: 0,
          guest_identifier: fingerprint,
          ip_address: FingerprintUtil.getClientIP(req),
          is_active: 1,
        });

        user = await UserModel.findById(userId);
      }

      if (!user) {
        res.status(500).json({
          success: false,
          error: 'Failed to create guest user',
        });
        return;
      }

      // Generate tokens
      const tokens = JWTUtil.generateTokens({
        userId: user.id,
        userType: user.user_type,
        isOwner: false,
      });

      res.json({
        success: true,
        message: 'Guest user created',
        data: {
          user: {
            id: user.id,
            name: user.name,
            user_type: user.user_type,
            is_guest: true,
          },
          ...tokens,
        },
      });
    } catch (error: any) {
      console.error('Guest user creation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create guest user',
      });
    }
  }

  // Refresh token
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          error: 'Refresh token required',
        });
        return;
      }

      // Verify refresh token
      const payload = JWTUtil.verifyRefreshToken(refreshToken);

      // Generate new tokens
      const tokens = JWTUtil.generateTokens({
        userId: payload.userId,
        email: payload.email,
        userType: payload.userType,
        isOwner: payload.isOwner,
      });

      res.json({
        success: true,
        message: 'Token refreshed',
        data: tokens,
      });
    } catch (error: any) {
      res.status(403).json({
        success: false,
        error: 'Invalid or expired refresh token',
      });
    }
  }

  // Get current user profile
  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      const user = await UserModel.findById(req.user.userId);

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          user_type: user.user_type,
          is_owner: user.is_owner,
          created_at: user.created_at,
        },
      });
    } catch (error: any) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get profile',
      });
    }
  }

  // Logout (client-side token removal)
  static async logout(req: Request, res: Response): Promise<void> {
    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  }
}
