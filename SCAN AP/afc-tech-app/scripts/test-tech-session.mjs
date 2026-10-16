import { resumeTechPath } from "../src/utils/techSession.js";

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

assert(resumeTechPath({}) === null, "logged-out stays on login");
assert(
  resumeTechPath({ online: true, hasSession: true }) === "/Home",
  "saved tech session skips login"
);
assert(
  resumeTechPath({ online: false, hasSession: false, hasTech: true }) === "/Home",
  "offline with a saved tech profile skips login"
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
  resumeTechPath({ online: true, hasSession: false, hasTech: true }) === null,
  "online without a token still needs a real login"
);
assert(
  resumeTechPath({
    online: true,
    hasSession: true,
    postLoginPath: "//evil.example",
  }) === "/Home",
  "reject protocol-relative resume paths"
);
assert(
  resumeTechPath({
    online: true,
    hasSession: true,
    postLoginPath: "https://evil.example",
  }) === "/Home",
  "reject absolute resume URLs"
);

console.log("tech session tests passed");
