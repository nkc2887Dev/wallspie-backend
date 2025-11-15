import { Request, Response } from 'express';
import { CategoryModel } from '../models/Category.model';
import { SlugUtil } from '../utils/slug.util';
import { CategorySource } from '../types';

export class CategoryController {
  // Get all categories (public)
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      // Always include wallpaper count stats
      const categories = await CategoryModel.getWithStats();

      res.json({
        success: true,
        data: categories,
      });
    } catch (error: any) {
      console.error('Get categories error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch categories',
      });
    }
  }

  // Get category by slug (public)
  static async getBySlug(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.params;

      const category = await CategoryModel.findBySlug(slug);

      if (!category) {
        res.status(404).json({
          success: false,
          error: 'Category not found',
        });
        return;
      }

      res.json({
        success: true,
        data: category,
      });
    } catch (error: any) {
      console.error('Get category error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch category',
      });
    }
  }

  // Create category (admin only)
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const { name, description, thumbnail_url, order_position } = req.body;

      // Generate slug
      const slug = SlugUtil.generate(name);

      // Check if slug exists
      const slugExists = await CategoryModel.slugExists(slug);
      if (slugExists) {
        res.status(400).json({
          success: false,
          error: 'Category with this name already exists',
        });
        return;
      }

      // Create category
      const categoryId = await CategoryModel.create({
        name,
        slug,
        description,
        thumbnail_url,
        order_position,
        is_predefined: 0,
        source: CategorySource.ADMIN,
      });

      const category = await CategoryModel.findById(categoryId);

      res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: category,
      });
    } catch (error: any) {
      console.error('Create category error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create category',
      });
    }
  }

  // Update category (admin only)
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, description, thumbnail_url, order_position } = req.body;

      const category = await CategoryModel.findById(parseInt(id));
      if (!category) {
        res.status(404).json({
          success: false,
          error: 'Category not found',
        });
        return;
      }

      // Generate new slug if name changed
      let slug = category.slug;
      if (name && name !== category.name) {
        slug = SlugUtil.generate(name);
        const slugExists = await CategoryModel.slugExists(slug, parseInt(id));
        if (slugExists) {
          res.status(400).json({
            success: false,
            error: 'Category with this name already exists',
          });
          return;
        }
      }

      // Update category
      await CategoryModel.update(parseInt(id), {
        name,
        slug,
        description,
        thumbnail_url,
        order_position,
      });

      const updatedCategory = await CategoryModel.findById(parseInt(id));

      res.json({
        success: true,
        message: 'Category updated successfully',
        data: updatedCategory,
      });
    } catch (error: any) {
      console.error('Update category error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update category',
      });
    }
  }

  // Delete category (admin only)
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const category = await CategoryModel.findById(parseInt(id));
      if (!category) {
        res.status(404).json({
          success: false,
          error: 'Category not found',
        });
        return;
      }

      await CategoryModel.delete(parseInt(id));

      res.json({
        success: true,
        message: 'Category deleted successfully',
      });
    } catch (error: any) {
      console.error('Delete category error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete category',
      });
    }
  }

  // Get category by source (admin)
  static async getBySource(req: Request, res: Response): Promise<void> {
    try {
      const { source } = req.params;

      if (source !== 'admin') {
        res.status(400).json({
          success: false,
          error: 'Invalid source. Must be "admin"',
        });
        return;
      }

      const categories = await CategoryModel.getBySource(source as CategorySource);

      res.json({
        success: true,
        data: categories,
      });
    } catch (error: any) {
      console.error('Get categories by source error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch categories',
      });
    }
  }

  // Get wallpapers by category (public)
  static async getWallpapers(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 12;

      // Check if category exists
      const category = await CategoryModel.findById(parseInt(id));
      if (!category) {
        res.status(404).json({
          success: false,
          error: 'Category not found',
        });
        return;
      }

      // Get wallpapers
      const result = await CategoryModel.getWallpapers(parseInt(id), page, limit);

      res.json({
        success: true,
        data: result.wallpapers,
        pagination: {
          page: result.page,
          limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error: any) {
      console.error('Get category wallpapers error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch wallpapers',
      });
    }
  }
}
