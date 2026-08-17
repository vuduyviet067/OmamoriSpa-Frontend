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