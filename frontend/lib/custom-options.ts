const STORAGE_KEY = "hrms_custom_field_options_v1";

/** Extra options a user has typed in via a field's inline "+ Add" — kept in
 * this browser's localStorage since these are free-text classification
 * values (Employee Type, Relationship, Source of Hire, …) with no backend
 * master table of their own. */
function readAll(): Record<string, string[]> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function loadCustomOptions(field: string): string[] {
  return readAll()[field] || [];
}

export function addCustomOption(field: string, value: string) {
  if (!value.trim()) return;
  const all = readAll();
  const existing = all[field] || [];
  if (!existing.includes(value)) {
    all[field] = [...existing, value];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }
}
