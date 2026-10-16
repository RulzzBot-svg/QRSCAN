import { readFileSync } from "node:fs";
import { PORTAL_APP_NAME, PORTAL_APP_SHORT, TECH_APP_NAME, TECH_APP_SHORT } from "../src/branding.js";

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

assert(TECH_APP_NAME === "AFC Field", "tech app name");
assert(TECH_APP_SHORT === "AFC Field", "tech home-screen name");
assert(TECH_APP_SHORT.length <= 12, "short enough for iOS home screen");
assert(PORTAL_APP_NAME === "AFC Hospital Portal", "portal full name");
assert(PORTAL_APP_SHORT === "AFC Portal", "portal home-screen name");

const manifest = JSON.parse(readFileSync(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"));
assert(manifest.name === TECH_APP_NAME, "tech manifest name");
assert(manifest.short_name === TECH_APP_SHORT, "tech manifest short_name");

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
assert(html.includes(`content="${TECH_APP_SHORT}"`), "apple title is AFC Field");
assert(html.includes("<title>AFC Field</title>"), "document title is AFC Field");
assert(!html.includes("AFC Technician"), "old tech name is gone from html");

console.log("branding tests passed");
