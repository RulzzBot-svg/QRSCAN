import {
  canUseFieldApp,
  namesMatch,
  resumeTechPath,
} from "../src/utils/techSession.js";
import {
  ahusForHospital,
  buildingHref,
  buildingsFromAhus,
} from "../src/offline/cacheBrowse.js";

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

assert(namesMatch("Tech", "tech"), "offline PIN name is case-insensitive");
assert(!namesMatch("Tech", "Admin"), "different names do not match");

assert(resumeTechPath({}) === null, "logged-out stays on login");
assert(
  resumeTechPath({ online: true, hasSession: true }) === "/Home",
  "saved JWT session skips login"
);
assert(
  resumeTechPath({ online: false, hasSession: false, hasTech: true }) === "/Home",
  "offline with a tech profile skips login"
);
assert(
  resumeTechPath({
    online: true,
    hasSession: true,
    postLoginPath: "/FilterInfo/12",
  }) === "/FilterInfo/12",
  "resume a pending FilterInfo scan"
);
assert(
  resumeTechPath({
    online: true,
    hasSession: true,
    postLoginPath: "/client/graphs",
  }) === "/Home",
  "do not resume into the hospital portal"
);
assert(
  canUseFieldApp({ online: true, hasToken: true, hasTech: true }) === true,
  "online with token works"
);
assert(
  canUseFieldApp({ online: true, hasToken: false, hasTech: true }) === false,
  "online without a token still needs a real login"
);
assert(
  canUseFieldApp({ online: false, hasToken: false, hasTech: true }) === true,
  "offline with a saved tech can scan and do jobs"
);
assert(
  canUseFieldApp({ online: false, hasToken: false, hasTech: false }) === false,
  "offline with no profile cannot work"
);

const ahus = [
  { id: 1, hospital_id: 9, building_id: 4, building: "South Tower", filters: [1, 2] },
  { id: 2, hospital_id: 9, building_id: 4, building: "South Tower", filters: [] },
  { id: 3, hospital_id: 9, building_id: 5, building: "East", filters: [1] },
  { id: 4, hospital_id: 8, building_id: 4, building: "Other hospital", filters: [] },
];
const buildings = buildingsFromAhus(ahus.filter((a) => a.hospital_id === 9));
assert(buildings.length === 2, "two buildings from cached AHUs");
assert(buildings[0].name === "East" || buildings[1].name === "East", "East building present");
assert(
  ahusForHospital(ahus, 9, 4).map((a) => a.id).join(",") === "1,2",
  "AHUs filtered to one building"
);
assert(buildingHref(9, 4) === "/AHU/9/building/4", "building link");
assert(buildingHref(9, 0) === "/AHU/9", "ungrouped units link");

console.log("tech session and offline browse tests passed");
