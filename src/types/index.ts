// User Types
export enum UserType {
  ADMIN = 1,
  REGISTERED = 2,
  GUEST = 3,
}

export interface User {
  id: number;
  email?: string;
  password?: string;
  name: string;
  user_type: UserType;
  is_owner: 0 | 1;
  guest_identifier?: string;
  ip_address?: string;
  last_login?: Date;
  is_active: 0 | 1;
  created_at: Date;
  updated_at: Date;
}

export interface UserRegistration {
  email: string;
  password: string;
  name: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface JWTPayload {
  userId: number;
  email?: string;
  userType: UserType;
  isOwner: boolean;
}

// Category Types
export enum CategorySource {
  ADMIN = 'admin',
  UNSPLASH = 'unsplash',
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  thumbnail_url?: string;
  order_position: number;
  is_predefined: 0 | 1;
  source: CategorySource;
  is_active: 0 | 1;
  wallpaper_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateCategoryDTO {
  name: string;
  slug?: string;
  description?: string;
  thumbnail_url?: string;
  order_position?: number;
  is_predefined?: 0 | 1;
  source?: CategorySource;
}

// Wallpaper Types
export enum WallpaperSource {
  ADMIN = 'admin',
  UNSPLASH = 'unsplash',
}

export interface Wallpaper {
  id: number;
  title: string;
  slug: string;
  description?: string;
  original_url: string;
  thumbnail_url: string;
  medium_url?: string;
  primary_color?: string;
  tags?: string[];
  source: WallpaperSource;
  source_id?: string;
  uploaded_by: number;
  storage_provider_id: number;
  is_featured: 0 | 1;
  is_active: 0 | 1;
  view_count: number;
  download_count: number;
  favorite_count: number;
  created_at: Date;
  updated_at: Date;
  categories?: Category[];
  resolutions?: WallpaperResolution[];
}

export interface CreateWallpaperDTO {
  title: string;
  description?: string;
  tags?: string[];
  category_ids: number[];
  is_featured?: boolean;
}

export interface WallpaperResolution {
  id: number;
  wallpaper_id: number;
  width: number;
  height: number;
  resolution_name: string;
  file_size?: number;
  url: string;
  is_original: 0 | 1;
  created_at: Date;
}

export interface ResolutionConfig {
  name: string;
  width: number;
  height: number;
}

// Storage Provider Types
export enum StorageProvider {
  CLOUDINARY = 'cloudinary',
  S3 = 's3',
  LOCAL = 'local',
}

export interface StorageProviderConfig {
  id: number;
  provider_name: StorageProvider;
  is_active: 0 | 1;
  priority: number;
  config: CloudinaryConfig | S3Config;
  created_at: Date;
  updated_at: Date;
}

export interface CloudinaryConfig {
  cloud_name: string;
  api_key: string;
  api_secret: string;
}

export interface S3Config {
  bucket_name: string;
  region: string;
  access_key_id: string;
  secret_access_key: string;
}

// Download Types
export enum DeviceType {
  MOBILE = 'mobile',
  TABLET = 'tablet',
  DESKTOP = 'desktop',
  UNKNOWN = 'unknown',
}

export interface Download {
  id: number;
  wallpaper_id: number;
  user_id?: number;
  resolution_id: number;
  ip_address?: string;
  user_agent?: string;
  device_type: DeviceType;
  downloaded_at: Date;
}

export interface DownloadTrackingDTO {
  wallpaper_id: number;
  resolution_id: number;
  user_agent?: string;
}

// Favorites Types
export interface Favorite {
  id: number;
  user_id: number;
  wallpaper_id: number;
  created_at: Date;
}

// Analytics Types
export interface DailyAnalytics {
  id: number;
  date: Date;
  total_visitors: number;
  unique_visitors: number;
  total_downloads: number;
  total_views: number;
  new_users: number;
  created_at: Date;
  updated_at: Date;
}

export interface AnalyticsOverview {
  totalVisitors: number;
  totalDownloads: number;
  totalWallpapers: number;
  totalCategories: number;
  totalUsers: number;
  adminUsers: number;
  registeredUsers: number;
  guestUsers: number;
  // todayVisitors: number;
  // todayDownloads: number;
}

export interface TopWallpaper {
  id: number;
  title: string;
  slug: string;
  thumbnail_url: string;
  download_count: number;
  view_count: number;
  favorite_count: number;
}

export interface CategoryStats {
  category_id: number;
  category_name: string;
  category_slug: string;
  wallpaper_count: number;
  total_downloads: number;
  total_views: number;
}

export interface DownloadTrend {
  date: string;
  downloads: number;
  views: number;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Request Extended Types
export interface AuthRequest extends Request {
  user?: JWTPayload;
}
