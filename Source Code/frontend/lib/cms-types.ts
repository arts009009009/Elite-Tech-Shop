export type CMSProduct = {
  id: string;
  title: string;
  slug: string;
  description: string;
  richDescription?: Record<string, unknown>;
  price: number;
  currency: string;
  category: string;
  images: CMSSiteImage[];
  specs?: CMSProductSpec[];
  features?: string[];
  tags?: string[];
  seoTitle?: string;
  seoDescription?: string;
  publishedAt: string;
  updatedAt: string;
};

export type CMSSiteImage = {
  url: string;
  alt: string;
  width: number;
  height: number;
};

export type CMSProductSpec = {
  label: string;
  value: string;
};

export type CMSCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: CMSSiteImage;
  productCount?: number;
};

export type CMSPage = {
  id: string;
  title: string;
  slug: string;
  content: Record<string, unknown>;
  seoTitle?: string;
  seoDescription?: string;
  publishedAt: string;
};

export type CMSBlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: Record<string, unknown>;
  author: string;
  publishedAt: string;
  featuredImage?: CMSSiteImage;
  tags?: string[];
};

export type CMSResponse<T> = {
  items: T[];
  total: number;
  limit: number;
  skip: number;
};
