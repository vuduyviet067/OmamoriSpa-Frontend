// Public API Service
// Provides read-only access to the public catalog:
//   - services (UC01)
//   - cosmetics (UC01)
//   - therapists (UC01)
//   - rooms (used by booking & homepage)
//
// The service hides where the data comes from. By default (and when
// VITE_USE_MOCK_DATA=true) it returns a curated mock dataset so the
// frontend can be demoed without the backend running. Setting
// VITE_USE_MOCK_DATA=false makes every call go through axios/apiClient
// against the real API.
//
// Mock data lives in src/mocks/ and is kept in the same shape as the
// real API responses so consumers don't have to branch on the source.

import apiClient from './api';
import mocks from '@/mocks';

// Toggle: when this is exactly the string 'true' we hit the real API.
// Anything else (including undefined) keeps us on the mock dataset, which
// is what we want out-of-the-box for a frontend-only demo.
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';

// Tiny artificial delay so the LoadingState can render in mock mode.
// Mimics a real network round-trip; tweak if tests feel sluggish.
const mockDelay = (ms = 250) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const cloneList = (list) => (Array.isArray(list) ? list.map((item) => ({ ...item })) : []);

// =========================================================
// Envelope helpers (mirror adminService / customerService)
// =========================================================

const extractList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  if (payload && Array.isArray(payload.items)) return payload.items;
  if (payload && Array.isArray(payload.results)) return payload.results;
  return [];
};

const extractObject = (payload) => {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    if (payload.data && typeof payload.data === 'object') return payload.data;
    return payload;
  }
  return null;
};

// =========================================================
// Public catalog endpoints
// =========================================================

export const getServices = async () => {
  if (USE_MOCK_DATA) {
    await mockDelay();
    return cloneList(mocks.services);
  }
  const res = await apiClient.get('/services');
  return extractList(res.data);
};

export const getServiceById = async (id) => {
  if (id === undefined || id === null || id === '') return null;
  if (USE_MOCK_DATA) {
    await mockDelay();
    const list = cloneList(mocks.services);
    return list.find((s) => String(s.id) === String(id)) || null;
  }
  try {
    const res = await apiClient.get(`/services/${id}`);
    return extractObject(res.data);
  } catch (err) {
    if (err.response?.status === 404) return null;
    throw err;
  }
};

export const getCosmetics = async () => {
  if (USE_MOCK_DATA) {
    await mockDelay();
    return cloneList(mocks.cosmetics);
  }
  const res = await apiClient.get('/cosmetics');
  return extractList(res.data);
};

export const getCosmeticById = async (id) => {
  if (id === undefined || id === null || id === '') return null;
  if (USE_MOCK_DATA) {
    await mockDelay();
    const list = cloneList(mocks.cosmetics);
    return list.find((c) => String(c.id) === String(id)) || null;
  }
  try {
    const res = await apiClient.get(`/cosmetics/${id}`);
    return extractObject(res.data);
  } catch (err) {
    if (err.response?.status === 404) return null;
    throw err;
  }
};

export const getTherapists = async () => {
  if (USE_MOCK_DATA) {
    await mockDelay();
    return cloneList(mocks.therapists);
  }
  const res = await apiClient.get('/therapists');
  return extractList(res.data);
};

export const getRooms = async () => {
  if (USE_MOCK_DATA) {
    await mockDelay();
    return cloneList(mocks.rooms);
  }
  const res = await apiClient.get('/rooms');
  return extractList(res.data);
};

// Convenience: load every section the homepage needs in one shot.
// All calls run in parallel and each one is independently safe.
export const getHomeCatalog = async () => {
  const [services, cosmetics, therapists, rooms] = await Promise.all([
    getServices(),
    getCosmetics(),
    getTherapists(),
    getRooms(),
  ]);
  return { services, cosmetics, therapists, rooms };
};

export default {
  getServices,
  getServiceById,
  getCosmetics,
  getCosmeticById,
  getTherapists,
  getRooms,
  getHomeCatalog,
};