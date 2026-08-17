export const ROLES = {
  CUSTOMER: 'CUSTOMER',
  THERAPIST: 'THERAPIST',
  ADMIN: 'ADMIN',
};

export const ROLE_LABELS = {
  [ROLES.CUSTOMER]: 'Khách hàng',
  [ROLES.THERAPIST]: 'Kỹ thuật viên',
  [ROLES.ADMIN]: 'Quản trị viên',
};

export const REDIRECT_PATHS = {
  [ROLES.CUSTOMER]: '/customer',
  [ROLES.THERAPIST]: '/therapist',
  [ROLES.ADMIN]: '/admin',
};

// Backend enum (CUSTOMER | STAFF | ADMIN) is the source of truth for the
// JWT `scope` claim. The frontend keeps STAFF -> THERAPIST so the existing
// role names, route guards, and layouts do not have to be renamed.
// `normalizeRole` is the single place to translate between the two.
export const BACKEND_ROLES = {
  CUSTOMER: 'CUSTOMER',
  STAFF: 'STAFF',
  ADMIN: 'ADMIN',
};

export function normalizeRole(backendRole) {
  if (!backendRole) return null;
  const upper = String(backendRole).toUpperCase();
  if (upper === BACKEND_ROLES.STAFF) return ROLES.THERAPIST;
  if (upper === BACKEND_ROLES.CUSTOMER) return ROLES.CUSTOMER;
  if (upper === BACKEND_ROLES.ADMIN) return ROLES.ADMIN;
  return null;
}