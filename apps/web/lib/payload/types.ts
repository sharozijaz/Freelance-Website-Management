export interface PayloadMedia {
  alt?: string;
  caption?: string;
  height?: number;
  id: string;
  mimeType?: string;
  sizes?: Record<
    string,
    {
      height?: number;
      url?: string;
      width?: number;
    }
  >;
  url?: string;
  width?: number;
}

export interface SeoData {
  canonicalUrl?: string;
  metaDescription?: string;
  metaTitle?: string;
  openGraph?: {
    description?: string;
    title?: string;
    type?: "article" | "website";
  };
  robots?: {
    follow?: boolean;
    index?: boolean;
  };
  schema?: Record<string, unknown>;
  socialImage?: PayloadMedia | string;
  twitterCard?: "summary" | "summary_large_image";
}

export interface Author {
  avatar?: PayloadMedia | string;
  bio?: unknown;
  email?: string;
  id: string;
  name: string;
  slug: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export interface PayloadPage {
  _status?: "draft" | "published";
  author?: Author | string;
  featuredImage?: PayloadMedia | string;
  id: string;
  layout?: unknown[];
  organizationId: string;
  previewUrl?: string;
  publishDate?: string;
  scheduledPublishAt?: string;
  seo?: SeoData;
  slug: string;
  title: string;
  websiteId?: string;
  workflowStatus?: "archived" | "draft" | "published" | "review";
}

export interface PayloadPost {
  _status?: "draft" | "published";
  author?: Author | string;
  categories?: (Category | string)[];
  content?: unknown;
  excerpt?: string;
  featuredImage?: PayloadMedia | string;
  id: string;
  organizationId: string;
  publishDate?: string;
  readingTime?: number;
  relatedPosts?: (PayloadPost | string)[];
  seo?: SeoData;
  slug: string;
  tags?: (Tag | string)[];
  title: string;
}

export interface NavigationItem {
  children?: NavigationItem[];
  label: string;
  openInNewTab?: boolean;
  page?: PayloadPage | string;
  url?: string;
}

export interface Navigation {
  id: string;
  items?: NavigationItem[];
  location: "custom" | "footer" | "header";
  organizationId: string;
  slug: string;
  title: string;
}

export interface SiteSettings {
  analytics?: {
    googleAnalyticsId?: string;
    googleTagManagerId?: string;
    metaPixelId?: string;
  };
  brand?: {
    favicon?: PayloadMedia | string;
    logo?: PayloadMedia | string;
    tagline?: string;
  };
  contactInformation?: {
    address?: string;
    email?: string;
    phone?: string;
  };
  id: string;
  organizationId: string;
  seo?: {
    canonicalBaseUrl?: string;
    defaultMetaDescription?: string;
    defaultOgImage?: PayloadMedia | string;
    defaultRobots?: {
      follow?: boolean;
      index?: boolean;
    };
    locale?: string;
    siteName?: string;
    siteTitle?: string;
    titleTemplate?: string;
  };
  siteName: string;
  socialLinks?: {
    platform: string;
    url: string;
  }[];
  theme?: {
    borderRadius?: string;
    containerWidth?: string;
    fontFamily?: string;
    mode?: "dark" | "light" | "system";
    primaryColor?: string;
    secondaryColor?: string;
  };
}

export interface PayloadListResponse<T> {
  docs: T[];
  hasNextPage: boolean;
  hasPrevPage: boolean;
  limit: number;
  nextPage?: number | null;
  page?: number;
  pagingCounter: number;
  prevPage?: number | null;
  totalDocs: number;
  totalPages: number;
}
