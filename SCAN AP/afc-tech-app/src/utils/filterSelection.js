/** Helpers for AHU filter checkbox selection (packing slip / bulk actions). */

export function isSelectableFilter(filter) {
  if (!filter) return false;
  if (filter._inactive || filter.is_active === false) return false;
  if (String(filter.id).startsWith("new-")) return false;
  return true;
}

export function selectableFilters(filters) {
  return (filters || []).filter(isSelectableFilter);
}

export function filterObjectsForSelection(filters, selectedIds) {
  const selectedSet = selectedIds instanceof Set ? selectedIds : new Set(selectedIds || []);
  return selectableFilters(filters)
    .filter((f) => selectedSet.has(f.id))
    .map((f) => ({
      id: f.id,
      part_number: f.part_number,
      size: f.size,
      quantity: f.quantity,
      phase: f.phase,
    }));
}

export function selectionMeta(filters, selectedIds) {
  const selectable = selectableFilters(filters);
  const selected = filterObjectsForSelection(selectable, selectedIds);
  const selectedCount = selected.length;
  const visibleCount = selectable.length;
  return {
    selected,
    selectedCount,
    visibleCount,
    allSelected: visibleCount > 0 && selectedCount === visibleCount,
    someSelected: selectedCount > 0 && selectedCount < visibleCount,
  };
}
