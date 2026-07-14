import base from "@agency/eslint-config/base";

export default [
  {
    ignores: ["app/(payload)/admin/importMap.js", "src/payload-types.ts"],
  },
  ...base,
];
