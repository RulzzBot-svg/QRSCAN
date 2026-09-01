import {
  filterObjectsForSelection,
  selectionMeta,
} from "../src/utils/filterSelection.js";

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

const filters = [
  { id: 1, part_number: "A", size: "12x12x1", quantity: 2, phase: "Pre", is_active: true },
  { id: 2, part_number: "B", size: "24x24x2", quantity: 1, phase: "Final", is_active: true },
  { id: 3, part_number: "C", size: "12x24x1", quantity: 1, phase: "Old", _inactive: true },
  { id: "new-1", part_number: "D", size: "20x20x1", quantity: 1, phase: "New" },
];

const none = selectionMeta(filters, []);
assert(!none.allSelected && !none.someSelected && none.visibleCount === 2, "none selected");

const some = selectionMeta(filters, [1]);
assert(some.someSelected && !some.allSelected && some.selectedCount === 1, "partial selection");

const all = selectionMeta(filters, [1, 2, 3, "new-1"]);
assert(all.allSelected && all.selectedCount === 2, "inactive and unsaved filters are ignored");

const objs = filterObjectsForSelection(filters, new Set([2]));
assert(objs.length === 1 && objs[0].part_number === "B", "selected objects include part number");
assert(Object.prototype.hasOwnProperty.call(objs[0], "unit_price"), "selected objects include unit_price for QB");

console.log("filterSelection tests passed");
