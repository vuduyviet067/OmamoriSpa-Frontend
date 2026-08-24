// Public API Service
// Provides read-only access to the PUBLIC catalog for unauthenticated users.
//
// ARCHITECTURE:
// - MOCK MODE (VITE_USE_MOCK_PUBLIC=true): Uses mock data from @/mocks
// - REAL MODE (VITE_USE_MOCK_PUBLIC=false): Calls real backend API via Gateway
//
// Real backend endpoints (publicly accessible after security config update):
// - GET /treatments/ -> list treatments
// - GET /treatments/{id} -> treatment detail
// - GET /cosmetics/ -> list cosmetics
// - GET /cosmetics/{id} -> cosmetic detail
//
// SCOPE EXCLUSIONS (Phase 2):
// - Rooms remain authenticated (booking flow)
// - Therapists use static/mock data
// - Internal endpoints not exposed
//
// This service is intentionally separated from business services
// to maintain clear architectural boundaries.

import mocks from '@/mocks';
import { resolveCosmeticImage } from '@/utils/cosmeticImages';
import { resolveTreatmentImage } from '@/utils/treatmentImages';

// Environment configuration
const USE_MOCK = import.meta.env.VITE_USE_MOCK_PUBLIC !== 'false';
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8888/api/omamori';

// Image fallback mapping for service/cosmetic images
// These are local frontend assets, not from backend
const IMAGE_FALLBACKS = {
  service: '/images/spa/source/service-default.webp',
  cosmetic: '/images/spa/source/cosmetic-default.webp',
  person: '/images/spa/source/therapist-default.webp',
  room: '/images/spa/source/room-default.webp',
};

// Mock delay helper
const mockDelay = (ms = 250) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Clone data to prevent mutation
const cloneList = (list) => (Array.isArray(list) ? list.map((item) => ({ ...item })) : []);

// =========================================================
// API Client (Real Backend)
// =========================================================

/**
 * Fetch wrapper for TRUE ANONYMOUS public catalog requests.
 * Returns parsed JSON or throws on network/HTTP errors.
 *
 * ============================================================
 * ANONYMITY CONTRACT (Do NOT change without security review):
 * ============================================================
 * This function MUST send anonymous requests for the public catalog.
 * It must NOT depend on, read from, or attach anything related to
 * the logged-in session (Authorization header, Bearer token, cookies,
 * localStorage tokens, user identity, etc.).
 *
 * The browser fetch default for `credentials` is 'same-origin', which
 * can still cause browsers to attach same-site cookies to the request.
 * Public catalog endpoints should never rely on cookies either, so we
 * explicitly set `credentials: 'omit'` to guarantee NO cookies/credentials
 * are sent. This matches what curl does by default and is the difference
 * between the working curl test (HTTP 200) and the failing browser call
 * (HTTP 403).
 *
 * For the SAME reason we intentionally do NOT use the shared axios
 * client (`@/services/api`) here, because it has a request interceptor
 * that auto-injects `Authorization: Bearer <token>` from localStorage.
 * Using axios here would defeat the anonymous contract.
 *
 * Headers policy:
 * - GET requests: NO headers at all (no Content-Type, no Authorization,
 *   no custom auth headers). This avoids unnecessary CORS preflights
 *   and ensures the request is indistinguishable from a curl call.
 * - POST/PUT/PATCH with body: only `Content-Type: application/json` is
 *   set, and only when a body is actually present.
 */
async function apiFetch(endpoint, options = {}) {
  const { method = 'GET', body } = options;

  const headers = {};
  // Only set Content-Type for requests that carry a body.
  // GET requests must have zero headers to remain truly anonymous.
  if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
    headers['Content-Type'] = 'application/json';
  }

  const fetchOptions = {
    method,
    headers,
    // Explicitly omit credentials (cookies, client certs, auth headers).
    // This is the browser equivalent of curl's no-cookie default and
    // is required so the browser does NOT send any session cookies that
    // could trigger a 403 from the gateway/security filter.
    credentials: 'omit',
    // Disable caching for catalog reads (defensive; public catalog is
    // safe to cache but this keeps parity with other service calls).
    cache: 'no-store',
  };

  // Add body only if provided
  if (body) {
    fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, fetchOptions);

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.result || data;
}

