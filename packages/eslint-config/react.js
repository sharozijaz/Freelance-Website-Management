import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import base from "./base.js";

export default [
  ...base,
  {
    plugins: {
      react,
      "react-hooks": reactHooks,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat["jsx-runtime"].rules,
      ...reactHooks.configs.recommended.rules,
    },
  },
];
