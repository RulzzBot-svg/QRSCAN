import { filterInfoScanDestination } from "../src/utils/filterInfoGate.js";

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

assert(
  filterInfoScanDestination("12", { hasTech: true, hasClient: false }).stay === true,
  "logged-in AFC tech stays on FilterInfo"
);
assert(
  filterInfoScanDestination("12", { hasTech: true, hasClient: true }).stay === true,
  "tech session wins over a leftover portal session"
);
assert(
  filterInfoScanDestination("12", { hasTech: false, hasClient: true }).path === "/client/ahu/12",
  "logged-in hospital user goes to the portal unit page"
);
assert(
  filterInfoScanDestination("12", { hasTech: false, hasClient: false }).path === "/",
  "logged-out scan goes to technician login, not the director portal"
);
assert(
  filterInfoScanDestination("1/SF-1B", { hasTech: false, hasClient: false }).path === "/",
  "logged-out still goes to login when the QR payload is a name"
);

console.log("filterInfoGate tests passed");
