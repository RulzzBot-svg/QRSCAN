import { extractAhuId, frequencyLabel } from "../src/client/format.js";

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

assert(frequencyLabel(730) === "2 years", "2 years");
assert(frequencyLabel(1095) === "3 years", "3 years");
assert(frequencyLabel(90) === "90 days", "90 days");
assert(extractAhuId("https://qrscan-lyart.vercel.app/FilterInfo/128") === "128", "FilterInfo URL");
assert(extractAhuId("42") === "42", "plain id");

console.log("client format tests passed");
