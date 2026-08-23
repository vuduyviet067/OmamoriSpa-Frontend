// Shared cosmetic image resolver.
//
// Why this exists:
// The cosmetic-service now persists an OPTIONAL `imageUrl` on each cosmetic
// (VARCHAR(500), nullable). Admin can enter either an absolute http(s) URL or
// an in-system web path such as "/images/spa/cosmetics/cosmetic-07.jpg".
// The frontend still owns the deterministic UUID -> local asset map for the
// stable seed cosmetics, so missing/empty imageUrl falls back to that map
// before reaching the placeholder.
//
// Resolution order:
//   1. cosmetic.imageUrl  — what admin actually saved through the modal.
//   2. cosmetic.image     — legacy / mock data field, kept for back-compat.
//   3. Lookup of cosmetic.id in COSMETIC_IMAGE_BY_ID — stable seed UUIDs.
//   4. DEFAULT_COSMETIC_IMAGE — generic placeholder.
//
// Mappings below are derived from the canonical seed
// (`SpaOmamori/seed_phase2_catalog.sql`). Only the canonical seed UUIDs are
// listed; any admin/test/duplicate records without imageUrl fall through to
// the placeholder.

export const DEFAULT_COSMETIC_IMAGE = '/images/spa/source/cosmetic-default.webp';

// Deterministic UUID -> local asset path. Keys MUST be the canonical
// backend seed UUID strings (see `seed_phase2_catalog.sql`).
export const COSMETIC_IMAGE_BY_ID = Object.freeze({
  // 1. Sữa rửa mặt dịu nhẹ -> cosmetics/cosmetic-01.jpg
  '22222222-2222-4222-8222-222222222201': '/images/spa/cosmetics/cosmetic-01.jpg',
  // 2. Toner cân bằng da -> cosmetics/cosmetic-02.jpg
  '22222222-2222-4222-8222-222222222202': '/images/spa/cosmetics/cosmetic-02.jpg',
  // 3. Serum phục hồi da -> cosmetics/cosmetic-03.jpg
  '22222222-2222-4222-8222-222222222203': '/images/spa/cosmetics/cosmetic-03.jpg',
  // 4. Kem dưỡng ẩm -> cosmetics/cosmetic-04.jpg
  '22222222-2222-4222-8222-222222222204': '/images/spa/cosmetics/cosmetic-04.jpg',
  // 5. Mặt nạ dưỡng da -> cosmetics/cosmetic-05.jpg
  '22222222-2222-4222-8222-222222222205': '/images/spa/cosmetics/cosmetic-05.jpg',
  // 6. Dầu massage thư giãn -> cosmetics/cosmetic-06.jpg
  '22222222-2222-4222-8222-222222222206': '/images/spa/cosmetics/cosmetic-06.jpg',
});

// Returns true when the candidate looks like a real, renderable path/URL.
// Filters out empty strings, whitespace, and obviously bad values that the
// backend may echo back when the field was explicitly cleared.
function isUsableImage(candidate) {
  if (typeof candidate !== 'string') return false;
  const trimmed = candidate.trim();
  if (!trimmed) return false;
  return true;
}

/**
 * Resolve the image to render for a cosmetic record.
 *
 * Resolution order:
 *   1. `cosmetic.imageUrl` — persisted value from Admin edit.
 *   2. `cosmetic.image`    — legacy / mock payload field.
 *   3. Lookup of `cosmetic.id` in COSMETIC_IMAGE_BY_ID (stable seed UUIDs).
 *   4. DEFAULT_COSMETIC_IMAGE placeholder.
 *
 * Passing `null`/`undefined` yields the placeholder as well.
 *
 * @param {object|null|undefined} cosmetic
 * @returns {string}
 */
export function resolveCosmeticImage(cosmetic) {
  if (!cosmetic) return DEFAULT_COSMETIC_IMAGE;

  if (isUsableImage(cosmetic.imageUrl)) return cosmetic.imageUrl.trim();
  if (isUsableImage(cosmetic.image)) return cosmetic.image.trim();

  const byId = COSMETIC_IMAGE_BY_ID[String(cosmetic.id)];
  if (byId) return byId;

  return DEFAULT_COSMETIC_IMAGE;
}
