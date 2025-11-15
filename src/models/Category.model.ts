import pool from '../config/database';
import { Category, CategorySource, CreateCategoryDTO } from '../types';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

export class CategoryModel {
  // Create new category
  static async create(categoryData: CreateCategoryDTO): Promise<number> {
    const slug = categoryData.slug || this.generateSlug(categoryData.name);

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO categories (name, slug, description, thumbnail_url, order_position, is_predefined, source, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        categoryData.name,
        slug,
        categoryData.description || null,
        categoryData.thumbnail_url || null,
        categoryData.order_position || 0,
        categoryData.is_predefined || 0,
        categoryData.source || CategorySource.ADMIN,
      ]
    );
    return result.insertId;
  }

  // Get all active categories
  static async getAll(includeInactive: boolean = false): Promise<Category[]> {
    let query = 'SELECT * FROM categories';

    if (!includeInactive) {
      query += ' WHERE is_active = 1';
    }

    query += ' ORDER BY order_position ASC, name ASC';

    const [rows] = await pool.query<RowDataPacket[]>(query);
    return rows as Category[];
  }

  // Get category by ID
  static async findById(id: number): Promise<Category | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM categories WHERE id = ?',
      [id]
    );
    return rows.length > 0 ? (rows[0] as Category) : null;
  }

  // Get category by slug
  static async findBySlug(slug: string): Promise<Category | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM categories WHERE slug = ? AND is_active = 1',
      [slug]
    );
    return rows.length > 0 ? (rows[0] as Category) : null;
  }

  // Update category
  static async update(
    categoryId: number,
    updates: Partial<CreateCategoryDTO>
  ): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.slug) {
      fields.push('slug = ?');
      values.push(updates.slug);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.thumbnail_url !== undefined) {
      fields.push('thumbnail_url = ?');
      values.push(updates.thumbnail_url);
    }
    if (updates.order_position !== undefined) {
      fields.push('order_position = ?');
      values.push(updates.order_position);
    }

    if (fields.length === 0) return;

    values.push(categoryId);
    await pool.query(
      `UPDATE categories SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  // Delete category (soft delete)
  static async delete(categoryId: number): Promise<void> {
    await pool.query('UPDATE categories SET is_active = 0 WHERE id = ?', [
      categoryId,
    ]);
  }

  // Update wallpaper count
  static async updateWallpaperCount(categoryId: number): Promise<void> {
    await pool.query(
      `UPDATE categories c
       SET wallpaper_count = (
         SELECT COUNT(DISTINCT wc.wallpaper_id)
         FROM wallpaper_categories wc
         JOIN wallpapers w ON wc.wallpaper_id = w.id
         WHERE wc.category_id = c.id AND w.is_active = 1
       )
       WHERE c.id = ?`,
      [categoryId]
    );
  }

  // Get categories with wallpaper count
  static async getWithStats(): Promise<Category[]> {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        c.*,
        COUNT(DISTINCT wc.wallpaper_id) as wallpaper_count
      FROM categories c
      LEFT JOIN wallpaper_categories wc ON c.id = wc.category_id
      LEFT JOIN wallpapers w ON wc.wallpaper_id = w.id AND w.is_active = 1
      WHERE c.is_active = 1
      GROUP BY c.id
      ORDER BY c.order_position ASC, c.name ASC
    `);
    return rows as Category[];
  }

  // Check if slug exists
  static async slugExists(slug: string, excludeId?: number): Promise<boolean> {
    let query = 'SELECT COUNT(*) as count FROM categories WHERE slug = ?';
    const params: any[] = [slug];

    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }

    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    return rows[0].count > 0;
  }

  // Helper: Generate slug from name
  private static generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // Get predefined vs admin-created categories
  static async getBySource(source: CategorySource): Promise<Category[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM categories WHERE source = ? AND is_active = 1 ORDER BY order_position ASC',
      [source]
    );
    return rows as Category[];
  }

  // Get ordered categories (predefined first, then admin-created)
  static async getOrdered(): Promise<Category[]> {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT * FROM categories
      WHERE is_active = 1
      ORDER BY
        CASE WHEN source = 'admin' AND is_predefined = 1 THEN 0 ELSE 1 END,
        order_position ASC,
        name ASC
    `);
    return rows as Category[];
  }

  // Get wallpapers by category with pagination
  static async getWallpapers(
    categoryId: number,
    page: number = 1,
    limit: number = 12
  ): Promise<{ wallpapers: any[]; total: number; page: number; totalPages: number }> {
    const offset = (page - 1) * limit;

    // Get total count
    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(DISTINCT w.id) as total
       FROM wallpapers w
       JOIN wallpaper_categories wc ON w.id = wc.wallpaper_id
       WHERE wc.category_id = ? AND w.is_active = 1`,
      [categoryId]
    );
    const total = countRows[0].total;

    // Get wallpapers
    const [wallpaperRows] = await pool.query<RowDataPacket[]>(
      `SELECT DISTINCT
        w.id,
        w.title,
        w.slug,
        w.description,
        w.original_url,
        w.thumbnail_url,
        w.medium_url,
        w.primary_color,
        w.tags,
        w.source,
        w.is_featured,
        w.view_count,
        w.download_count,
        w.favorite_count,
        w.created_at
       FROM wallpapers w
       JOIN wallpaper_categories wc ON w.id = wc.wallpaper_id
       WHERE wc.category_id = ? AND w.is_active = 1
       ORDER BY w.created_at DESC
       LIMIT ? OFFSET ?`,
      [categoryId, limit, offset]
    );

    return {
      wallpapers: wallpaperRows,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}
