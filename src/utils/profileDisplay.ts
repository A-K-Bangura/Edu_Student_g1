/**
 * Up to two capital letters for an avatar placeholder: first + last word of
 * the name ("Amara Kamara" → "AK", "Amara" → "A"), else the email's first
 * letter. Takes whole characters, so a name that starts with an emoji or an
 * accented letter isn't split mid-character.
 */
export const getInitials = (
  name: string | null | undefined,
  email?: string | null
): string => {
  const first = (word: string) => Array.from(word)[0]?.toUpperCase() ?? "";
  const words = (name ?? "").split(/\s+/).filter(Boolean);

  if (words.length > 1) {
    return first(words[0]) + first(words[words.length - 1]);
  }
  if (words.length === 1) {
    return first(words[0]);
  }
  return first((email ?? "").trim()) || "?";
};

/**
 * The display name of a university / faculty / department / organization.
 * Older API shapes sent a bare string where the current one sends
 * `{ id, name }`; both are accepted. `null` when there's nothing to show.
 */
export const getInstitutionName = (
  value: { name?: string } | string | null | undefined
): string | null => {
  if (!value) return null;
  return (typeof value === "string" ? value : value.name)?.trim() || null;
};

/**
 * How a stored academic level reads on screen. The API stores the raw level
 * ("200"), which means second year; a value already written out ("Year 2",
 * "Postgraduate") is shown as it is. Returns `null` when there is none.
 */
export const formatAcademicLevel = (
  level: string | null | undefined
): string | null => {
  const raw = level?.trim();
  if (!raw) return null;

  if (/^\d+$/.test(raw)) {
    const numeric = parseInt(raw, 10);
    if (numeric >= 100 && numeric % 100 === 0) {
      return `Year ${numeric / 100}`;
    }
  }
  return raw;
};
