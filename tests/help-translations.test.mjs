import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { transform } from "esbuild";
import { LANGUAGES, RTL_LANGUAGES, translations } from "../src/i18n/translations.js";

const source = await readFile(new URL("../src/components/HelpOverlay.jsx", import.meta.url), "utf8");
const prefixes = [...source.matchAll(/^\s+"(help\w+)",$/gm)].map((match) => match[1]);
const keys = [
  "howToUse", "closeHelp", "returnToMap", "helpEyebrow", "helpIntro",
  ...prefixes.flatMap((prefix) => [`${prefix}Title`, `${prefix}Body`]),
];

// Render the actual overlay with a language hook fixture, without requiring a browser.
const { code } = await transform(
  source.replace(
    'import { useLanguage } from "../i18n/LanguageContext.jsx";',
    "const useLanguage = () => ({ t: key => dictionary[key] });"
  ),
  { loader: "jsx", format: "cjs" }
);
const require = createRequire(import.meta.url);

test("the guide contains ten sections", () => {
  assert.equal(prefixes.length, 10);
});

for (const { code: lang } of LANGUAGES) {
  test(`the full guide renders in ${lang} without English fallbacks or missing keys`, () => {
    const dictionary = translations[lang].ui;
    for (const key of keys) {
      assert.equal(typeof dictionary[key], "string", `${lang}.${key}`);
      assert.ok(dictionary[key].trim(), `${lang}.${key} is empty`);
      if (lang !== "en" && key !== "closeHelp") {
        assert.notEqual(dictionary[key], translations.en.ui[key], `${lang}.${key} is untranslated`);
      }
    }

    const module = { exports: {} };
    new Function("require", "module", "exports", "dictionary", code)(
      require, module, module.exports, dictionary
    );
    const html = renderToStaticMarkup(
      React.createElement(module.exports.default, { onClose() {} })
    );
    const escape = (text) => text.replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#x27;",
    })[char]);
    assert.equal((html.match(/class="help-card"/g) || []).length, prefixes.length);
    for (const key of keys) assert.ok(html.includes(escape(dictionary[key])), `${lang}.${key} not rendered`);
    if (lang !== "en") {
      for (const prefix of prefixes) {
        assert.ok(!html.includes(escape(translations.en.ui[`${prefix}Body`])));
      }
    }
  });
}

test("Arabic inherits RTL and has direction-aware guide styles", async () => {
  assert.ok(RTL_LANGUAGES.includes("ar"));
  const context = await readFile(new URL("../src/i18n/LanguageContext.jsx", import.meta.url), "utf8");
  assert.match(context, /dir=\{dir\} lang=\{lang\}/);
  const css = await readFile(new URL("../src/styles/app.css", import.meta.url), "utf8");
  assert.match(css, /\.help-return\s*\{[^}]*margin-inline-start:\s*auto/);
  assert.match(css, /\[dir="rtl"\] \.help-eyebrow\s*\{[^}]*letter-spacing:\s*normal/);
  assert.match(css, /\[dir="rtl"\] \.help-card p\s*\{[^}]*line-height:\s*1\.8/);
});
