// Shared cosmetic image resolver.
//
// Why this exists:
// The backend `cosmetic-service` does NOT expose an image/imageUrl field,
// and per the project contract we must NOT add one to the DB or the API.
// Real local assets exist under `public/images/spa/cosmetics/`
// (see `public/images/spa/README.md` for the canonical asset manifest).
//
// Resolution order:
//   1. Whatever the backend / caller supplied on the record (image,
//      imageUrl, mediaUrl) wins first.
//   2. Otherwise, look the cosmetic's id up in COSMETIC_IMAGE_BY_ID below.
//   3. Otherwise, fall back to DEFAULT_COSMETIC_IMAGE.
//
// Mappings below are derived from the project README manifest
// (`public/images/spa/README.md`) cross-referenced with the canonical seed
// (`SpaOmamori/seed_phase2_catalog.sql`). Only the canonical seed UUIDs are
// listed; any admin/test/duplicate records fall through to the
// placeholder.

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

/**
 * Resolve the image to render for a cosmetic record.
 *
 * Resolution order:
 *   1. `cosmetic.image`     (preferred)
 *   2. `cosmetic.imageUrl`
 *   3. `cosmetic.mediaUrl`
 *   4. Lookup of `cosmetic.id` in COSMETIC_IMAGE_BY_ID.
 *   5. DEFAULT_COSMETIC_IMAGE placeholder.
 *
 * Passing `null`/`undefined` yields the placeholder as well.
 *
 * @param {object|null|undefined} cosmetic
 * @returns {string}
 */
export function resolveCosmeticImage(cosmetic) {
  if (!cosmetic) return DEFAULT_COSMETIC_IMAGE;

  const explicit =
    cosmetic.image ||
    cosmetic.imageUrl ||
    cosmetic.mediaUrl;
  if (explicit) return explicit;

  const byId = COSMETIC_IMAGE_BY_ID[String(cosmetic.id)];
  if (byId) return byId;

  return DEFAULT_COSMETIC_IMAGE;
}
