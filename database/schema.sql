-- WallsPie Database Schema
-- MySQL Database for Wallpaper Download Website

CREATE DATABASE IF NOT EXISTS wallspie_vp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  USE wallspie_vp;

-- Drop tables if exists (for clean setup)
DROP TABLE IF EXISTS analytics_daily;
DROP TABLE IF EXISTS downloads;
DROP TABLE IF EXISTS favorites;
DROP TABLE IF EXISTS wallpaper_resolutions;
DROP TABLE IF EXISTS wallpaper_categories;
DROP TABLE IF EXISTS wallpapers;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS storage_providers;
DROP TABLE IF EXISTS users;

-- =====================================================
-- 1. USERS TABLE
-- =====================================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    password VARCHAR(255),
    name VARCHAR(255),
    user_type TINYINT NOT NULL DEFAULT 2 COMMENT '1=admin/owner, 2=registered, 3=guest',
    is_owner TINYINT NOT NULL DEFAULT 0 COMMENT '1=owner, 0=not owner',
    guest_identifier VARCHAR(255) UNIQUE COMMENT 'Device fingerprint for guests',
    ip_address VARCHAR(45),
    last_login TIMESTAMP NULL,
    is_active TINYINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_type (user_type),
    INDEX idx_guest_identifier (guest_identifier),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 2. STORAGE PROVIDERS TABLE
