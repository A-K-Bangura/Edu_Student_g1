/**
 * A link target that is safe to put in an `href` when the address was typed in
 * by a user (a social link on a profile, for instance), or `null` if it isn't.
 *
 * Only http(s) is allowed. A `javascript:` or `data:` address would run
 * script when another student taps it. Students usually type a bare domain
 * ("github.com/name"), which on its own would be read as a path on this site,
 * so a missing scheme is filled in as https.
 */
export const getSafeExternalUrl = (
  value: string | null | undefined
): string | null => {
  const raw = value?.trim();
  if (!raw || raw.startsWith("/")) return null;

  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw);
  try {
    const url = new URL(hasScheme ? raw : `https://${raw}`);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
};