// =========================================================
// Image Fallback Helper
// =========================================================

/**
 * Get image with local fallback.
 * Images are presentation layer and can use local assets.
 */
function getImageWithFallback(imageSrc, type = 'service') {
  return imageSrc || IMAGE_FALLBACKS[type] || null;
}

// =========================================================
// Normalizers (adapt backend data shape for UI compatibility)
// =========================================================

/**
 * Normalize treatment from real backend for UI compatibility.
 * Maps backend fields to frontend expected fields.
 */
function normalizeTreatment(treatment) {
  if (!treatment) return null;

  return {
    id: treatment.id,
    name: treatment.name,
    category: treatment.category || null,
    description: treatment.description || '',
    price: treatment.price,
    duration: treatment.durationMinutes || treatment.duration || 0,
    isActive: treatment.isActive !== false,
    image: resolveTreatmentImage(treatment),
  };
}

/**
 * Normalize cosmetic from real backend for UI compatibility.
 * Maps backend fields to frontend expected fields.
 */
function normalizeCosmetic(cosmetic) {
  if (!cosmetic) return null;

  return {
    id: cosmetic.id,
    name: cosmetic.name,
    brand: cosmetic.brand || '',
    manufacturer: cosmetic.manufacturer || null,
    description: cosmetic.description || '',
    price: cosmetic.price,
    stock: cosmetic.stockQuantity || cosmetic.stock || 0,
    volume: cosmetic.volume || cosmetic.unit || null,
    image: resolveCosmeticImage(cosmetic),
  };
}

/**
 * Normalize mock treatment for UI compatibility.
 * Only adjusts presentation fields, no business data enrichment.
 */
function normalizeMockTreatment(treatment) {
  if (!treatment) return null;

  return {
    id: treatment.id,
    name: treatment.name,
    category: treatment.category || null,
    description: treatment.description || '',
    price: treatment.price,
    duration: treatment.duration || treatment.durationMinutes || 0,
    isActive: treatment.isActive !== false,
    image: resolveTreatmentImage(treatment),
  };
}

/**
 * Normalize mock cosmetic for UI compatibility.
 * Only adjusts presentation fields, no business data enrichment.
 */
function normalizeMockCosmetic(cosmetic) {
  if (!cosmetic) return null;

  return {
    id: cosmetic.id,
    name: cosmetic.name,
    brand: cosmetic.brand || '',
    manufacturer: cosmetic.manufacturer || null,
    description: cosmetic.description || '',
    price: cosmetic.price,
    stock: cosmetic.stock || cosmetic.stockQuantity || 0,
    volume: cosmetic.volume || cosmetic.unit || null,
    image: resolveCosmeticImage(cosmetic),
  };
}

/**
 * Normalize mock room for UI compatibility.
 */
function normalizeMockRoom(room) {
  if (!room) return null;

  return {
    id: room.id,
    name: room.name,
    type: room.type || null,
    price: room.price,
    capacity: room.capacity || 0,
    note: room.note || null,
    isActive: room.isActive !== false,
    status: room.status || null,
    image: getImageWithFallback(room.image, 'room'),
  };
}

/**
 * Normalize public therapist from real backend for UI compatibility.
 */
function normalizeTherapist(therapist) {
  if (!therapist) return null;

  return {
    id: therapist.id,
    name: therapist.fullName,
    specialty: therapist.specialization || null,
    experience: therapist.experience || null,
    certificate: therapist.certificate || null,
    image: therapist.avatarUrl || IMAGE_FALLBACKS.person,
    active: therapist.active !== false,
  };
}

// =========================================================
// Public Catalog API - Services/Treatments
// =========================================================

/**
 * Get all services/treatments.
 * Uses real backend when VITE_USE_MOCK_PUBLIC=false, mock otherwise.
 */
export const getServices = async () => {
  if (USE_MOCK) {
    await mockDelay();
    const list = cloneList(mocks.services);
    return list.map(normalizeMockTreatment);
  }

  try {
    const data = await apiFetch('/treatments/');
    if (!data || !Array.isArray(data)) {
      return [];
    }
    return data.map(normalizeTreatment);
  } catch (error) {
    console.error('Failed to fetch treatments from backend:', error);
    throw error;
  }
};

