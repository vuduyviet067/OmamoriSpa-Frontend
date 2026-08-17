/**
 * Barrel export for mock catalog data.
 * Imported by src/services/publicService.js so pages/components
 * never have to know whether the data came from the API or the mocks.
 */

import services from './services';
import cosmetics from './cosmetics';
import therapists from './therapists';
import rooms from './rooms';
import customer from './customer';
import therapistMock from './therapist';
import admin from './admin';

export {
  services,
  cosmetics,
  therapists,
  rooms,
  customer,
  therapistMock,
  admin,
};

export default {
  services,
  cosmetics,
  therapists,
  rooms,
  customer,
  therapist: therapistMock,
  admin,
};