import pool from '../config/database';
import { Wallpaper, WallpaperSource, Category } from '../types';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

export class WallpaperModel {
  // Create new wallpaper
  static async create(wallpaperData: Partial<Wallpaper>): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO wallpapers (
        title, slug, description, original_url, thumbnail_url, medium_url,
        primary_color, tags, source, source_id, uploaded_by, storage_provider_id,
        is_featured, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        wallpaperData.title,
        wallpaperData.slug,
        wallpaperData.description || null,
        wallpaperData.original_url,
        wallpaperData.thumbnail_url,
        wallpaperData.medium_url || null,
        wallpaperData.primary_color || null,
        wallpaperData.tags ? JSON.stringify(wallpaperData.tags) : null,
        wallpaperData.source || WallpaperSource.ADMIN,
        wallpaperData.source_id || null,
        wallpaperData.uploaded_by,
        wallpaperData.storage_provider_id,
        wallpaperData.is_featured || 0,
        wallpaperData.is_active !== undefined ? wallpaperData.is_active : 1,
      ]
    );
    return result.insertId;
  }

  // Get all wallpapers with pagination
  static async getAll(
    page: number = 1,
    limit: number = 20,
    filters?: {
      categoryId?: number;
      isFeatured?: boolean;
      source?: WallpaperSource;
      search?: string;
    }
  ): Promise<{ wallpapers: Wallpaper[]; total: number }> {
    const offset = (page - 1) * limit;
    const params: any[] = [];

    let query = `
      SELECT w.*,
        GROUP_CONCAT(DISTINCT c.id) as category_ids,
        GROUP_CONCAT(DISTINCT c.name) as category_names
      FROM wallpapers w
      LEFT JOIN wallpaper_categories wc ON w.id = wc.wallpaper_id
      LEFT JOIN categories c ON wc.category_id = c.id
      WHERE w.is_active = 1
    `;

    if (filters?.categoryId) {
      query += ' AND wc.category_id = ?';
      params.push(filters.categoryId);
    }

    if (filters?.isFeatured !== undefined) {
      query += ' AND w.is_featured = ?';
      params.push(filters.isFeatured ? 1 : 0);
    }

    if (filters?.source) {
      query += ' AND w.source = ?';
      params.push(filters.source);
    }

    if (filters?.search) {
      query += ' AND (w.title LIKE ? OR w.description LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
    }

    query += ' GROUP BY w.id ORDER BY w.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [wallpapers] = await pool.query<RowDataPacket[]>(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(DISTINCT w.id) as total FROM wallpapers w';
    let countParams: any[] = [];

    if (filters?.categoryId) {
      countQuery +=
        ' JOIN wallpaper_categories wc ON w.id = wc.wallpaper_id WHERE wc.category_id = ? AND w.is_active = 1';
      countParams.push(filters.categoryId);
    } else {
      countQuery += ' WHERE w.is_active = 1';
    }

    if (filters?.isFeatured !== undefined) {
      countQuery += ' AND w.is_featured = ?';
      countParams.push(filters.isFeatured ? 1 : 0);
    }

    if (filters?.source) {
      countQuery += ' AND w.source = ?';
      countParams.push(filters.source);
    }

    if (filters?.search) {
      countQuery += ' AND (w.title LIKE ? OR w.description LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      countParams.push(searchTerm, searchTerm);
    }

    const [countResult] = await pool.query<RowDataPacket[]>(
      countQuery,
      countParams
    );

    return {
      wallpapers: this.parseWallpapers(wallpapers),
      total: countResult[0].total,
    };
  }

  // Get wallpaper by ID
  static async findById(id: number): Promise<Wallpaper | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT w.* FROM wallpapers w WHERE w.id = ? AND w.is_active = 1`,
      [id]
    );

    if (rows.length === 0) return null;

    const wallpaper = this.parseWallpaper(rows[0]);
    wallpaper.categories = await this.getCategories(id);
    wallpaper.resolutions = await this.getResolutions(id);

    return wallpaper;
  }

  // Get wallpaper by slug
  static async findBySlug(slug: string): Promise<Wallpaper | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT w.* FROM wallpapers w WHERE w.slug = ? AND w.is_active = 1`,
      [slug]
    );

    if (rows.length === 0) return null;

    const wallpaper = this.parseWallpaper(rows[0]);
    wallpaper.categories = await this.getCategories(wallpaper.id);
    wallpaper.resolutions = await this.getResolutions(wallpaper.id);

    return wallpaper;
  }

  // Get categories for a wallpaper
  static async getCategories(wallpaperId: number): Promise<Category[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT c.* FROM categories c
       JOIN wallpaper_categories wc ON c.id = wc.category_id
       WHERE wc.wallpaper_id = ?`,
      [wallpaperId]
    );
    return rows as Category[];
  }

  // Get resolutions for a wallpaper
  static async getResolutions(wallpaperId: number): Promise<any[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM wallpaper_resolutions WHERE wallpaper_id = ? ORDER BY width DESC`,
      [wallpaperId]
    );
    return rows;
  }

  // Add categories to wallpaper
  static async addCategories(
    wallpaperId: number,
    categoryIds: number[]
  ): Promise<void> {
    if (categoryIds.length === 0) return;

    const values = categoryIds.map((catId) => [wallpaperId, catId]);
    await pool.query(
      'INSERT INTO wallpaper_categories (wallpaper_id, category_id) VALUES ?',
      [values]
    );
  }

  // Remove all categories from wallpaper
  static async removeCategories(wallpaperId: number): Promise<void> {
    await pool.query('DELETE FROM wallpaper_categories WHERE wallpaper_id = ?', [
      wallpaperId,
    ]);
  }

  // Update wallpaper
  static async update(
    wallpaperId: number,
    updates: Partial<Wallpaper>
  ): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.title) {
      fields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.slug) {
      fields.push('slug = ?');
      values.push(updates.slug);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.tags) {
      fields.push('tags = ?');
      values.push(JSON.stringify(updates.tags));
    }
    if (updates.is_featured !== undefined) {
      fields.push('is_featured = ?');
      values.push(updates.is_featured);
    }
    if (updates.is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(updates.is_active);
    }

    if (fields.length === 0) return;

    values.push(wallpaperId);
    await pool.query(
      `UPDATE wallpapers SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  // Delete wallpaper (soft delete)
  static async delete(wallpaperId: number): Promise<void> {
    await pool.query('UPDATE wallpapers SET is_active = 0 WHERE id = ?', [
      wallpaperId,
    ]);
  }

  // Increment view count
  static async incrementViewCount(wallpaperId: number): Promise<void> {
    await pool.query(
      'UPDATE wallpapers SET view_count = view_count + 1 WHERE id = ?',
      [wallpaperId]
    );
  }

  // Increment download count
  static async incrementDownloadCount(wallpaperId: number): Promise<void> {
    await pool.query(
      'UPDATE wallpapers SET download_count = download_count + 1 WHERE id = ?',
      [wallpaperId]
    );
  }

  // Get featured wallpapers
  static async getFeatured(limit: number = 10): Promise<Wallpaper[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT w.* FROM wallpapers w
       WHERE w.is_featured = 1 AND w.is_active = 1
       ORDER BY w.created_at DESC
       LIMIT ?`,
      [limit]
    );
    return this.parseWallpapers(rows);
  }

  // Get trending wallpapers (most downloaded in last 7 days)
  static async getTrending(limit: number = 10): Promise<Wallpaper[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT w.*, COUNT(d.id) as recent_downloads
       FROM wallpapers w
       LEFT JOIN downloads d ON w.id = d.wallpaper_id
         AND d.downloaded_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       WHERE w.is_active = 1
       GROUP BY w.id
       ORDER BY recent_downloads DESC, w.download_count DESC
       LIMIT ?`,
      [limit]
    );
    return this.parseWallpapers(rows);
  }

  // Search wallpapers
  static async search(
    query: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ wallpapers: Wallpaper[]; total: number }> {
    const offset = (page - 1) * limit;
    const searchTerm = `%${query}%`;

    const [wallpapers] = await pool.query<RowDataPacket[]>(
      `SELECT w.* FROM wallpapers w
       WHERE w.is_active = 1
         AND (w.title LIKE ? OR w.description LIKE ? OR w.tags LIKE ?)
       ORDER BY w.download_count DESC
       LIMIT ? OFFSET ?`,
      [searchTerm, searchTerm, searchTerm, limit, offset]
    );

    const [countResult] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM wallpapers w
       WHERE w.is_active = 1
         AND (w.title LIKE ? OR w.description LIKE ? OR w.tags LIKE ?)`,
      [searchTerm, searchTerm, searchTerm]
    );

    return {
      wallpapers: this.parseWallpapers(wallpapers),
      total: countResult[0].total,
    };
  }

  // Check if slug exists
  static async slugExists(slug: string, excludeId?: number): Promise<boolean> {
    let query = 'SELECT COUNT(*) as count FROM wallpapers WHERE slug = ?';
    const params: any[] = [slug];

    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }

    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    return rows[0].count > 0;
  }

  // Helper: Parse wallpaper with JSON fields
  private static parseWallpaper(row: any): Wallpaper {
    let tags = [];
    if (row?.tags && row.tags.length > 0 && typeof row.tags === "string") {
      try {
        tags = JSON.parse(row.tags);
      } catch (error) {
        console.error('Failed to parse tags:', row.tags, error);
        tags = [];
      }
    }
    return {
      ...row,
      tags,
    };
  }

  // Helper: Parse multiple wallpapers
  private static parseWallpapers(rows: any[]): Wallpaper[] {
    return rows.map((row) => this.parseWallpaper(row));
  }

  // Get stats
  static async getStats(): Promise<{
    total: number;
    featured: number;
    totalDownloads: number;
    totalViews: number;
  }> {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN is_featured = 1 THEN 1 ELSE 0 END) as featured,
        SUM(download_count) as totalDownloads,
        SUM(view_count) as totalViews
      FROM wallpapers
      WHERE is_active = 1
    `);
    return rows[0] as any;
  }
}
