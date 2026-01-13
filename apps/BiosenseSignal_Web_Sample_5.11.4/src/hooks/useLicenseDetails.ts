import { createLocalStorageStateHook } from 'use-local-storage-state';

export const DEFAULT_MEASUREMENT_DURATION = 60;
export const MIN_MEASUREMENT_DURATION = 20;
export const MAX_MEASUREMENT_DURATION = 180;

export const useLicenseKey = createLocalStorageStateHook('licenseKey', null);
export const useProductId = createLocalStorageStateHook('productId', null);
export const useMeasurementDuration = createLocalStorageStateHook(
  'measurementDuration',
  DEFAULT_MEASUREMENT_DURATION,
);
