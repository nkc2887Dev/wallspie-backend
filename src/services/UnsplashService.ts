import axios from 'axios';

interface UnsplashPhoto {
  id: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  width: number;
  height: number;
  description: string | null;
  alt_description: string | null;
  color: string;
  user: {
    name: string;
    username: string;
  };
}

interface UnsplashSearchResponse {
  total: number;
  total_pages: number;
  results: UnsplashPhoto[];
}

export class UnsplashService {
  private accessKey: string;
  private baseUrl: string = 'https://api.unsplash.com';

  constructor() {
    this.accessKey = process.env.UNSPLASH_ACCESS_KEY || '';
  }

  // Search photos by query
  async searchPhotos(
    query: string,
    page: number = 1,
    perPage: number = 20
  ): Promise<UnsplashSearchResponse> {
    try {
      const response = await axios.get(`${this.baseUrl}/search/photos`, {
        params: {
          query,
          page,
          per_page: perPage,
          client_id: this.accessKey,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Unsplash search error:', error);
      throw new Error('Failed to search Unsplash photos');
    }
  }

  // Get random photos
  async getRandomPhotos(
    count: number = 10,
    query?: string
  ): Promise<UnsplashPhoto[]> {
    try {
      const params: any = {
        count,
        client_id: this.accessKey,
      };

      if (query) {
        params.query = query;
      }

      const response = await axios.get(`${this.baseUrl}/photos/random`, {
        params,
      });

      return Array.isArray(response.data) ? response.data : [response.data];
    } catch (error) {
      console.error('Unsplash random photos error:', error);
      throw new Error('Failed to get random Unsplash photos');
    }
  }

  // Get photo by ID
  async getPhotoById(id: string): Promise<UnsplashPhoto> {
    try {
      const response = await axios.get(`${this.baseUrl}/photos/${id}`, {
        params: {
          client_id: this.accessKey,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Unsplash get photo error:', error);
      throw new Error('Failed to get Unsplash photo');
    }
  }

  // Download photo (required by Unsplash API guidelines)
  async trackDownload(downloadUrl: string): Promise<void> {
    try {
      await axios.get(downloadUrl, {
        params: {
          client_id: this.accessKey,
        },
      });
    } catch (error) {
      console.error('Unsplash track download error:', error);
    }
  }

  // Get photos by category/collection
  async getPhotosByCollection(
    collectionId: string,
    page: number = 1,
    perPage: number = 20
  ): Promise<UnsplashPhoto[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/collections/${collectionId}/photos`,
        {
          params: {
            page,
            per_page: perPage,
            client_id: this.accessKey,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Unsplash collection photos error:', error);
      throw new Error('Failed to get collection photos');
    }
  }

  // Transform Unsplash photo to our wallpaper format
  transformToWallpaper(photo: UnsplashPhoto): {
    title: string;
    description: string;
    original_url: string;
    thumbnail_url: string;
    medium_url: string;
    primary_color: string;
    source_id: string;
    tags: string[];
  } {
    return {
      title: photo.description || photo.alt_description || `Photo by ${photo.user.name}`,
      description: photo.description || photo.alt_description || '',
      original_url: photo.urls.full,
      thumbnail_url: photo.urls.thumb,
      medium_url: photo.urls.regular,
      primary_color: photo.color,
      source_id: photo.id,
      tags: [],
    };
  }

  // Popular categories mapping to Unsplash queries
  static readonly CATEGORY_QUERIES: Record<string, string> = {
    'nature-landscapes': 'nature landscape',
    'abstract-patterns': 'abstract pattern',
    'animals-wildlife': 'animals wildlife',
    'space-astronomy': 'space astronomy',
    'technology-digital': 'technology digital',
    'cars-vehicles': 'cars vehicles',
    'architecture-buildings': 'architecture buildings',
    'art-illustrations': 'art illustration',
    'sports-fitness': 'sports fitness',
    minimalist: 'minimalist',
    'dark-moody': 'dark moody',
    gaming: 'gaming',
    'movies-tv': 'movies cinema',
    'anime-manga': 'anime',
    'music-bands': 'music concert',
    'food-drinks': 'food drinks',
    'travel-places': 'travel places',
    'textures-materials': 'texture material',
    'seasonal-holidays': 'seasonal holiday',
    'motivational-quotes': 'motivational quote',
  };

  // Get query for category
  static getCategoryQuery(categorySlug: string): string {
    return this.CATEGORY_QUERIES[categorySlug] || categorySlug.replace(/-/g, ' ');
  }
}
