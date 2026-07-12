import type { ReactNode } from "react";
import { getNavigation, getSiteSettings } from "@/lib/payload/queries";
import type { TenantContext } from "@/lib/tenant";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

export async function SiteShell({
  children,
  tenant,
}: {
  children: ReactNode;
  tenant: TenantContext;
}) {
  const [settings, headerNavigation, footerNavigation] = await Promise.all([
    getSiteSettings({ organizationId: tenant.organizationId }),
    getNavigation({ location: "header", organizationId: tenant.organizationId }),
    getNavigation({ location: "footer", organizationId: tenant.organizationId }),
  ]);

  return (
    <>
      <SiteHeader navigation={headerNavigation} settings={settings} />
      {children}
      <SiteFooter navigation={footerNavigation} settings={settings} />
    </>
  );
}