-- =====================================================
CREATE TABLE storage_providers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    provider_name ENUM('cloudinary', 's3', 'local') NOT NULL,
    is_active TINYINT NOT NULL DEFAULT 0,
    priority INT NOT NULL DEFAULT 0 COMMENT 'Higher priority = used first',
    config JSON COMMENT 'Provider-specific configuration',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_active_priority (is_active, priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 3. CATEGORIES TABLE
-- =====================================================
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    thumbnail_url VARCHAR(500),
    order_position INT NOT NULL DEFAULT 0 COMMENT 'For custom sorting',
    is_predefined TINYINT NOT NULL DEFAULT 0 COMMENT '1=predefined, 0=admin created',
    source ENUM('admin') NOT NULL DEFAULT 'admin',
    is_active TINYINT NOT NULL DEFAULT 1,
    wallpaper_count INT NOT NULL DEFAULT 0 COMMENT 'Cached count for performance',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_slug (slug),
    INDEX idx_active_order (is_active, order_position),
    INDEX idx_source (source)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 4. WALLPAPERS TABLE
-- =====================================================
CREATE TABLE wallpapers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) UNIQUE NOT NULL,
    description TEXT,
    original_url VARCHAR(1000) NOT NULL COMMENT 'Highest quality image URL',
    thumbnail_url VARCHAR(1000) NOT NULL COMMENT 'Small preview image',
    medium_url VARCHAR(1000) COMMENT 'Medium size for listings',
    primary_color VARCHAR(7) COMMENT 'Hex color for placeholders',
    tags JSON COMMENT 'Array of tags for search',
    source ENUM('admin') NOT NULL DEFAULT 'admin',
    source_id VARCHAR(255) COMMENT 'External ID if from Unsplash',
    uploaded_by INT NOT NULL,
    storage_provider_id INT NOT NULL,
    is_featured TINYINT NOT NULL DEFAULT 0,
    is_active TINYINT NOT NULL DEFAULT 1,
    view_count INT NOT NULL DEFAULT 0,
    download_count INT NOT NULL DEFAULT 0,
    favorite_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (storage_provider_id) REFERENCES storage_providers(id),
    INDEX idx_slug (slug),
    INDEX idx_featured (is_featured, is_active),
    INDEX idx_source (source),
    INDEX idx_created (created_at DESC),
    INDEX idx_downloads (download_count DESC),
    FULLTEXT idx_search (title, description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 5. WALLPAPER_CATEGORIES (Many-to-Many)
-- =====================================================
CREATE TABLE wallpaper_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    wallpaper_id INT NOT NULL,
    category_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (wallpaper_id) REFERENCES wallpapers(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    UNIQUE KEY unique_wallpaper_category (wallpaper_id, category_id),
    INDEX idx_wallpaper (wallpaper_id),
    INDEX idx_category (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 6. WALLPAPER_RESOLUTIONS TABLE
-- =====================================================
CREATE TABLE wallpaper_resolutions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    wallpaper_id INT NOT NULL,
    width INT NOT NULL,
    height INT NOT NULL,
    resolution_name VARCHAR(50) NOT NULL COMMENT 'e.g., "1080p", "4K", "Mobile"',
    file_size BIGINT COMMENT 'Size in bytes',
    url VARCHAR(1000) NOT NULL,
    is_original TINYINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (wallpaper_id) REFERENCES wallpapers(id) ON DELETE CASCADE,
    INDEX idx_wallpaper (wallpaper_id),
    INDEX idx_resolution (width, height)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 7. DOWNLOADS TABLE (Analytics)
-- =====================================================
CREATE TABLE downloads (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    wallpaper_id INT NOT NULL,
    user_id INT,
    resolution_id INT NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_type ENUM('mobile', 'tablet', 'desktop', 'unknown') DEFAULT 'unknown',
    downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (wallpaper_id) REFERENCES wallpapers(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (resolution_id) REFERENCES wallpaper_resolutions(id) ON DELETE CASCADE,
    INDEX idx_wallpaper (wallpaper_id),
    INDEX idx_user (user_id),
    INDEX idx_downloaded (downloaded_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 8. FAVORITES TABLE
-- =====================================================
CREATE TABLE favorites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    wallpaper_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (wallpaper_id) REFERENCES wallpapers(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_wallpaper (user_id, wallpaper_id),
    INDEX idx_user (user_id),
    INDEX idx_wallpaper (wallpaper_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 9. ANALYTICS_DAILY TABLE (Aggregated Stats)
-- =====================================================
CREATE TABLE analytics_daily (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    total_visitors INT NOT NULL DEFAULT 0,
    unique_visitors INT NOT NULL DEFAULT 0,
    total_downloads INT NOT NULL DEFAULT 0,
    total_views INT NOT NULL DEFAULT 0,
    new_users INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_date (date DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- SEED DATA: Initial Storage Providers
-- =====================================================
INSERT INTO storage_providers (provider_name, is_active, priority, config) VALUES
('cloudinary', 1, 1, JSON_OBJECT(
    'cloud_name', '',
    'api_key', '',
    'api_secret', ''
)),
('s3', 0, 2, JSON_OBJECT(
    'bucket_name', '',
    'region', 'us-east-1',
    'access_key_id', '',
    'secret_access_key', ''
));

-- =====================================================
-- SEED DATA: Predefined Categories
-- =====================================================
INSERT INTO categories (name, slug, description, order_position, is_predefined, source) VALUES
('Nature & Landscapes', 'nature-landscapes', 'Beautiful natural scenery and landscapes', 1, 1, 'admin'),
('Abstract & Patterns', 'abstract-patterns', 'Abstract art and geometric patterns', 2, 1, 'admin'),
('Animals & Wildlife', 'animals-wildlife', 'Wildlife and animal photography', 3, 1, 'admin'),
('Space & Astronomy', 'space-astronomy', 'Cosmic wonders and space imagery', 4, 1, 'admin'),
('Technology & Digital', 'technology-digital', 'Tech, digital art, and futuristic themes', 5, 1, 'admin'),
('Cars & Vehicles', 'cars-vehicles', 'Automotive and vehicle photography', 6, 1, 'admin'),
('Architecture & Buildings', 'architecture-buildings', 'Modern and classic architecture', 7, 1, 'admin'),
('Art & Illustrations', 'art-illustrations', 'Digital and traditional artwork', 8, 1, 'admin'),
('Sports & Fitness', 'sports-fitness', 'Athletic and sports imagery', 9, 1, 'admin'),
('Minimalist', 'minimalist', 'Clean and minimal designs', 10, 1, 'admin'),
('Dark & Moody', 'dark-moody', 'Dark aesthetic and moody photography', 11, 1, 'admin'),
('Gaming', 'gaming', 'Video game screenshots and artwork', 12, 1, 'admin'),
('Movies & TV Shows', 'movies-tv', 'Film and television imagery', 13, 1, 'admin'),
('Anime & Manga', 'anime-manga', 'Japanese animation and manga art', 14, 1, 'admin'),
('Music & Bands', 'music-bands', 'Music artists and band photography', 15, 1, 'admin'),
('Food & Drinks', 'food-drinks', 'Culinary and beverage photography', 16, 1, 'admin'),
('Travel & Places', 'travel-places', 'Travel destinations and landmarks', 17, 1, 'admin'),
('Textures & Materials', 'textures-materials', 'Surface textures and materials', 18, 1, 'admin'),
('Seasonal & Holidays', 'seasonal-holidays', 'Holiday and seasonal themes', 19, 1, 'admin'),
('Motivational & Quotes', 'motivational-quotes', 'Inspirational quotes and messages', 20, 1, 'admin');

-- =====================================================
-- SEED DATA: Create Initial Owner Account
-- Password: Admin@123 (bcrypt hashed - you need to update this)
-- =====================================================
INSERT INTO users (email, password, name, user_type, is_owner, is_active) VALUES
('admin@wallspie.com', '\$2b\$10\$BSvpLF2Yosr4ag4mvTZXheQi.wDJtCeffvlePe4ttMgEK1lZt8ije', 'Admin', 1, 1, 1);

-- Note: You must hash the password using bcrypt before inserting
-- Example in Node.js: const hash = await bcrypt.hash('Admin@123', 10);
