/**
 * Feature flags for WorldPass
 * 
 * This module provides a centralized place to manage feature flags.
 * Flags can be toggled on/off to enable/disable features without code changes.
 */

const FEATURE_FLAGS = {
  // Show blockchain/on-chain status indicators in issuer console
  BLOCKCHAIN_STATUS_BADGES: true,
  
  // Enable on-chain verification in presentation flow
  BLOCKCHAIN_VERIFICATION: true,
  
  // Show blockchain transaction links in credential details
  BLOCKCHAIN_TX_LINKS: true,
};

export function isFeatureEnabled(featureName) {
  return FEATURE_FLAGS[featureName] === true;
}

export function getFeatureFlags() {
  return { ...FEATURE_FLAGS };
}
