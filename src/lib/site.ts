export const SITE_NAME = 'Vitalis';
export const SITE_DESCRIPTION =
  'Dashboard for monitoring HWC survey progress and key public health indicators.';

/**
 * Canonical public URL of the deployed site (no trailing slash).
 * Set NEXT_PUBLIC_SITE_URL in production; falls back to localhost for development.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:9002').replace(/\/+$/, '');
