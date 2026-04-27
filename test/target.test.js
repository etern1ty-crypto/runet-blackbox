import test from "node:test";
import assert from "node:assert/strict";
import { isValidTarget, normalizeCountry, normalizeOptionalText, normalizeTarget, parseAsn } from "../src/target.js";

const normalizeCases = [
  ["GitHub.COM", "github.com"],
  [" https://GitHub.com/path?q=1 ", "github.com"],
  ["example.com.", "example.com"],
  ["*.Example.org", "example.org"],
  ["пример.рф", "xn--e1afmkfd.xn--p1ai"],
  ["sub.domain.example", "sub.domain.example"],
  ["8.8.8.8", "8.8.8.8"],
  ["http://[2001:4860:4860::8888]/dns-query", "2001:4860:4860::8888"]
];

for (const [input, expected] of normalizeCases) {
  test(`normalizeTarget: ${input}`, () => {
    assert.equal(normalizeTarget(input), expected);
  });
}

const validTargets = [
  "github.com",
  "sub.example.co.uk",
  "xn--e1afmkfd.xn--p1ai",
  "8.8.8.8",
  "2001:4860:4860::8888",
  "a-b.example"
];

for (const target of validTargets) {
  test(`isValidTarget accepts ${target}`, () => {
    assert.equal(isValidTarget(target), true);
  });
}

const invalidTargets = [
  "",
  "localhost",
  "-bad.example",
  "bad-.example",
  "bad_label.example",
  "example..com",
  ".",
  "http://"
];

for (const target of invalidTargets) {
  test(`isValidTarget rejects ${target || "<empty>"}`, () => {
    assert.equal(isValidTarget(target), false);
  });
}

const asnCases = [
  [12345, 12345],
  ["12345", 12345],
  ["AS12345", 12345],
  [null, null],
  ["", null]
];

for (const [input, expected] of asnCases) {
  test(`parseAsn accepts ${String(input)}`, () => {
    assert.equal(parseAsn(input), expected);
  });
}

const invalidAsns = [0, -1, 4.2, "ASnope", 4294967296];
for (const input of invalidAsns) {
  test(`parseAsn rejects ${String(input)}`, () => {
    assert.throws(() => parseAsn(input));
  });
}

test("normalizeCountry uppercases valid countries", () => {
  assert.equal(normalizeCountry("ru"), "RU");
});

test("normalizeCountry falls back to RU for invalid values", () => {
  assert.equal(normalizeCountry("Russia"), "RU");
});

test("normalizeOptionalText trims repeated whitespace", () => {
  assert.equal(normalizeOptionalText("  Moscow   Region "), "Moscow Region");
});

test("normalizeOptionalText uses fallback for blanks", () => {
  assert.equal(normalizeOptionalText("   ", "unknown"), "unknown");
});
