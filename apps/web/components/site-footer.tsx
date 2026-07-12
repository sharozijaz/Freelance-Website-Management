import NextLink from "next/link";
import { Container, Divider, Stack, Text } from "@agency/ui";
import type { Navigation, SiteSettings } from "@/lib/payload/types";

export function SiteFooter({
  navigation,
  settings,
}: {
  navigation: Navigation | null;
  settings: SiteSettings | null;
}) {
  return (
    <footer className="border-t bg-muted/30">
      <Container className="py-8">
        <Stack gap="md">
          <nav aria-label="Footer navigation" className="flex flex-wrap gap-4">
            {(navigation?.items ?? []).map((item) => (
              <NextLink
                className="text-sm text-muted-foreground hover:text-foreground"
                href={item.url ?? "#"}
                key={item.label}
                target={item.openInNewTab ? "_blank" : undefined}
              >
                {item.label}
              </NextLink>
            ))}
          </nav>
          <Divider />
          <Text className="text-muted-foreground" size="sm">
            {settings?.siteName ?? "Client Website"}
          </Text>
        </Stack>
      </Container>
    </footer>
  );
}
