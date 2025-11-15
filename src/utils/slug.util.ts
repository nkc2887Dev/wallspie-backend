export class SlugUtil {
  // Generate slug from text
  static generate(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces, underscores with hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }

  // Generate unique slug by appending number
  static generateUnique(baseSlug: string, existingSlugs: string[]): string {
    let slug = baseSlug;
    let counter = 1;

    while (existingSlugs.includes(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  // Add timestamp to slug for uniqueness
  static generateWithTimestamp(text: string): string {
    const baseSlug = this.generate(text);
    const timestamp = Date.now().toString(36);
    return `${baseSlug}-${timestamp}`;
  }
}
