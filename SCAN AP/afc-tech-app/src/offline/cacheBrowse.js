/** Turn a downloaded hospital bundle into buildings / AHU lists with no network. */

export function buildingsFromAhus(ahus = []) {
  const map = new Map();
  for (const a of ahus) {
    const rawId = a?.building_id;
    const id =
      rawId == null || rawId === "" ? 0 : Number.isFinite(Number(rawId)) ? Number(rawId) : 0;
    const named = String(a?.building || a?.building_name || "").trim();
    const name = named || (id ? `Building ${id}` : "All units");
    const row = map.get(id) || { id, name, ahu_count: 0, active: true };
    row.ahu_count += 1;
    if (named) row.name = named;
    map.set(id, row);
  }
  return [...map.values()].sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

export function ahusForHospital(ahus = [], hospitalId, buildingId) {
  const hid = String(hospitalId);
  let list = (ahus || []).filter((a) => String(a.hospital_id) === hid);
  if (buildingId != null && String(buildingId) !== "" && String(buildingId) !== "0") {
    list = list.filter((a) => String(a.building_id) === String(buildingId));
  }
  return list.map((a) => ({
    ...a,
    id: a.id ?? a.ahu_id,
    ahu_id: a.ahu_id ?? a.id,
    filters_count: a.filters_count ?? (Array.isArray(a.filters) ? a.filters.length : 0),
  }));
}

export function buildingHref(hospitalId, buildingId) {
  if (buildingId == null || String(buildingId) === "" || String(buildingId) === "0") {
    return `/AHU/${hospitalId}`;
  }
  return `/AHU/${hospitalId}/building/${buildingId}`;
}
