import { ctaDefinition } from "./cta";
import { contactDefinition } from "./contact";
import { faqDefinition } from "./faq";
import { featuresDefinition } from "./features";
import { footerDefinition } from "./footer";
import { heroDefinition } from "./hero";
import { logoCloudDefinition } from "./logo-cloud";
import { pricingDefinition } from "./pricing";
import { servicesDefinition } from "./services";
import { statisticsDefinition } from "./statistics";
import { testimonialsDefinition } from "./testimonials";
import type { BlockDefinition } from "../types";

export const starterBlockDefinitions = [
  heroDefinition,
  logoCloudDefinition,
  featuresDefinition,
  servicesDefinition,
  statisticsDefinition,
  testimonialsDefinition,
  pricingDefinition,
  faqDefinition,
  ctaDefinition,
  contactDefinition,
  footerDefinition,
] satisfies BlockDefinition[];

export {
  contactDefinition,
  ctaDefinition,
  faqDefinition,
  featuresDefinition,
  footerDefinition,
  heroDefinition,
  logoCloudDefinition,
  pricingDefinition,
  servicesDefinition,
  statisticsDefinition,
  testimonialsDefinition,
};
