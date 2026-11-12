import { readFileSync } from "node:fs";

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

const sidebar = readFileSync(new URL("../src/components/admin/AdminSidebar.jsx", import.meta.url), "utf8");
assert(sidebar.includes('label: "Surveys"'), "admin nav labels the AHUs tab Surveys");
assert(sidebar.includes('short: "Surveys"'), "bottom nav short label is Surveys");
assert(!sidebar.includes('label: "AHUs"'), "admin nav no longer says AHUs");

const ahus = readFileSync(new URL("../src/components/admin/adminahus.jsx", import.meta.url), "utf8");
assert(ahus.includes(">Surveys<"), "Surveys page title");
assert(ahus.includes('searchParams.get("ahu")'), "Surveys tab reads ahu from the URL");
assert(ahus.includes("admin-ahu-"), "focused AHU from a job gets an anchor");
assert(!ahus.includes("= past due"), "color legend copy is gone");
assert(!ahus.includes("= within 14 days"), "due-soon legend is gone");
assert(!ahus.includes("= 18 Months"), "540-day legend is gone");

const packing = readFileSync(new URL("../src/components/admin/PackingSlipPanel.jsx", import.meta.url), "utf8");
assert(packing.includes("<details"), "packing slip is a collapsed dropdown");
assert(packing.includes("<summary"), "packing slip has a summary toggle");
assert(packing.includes("QuickBooks packing slip"), "packing slip title is still there");

const jobs = readFileSync(new URL("../src/components/admin/adminjobs.jsx", import.meta.url), "utf8");
assert(jobs.includes("/admin/ahus?"), "job modal links to the Surveys AHU tab");
assert(jobs.includes('qs.set("ahu"'), "job modal passes the AHU id");
assert(jobs.includes("openAhuInSurveys"), "job number or AC name opens that AHU");

console.log("admin surveys tests passed");
