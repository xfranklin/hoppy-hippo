import i18nPlugin from "eleventy-plugin-i18n";
import { createRequire } from "node:module";

// Use createRequire to load JSON in environments that don't support ESM JSON import assertions

const require = createRequire(import.meta.url);
const ro = require("./src/i18n/ro.json");
const ru = require("./src/i18n/ru.json");
const en = require("./src/i18n/en.json");

function loadTranslationsFromImports(locales) {
  const result = {};
  for (const [locale, json] of Object.entries(locales)) {
    for (const [key, value] of Object.entries(json)) {
      if (!result[key]) result[key] = {};
      result[key][locale] = value;
    }
  }
  return result;
}

/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
export default function (eleventyConfig) {
  const translations = loadTranslationsFromImports({ ro, ru, en });

  eleventyConfig.addPassthroughCopy("src/assets");

  eleventyConfig.addPlugin(i18nPlugin, {
    translations,
    fallbackLocales: {
      "*": "ro"
    }
  });

  return {
    dir: {
      input: "src",
      output: "dist",
      includes: "_includes",
      layouts: "_layouts",
      data: "_data"
    },
    templateFormats: ["njk"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dataTemplateEngine: "njk"
  };
}
