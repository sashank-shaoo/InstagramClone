export interface PaginationParams {
  page: number;
  limit: number;
}

export const getPaginationParams = (
  page: string | number = 1,
  limit: string | number = 20
): PaginationParams => {
  const pageNum = typeof page === 'string' ? parseInt(page) : page;
  const limitNum = typeof limit === 'string' ? parseInt(limit) : limit;

  return {
    page: Math.max(1, pageNum),
    limit: Math.min(50, Math.max(1, limitNum)), // Max 50 items per page
  };
};

export const getSkip = (page: number, limit: number): number => {
  return (page - 1) * limit;
};

export const calculateTotalPages = (total: number, limit: number): number => {
  return Math.ceil(total / limit);
};

/**
 * Extract mentions from text (@username)
 */
export const extractMentions = (text: string): string[] => {
  const mentionRegex = /@([a-z0-9._]+)/gi;
  const matches = text.match(mentionRegex);
  
  if (!matches) return [];
  
  return [...new Set(matches.map(m => m.substring(1).toLowerCase()))];
};

/**
 * Extract hashtags from text (#hashtag)
 */
export const extractHashtags = (text: string): string[] => {
  const hashtagRegex = /#([a-z0-9_]+)/gi;
  const matches = text.match(hashtagRegex);
  
  if (!matches) return [];
  
  return [...new Set(matches.map(h => h.substring(1).toLowerCase()))];
};

/**
 * Generate slug from text
 */
export const generateSlug = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
};

/**
 * Format file size
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Validate MongoDB ObjectId
 */
export const isValidObjectId = (id: string): boolean => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Sleep/delay function
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};
