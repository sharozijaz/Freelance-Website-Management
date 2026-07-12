import NextLink from "next/link";
import { Container, Flex, Text } from "@agency/ui";
import type { Navigation, NavigationItem, SiteSettings } from "@/lib/payload/types";

function resolveHref(item: NavigationItem): string {
  if (item.url) {
    return item.url;
  }

  if (item.page && typeof item.page === "object") {
    return item.page.slug === "home" ? "/" : `/${item.page.slug}`;
  }

  return "#";
}

export function SiteHeader({
  navigation,
  settings,
}: {
  navigation: Navigation | null;
  settings: SiteSettings | null;
}) {
  return (
    <header className="border-b bg-background">
      <Container className="py-4">
        <Flex align="center" justify="between">
          <NextLink href="/">
            <Text className="font-semibold">{settings?.siteName ?? "Client Website"}</Text>
          </NextLink>
          <nav aria-label="Main navigation">
            <Flex align="center" className="gap-4">
              {(navigation?.items ?? []).map((item) => (
                <NextLink
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  href={resolveHref(item)}
                  key={`${item.label}-${resolveHref(item)}`}
                  target={item.openInNewTab ? "_blank" : undefined}
                >
                  {item.label}
                </NextLink>
              ))}
            </Flex>
          </nav>
        </Flex>
      </Container>
    </header>
  );
}
