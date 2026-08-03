// Client.phone is stored in E.164 (+9665XXXXXXXX) by the import scripts, and
// lookups match on it exactly — so anything a customer types at the portal
// login has to be folded into that same shape first. Saudi mobiles are the
// only numbers on file, which is what makes the local-format rules below safe
// to assume.
export function normalizeSaudiPhone(raw: string): string | null {
  let d = raw.replace(/[^\d]/g, "");
  if (!d) return null;

  if (d.startsWith("00966")) d = d.slice(5);
  else if (d.startsWith("966")) d = d.slice(3);
  else if (d.startsWith("0")) d = d.slice(1);

  // Saudi mobile subscriber numbers are always 5XXXXXXXX once the country code
  // and trunk prefix are stripped.
  if (!/^5\d{8}$/.test(d)) return null;

  return `+966${d}`;
}
