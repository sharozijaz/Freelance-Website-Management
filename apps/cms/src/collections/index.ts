import type { CollectionConfig } from "payload";
import { Authors } from "./authors";
import { Categories } from "./categories";
import { Media } from "./media";
import { Navigation } from "./navigation";
import { Pages } from "./pages";
import { Posts } from "./posts";
import { Redirects } from "./redirects";
import { SiteSettings } from "./site-settings";
import { Tags } from "./tags";

export const collections: CollectionConfig[] = [
  Pages,
  Posts,
  Categories,
  Tags,
  Authors,
  Media,
  Navigation,
  Redirects,
  SiteSettings,
];
