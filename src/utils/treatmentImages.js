// Shared treatment/service image resolver.
//
// Why this exists:
// The `treatment-service` does NOT expose an `image`/`imageUrl` field on
// `TreatmentResponse`, and per the project contract we must NOT add one to
// the DB or the public API. The frontend keeps real production assets under
// `public/images/spa/services/` (see `public/images/spa/README.md` for the
// canonical asset folder). To avoid inventing images for items that
// legitimately have no asset, treatment images are resolved in a single,
// deterministic place:
//
//   1. Whatever the backend / caller supplied on the record (image,
//      imageUrl, mediaUrl) wins first.
//   2. Otherwise, look the treatment's id up in TREATMENT_IMAGE_BY_ID below.
//   3. Otherwise, fall back to DEFAULT_TREATMENT_IMAGE.
//
// UUID -> asset mappings below were established from the actual backend
// response (gateway) cross-referenced with the canonical seed file
// `SpaOmamori/seed_phase2_catalog.sql`. Only the stable seed treatments are
// listed. Add new mappings here only after an asset is dropped into
// `public/images/spa/services/` AND the corresponding record is part of the
// stable/intended catalog.
//
// Note on display order:
// The user deliberately renamed the asset files in current displayed order
// at the time the photos were added. The mapping below therefore mirrors
// the seed catalog in canonical seed order (which is also the order
// observed on the public API for active seed records). Items not present
// in the map retain the existing service placeholder.

export const DEFAULT_TREATMENT_IMAGE = '/images/spa/source/service-default.webp';

// Deterministic UUID -> local asset path. Keys MUST be the canonical seed
// UUID strings (see `seed_phase2_catalog.sql`). The map is frozen at
// runtime; new entries should only be added when an additional intended
// catalog item is introduced.
export const TREATMENT_IMAGE_BY_ID = Object.freeze({
  // 1. Massage thư giãn toàn thân -> services/service-01.jpg
  '11111111-1111-4111-8111-111111111101': '/images/spa/services/service-01.jpg',
  // 2. Chăm sóc da mặt cơ bản -> services/service-02.jpg
  '11111111-1111-4111-8111-111111111102': '/images/spa/services/service-02.jpg',
  // 3. Trị liệu cổ vai gáy -> services/service-03.jpg
  '11111111-1111-4111-8111-111111111103': '/images/spa/services/service-03.jpg',
  // 4. Chăm sóc da chuyên sâu -> services/service-04.jpg
  '11111111-1111-4111-8111-111111111104': '/images/spa/services/service-04.jpg',
  // 5. Massage đá nóng -> services/service-05.jpg
  '11111111-1111-4111-8111-111111111105': '/images/spa/services/service-05.jpg',
  // 6. Liệu trình phục hồi cơ thể -> services/service-06.jpg
  '11111111-1111-4111-8111-111111111106': '/images/spa/services/service-06.jpg',
});

/**
 * Resolve the image to render for a treatment record.
 *
 * Resolution order:
 *   1. `treatment.image`     (preferred)
 *   2. `treatment.imageUrl`
 *   3. `treatment.mediaUrl`
 *   4. Lookup of `treatment.id` in TREATMENT_IMAGE_BY_ID.
 *   5. DEFAULT_TREATMENT_IMAGE placeholder.
 *
 * Passing `null`/`undefined` yields the placeholder as well.
 *
 * @param {object|null|undefined} treatment
 * @returns {string}
 */
export function resolveTreatmentImage(treatment) {
  if (!treatment) return DEFAULT_TREATMENT_IMAGE;

  const explicit =
    treatment.image ||
    treatment.imageUrl ||
    treatment.mediaUrl;
  if (explicit) return explicit;

  const byId = TREATMENT_IMAGE_BY_ID[String(treatment.id)];
  if (byId) return byId;

  return DEFAULT_TREATMENT_IMAGE;
}
