export function groupAhusByBuilding(ahus) {
  const groups = [];
  const index = new Map();
  for (const ahu of ahus || []) {
    const name = ahu.building || "Unassigned";
    if (!index.has(name)) {
      index.set(name, groups.length);
      groups.push({ building: name, units: [] });
    }
    groups[index.get(name)].units.push(ahu);
  }
  return groups;
}
