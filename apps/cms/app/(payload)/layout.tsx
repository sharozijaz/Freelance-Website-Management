import type { ReactNode } from "react";
import type { ServerFunctionClientArgs } from "payload";
import config from "@payload-config";
import { handleServerFunctions, RootLayout } from "@payloadcms/next/layouts";
import "@payloadcms/next/css";
import { importMap } from "./admin/importMap";

export const metadata = {
  description: "Agency Website Platform content management system",
  title: "Agency CMS",
};

async function serverFunction(args: ServerFunctionClientArgs) {
  "use server";

  return handleServerFunctions({ ...args, config, importMap });
}

export default function PayloadLayout({ children }: { children: ReactNode }) {
  return (
    <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
      {children}
    </RootLayout>
  );
}
