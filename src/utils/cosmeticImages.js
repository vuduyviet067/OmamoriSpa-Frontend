// Shared cosmetic image resolver.
//
// Why this exists:
// The backend `cosmetic-service` does NOT expose an image/imageUrl field, and
// per the project contract we must NOT add one to the DB or the API. Real
// local assets already exist under `public/images/spa/cosmetics/` (see
// `public/images/spa/README.md` for the canonical asset manifest), but only 4
// products have a corresponding local file. To avoid inventing images for
// products that legitimately have no asset, we resolve cosmetic images in a
// single, deterministic place:
//
//   1. Whatever the backend / caller supplied on the record (image, imageUrl,
//      mediaUrl) wins first.
//   2. Otherwise, look the cosmetic's id up in COSMETIC_IMAGE_BY_ID below.
//   3. Otherwise, fall back to DEFAULT_COSMETIC_IMAGE.
//
// Mappings below are derived from the project README manifest
// (`public/images/spa/README.md`) cross-referenced with the backend seed
// (`SpaOmamori/seed_phase2_catalog.sql`). Only UUIDs whose corresponding
// asset is documented in the README are listed. Add new mappings here only
// after an asset is dropped into `public/images/spa/cosmetics/` AND documented
// in the README next to its product label.

export const DEFAULT_COSMETIC_IMAGE = '/images/spa/source/cosmetic-default.webp';

// Deterministic UUID -> local asset path. Keys MUST be the canonical backend
// seed UUID strings (see `seed_phase2_catalog.sql`).
export const COSMETIC_IMAGE_BY_ID = Object.freeze({
  // Serum phục hồi da  ->  cosmetics/serum.jpg
  '22222222-2222-4222-8222-222222222203': '/images/spa/cosmetics/serum.jpg',
  // Kem dưỡng ẩm       ->  cosmetics/moisturizer.jpg
  '22222222-2222-4222-8222-222222222204': '/images/spa/cosmetics/moisturizer.jpg',
  // Mặt nạ dưỡng da    ->  cosmetics/detox-mask.jpg
  // (README labels the asset "Mặt nạ thải độc"; the seed product is "Mặt nạ
  // dưỡng da". Both are masks and the README/seed cross-reference is explicit.)
  '22222222-2222-4222-8222-222222222205': '/images/spa/cosmetics/detox-mask.jpg',
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
