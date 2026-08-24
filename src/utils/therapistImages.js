// Shared therapist image resolver for public UI.
//
// Resolution order:
//   1. therapist.avatarUrl  — persisted value from backend DB.
//   2. therapist.id in THERAPIST_IMAGE_BY_ID — stable seed therapist UUIDs.
//   3. DEFAULT_THERAPIST_IMAGE — generic placeholder.
//
// Mappings are 1:1 to the canonical backend therapist records returned by
// GET /profiles/public/therapists.  Therapist IDs are stable UUIDs sourced
// from the seed database (therapist table, NOT profile table).

export const DEFAULT_THERAPIST_IMAGE = '/images/spa/source/therapist-default.webp';

export const THERAPIST_IMAGE_BY_ID = Object.freeze({
  // Therapist 1 -> therapist-real-01.jpg
  '085c26a3-1a45-40ad-982f-96d09d1b4634': '/images/spa/therapists-real/therapist-real-01.jpg',
  // Therapist 2 -> therapist-real-02.jpg
  '319b3eb9-5189-40b8-bd55-b9299eb84b61': '/images/spa/therapists-real/therapist-real-02.jpg',
  // Therapist 3 -> therapist-real-03.jpg
  '55b3e859-b8c0-4adb-9d9e-b95980ec781f': '/images/spa/therapists-real/therapist-real-03.jpg',
  // Therapist 4 -> therapist-real-04.jpg
  '63be4182-5bda-40b5-8067-20aaaca4c489': '/images/spa/therapists-real/therapist-real-04.jpg',
  // Therapist 5 -> therapist-real-05.jpg
  '9f0d579a-4faf-48a1-9765-e3ea5d572edc': '/images/spa/therapists-real/therapist-real-05.jpg',
  // Therapist 6 -> therapist-real-06.jpg
  'b186ff10-ab2f-4624-aace-b02dab8c0b22': '/images/spa/therapists-real/therapist-real-06.jpg',
  // Therapist 7 -> therapist-real-07.jpg
  'c59e0b25-6ffb-4302-8953-ade7ae0cf132': '/images/spa/therapists-real/therapist-real-07.jpg',
});

function isUsableImage(candidate) {
  if (typeof candidate !== 'string') return false;
  const trimmed = candidate.trim();
  return trimmed.length > 0;
}

/**
 * Resolve the image to render for a therapist record.
 *
 * Resolution order:
 *   1. therapist.avatarUrl — persisted avatar URL from backend DB.
 *   2. therapist.id in THERAPIST_IMAGE_BY_ID — local real photo for seed therapists.
 *   3. DEFAULT_THERAPIST_IMAGE — generic placeholder.
 *
 * @param {object|null|undefined} therapist
 * @returns {string}
 */
export function resolveTherapistImage(therapist) {
  if (!therapist) return DEFAULT_THERAPIST_IMAGE;

  if (isUsableImage(therapist.avatarUrl)) return therapist.avatarUrl.trim();

  const byId = THERAPIST_IMAGE_BY_ID[String(therapist.id)];
  if (byId) return byId;

  return DEFAULT_THERAPIST_IMAGE;
}