/**
 * Get service by ID.
 * Uses real backend when VITE_USE_MOCK_PUBLIC=false, mock otherwise.
 */
export const getServiceById = async (id) => {
  if (id === undefined || id === null || id === '') return null;

  if (USE_MOCK) {
    await mockDelay();
    const list = cloneList(mocks.services);
    const treatment = list.find((s) => String(s.id) === String(id));
    return normalizeMockTreatment(treatment) || null;
  }

  try {
    const data = await apiFetch(`/treatments/${id}`);
    return normalizeTreatment(data);
  } catch (error) {
    console.error('Failed to fetch treatment detail from backend:', error);
    throw error;
  }
};

// =========================================================
// Public Catalog API - Cosmetics
// =========================================================

/**
 * Get all cosmetics.
 * Uses real backend when VITE_USE_MOCK_PUBLIC=false, mock otherwise.
 */
export const getCosmetics = async () => {
  if (USE_MOCK) {
    await mockDelay();
    const list = cloneList(mocks.cosmetics);
    return list.map(normalizeMockCosmetic);
  }

  try {
    const data = await apiFetch('/cosmetics/');
    if (!data || !Array.isArray(data)) {
      return [];
    }
    return data.map(normalizeCosmetic);
  } catch (error) {
    console.error('Failed to fetch cosmetics from backend:', error);
    throw error;
  }
};

/**
 * Get cosmetic by ID.
 * Uses real backend when VITE_USE_MOCK_PUBLIC=false, mock otherwise.
 */
export const getCosmeticById = async (id) => {
  if (id === undefined || id === null || id === '') return null;

  if (USE_MOCK) {
    await mockDelay();
    const list = cloneList(mocks.cosmetics);
    const cosmetic = list.find((c) => String(c.id) === String(id));
    return normalizeMockCosmetic(cosmetic) || null;
  }

  try {
    const data = await apiFetch(`/cosmetics/${id}`);
    return normalizeCosmetic(data);
  } catch (error) {
    console.error('Failed to fetch cosmetic detail from backend:', error);
    throw error;
  }
};

// =========================================================
// Rooms - Always mock (Phase 2)
// =========================================================

/**
 * Get all rooms.
 * NOTE: Rooms remain authenticated (booking flow).
 * Using mock data for Phase 2 public pages.
 */
export const getRooms = async () => {
  await mockDelay();
  const list = cloneList(mocks.rooms);
  return list.map(normalizeMockRoom);
};

// =========================================================
// Therapists - Always mock (Phase 2)
// =========================================================

/**
 * Get all therapists.
 * Uses real backend when VITE_USE_MOCK_PUBLIC=false, mock otherwise.
 */
export const getTherapists = async () => {
  if (USE_MOCK) {
    await mockDelay();
    const list = cloneList(mocks.therapists);
    return list.map((t) => ({
      id: t.id,
      name: t.name,
      specialty: t.specialty || null,
      experience: t.experience || null,
      certificate: t.certificate || null,
      image: getImageWithFallback(t.image, 'person'),
      active: t.active !== false,
    }));
  }

  try {
    const data = await apiFetch('/profiles/public/therapists');
    if (!data || !Array.isArray(data)) {
      return [];
    }
    return data.map(normalizeTherapist);
  } catch (error) {
    console.error('Failed to fetch therapists from backend:', error);
    throw error;
  }
};

// =========================================================
// Convenience: load homepage catalog
// =========================================================

/**
 * Load homepage catalog (services, cosmetics, therapists).
 * Rooms excluded as they are not displayed on public homepage.
 * Services/Cosmetics/Therapists use real backend when configured.
 */
export const getHomeCatalog = async () => {
  const [services, cosmetics, therapists] = await Promise.all([
    getServices(),
    getCosmetics(),
    getTherapists(),
  ]);
  return { services, cosmetics, therapists };
};

// =========================================================
// Error States
// =========================================================
// Public pages should handle these error states:
// - list []: Empty state component
// - detail 404: Not found component
// - 500/network: Error state component
//
// NO SILENT FALLBACK: Errors are surfaced, not silently switched to mock.
// =========================================================

export default {
  getServices,
  getServiceById,
  getCosmetics,
  getCosmeticById,
  getRooms,
  getTherapists,
  getHomeCatalog,
};
