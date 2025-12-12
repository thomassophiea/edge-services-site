// Network/WLAN type definitions for automatic profile assignment

export interface Service {
  id: string;
  name?: string;
  serviceName?: string;
  ssid: string;
  security: 'open' | 'wpa2-psk' | 'wpa3-sae' | 'wpa2-enterprise';
  passphrase?: string;
  vlan?: number;
  band: '2.4GHz' | '5GHz' | 'dual';
  enabled: boolean;
  sites?: string[]; // Site IDs this service is assigned to
  profiles?: string[]; // Profile IDs this service is assigned to
  description?: string;
  hidden?: boolean;
  maxClients?: number;
}

export interface Site {
  id: string;
  name: string;
  siteName?: string;
  location?: string;
  country?: string;
  timezone?: string;
  description?: string;
  deviceGroups?: string[]; // May be inline or require separate fetch
  status?: string;
}

export interface DeviceGroup {
  id: string;
  name: string;
  siteId: string;
  siteName?: string;
  deviceCount?: number;
  profiles?: string[]; // Profile IDs assigned to this group
  apSerialNumbers?: string[];
  description?: string;
}

export interface Profile {
  id: string;
  name: string;
  profileName?: string;
  deviceGroupId?: string;
  services?: string[]; // Service IDs assigned to this profile
  syncStatus?: 'synced' | 'pending' | 'error';
  lastSync?: string;
  enabled?: boolean;
  description?: string;
}

export interface CreateServiceRequest {
  name: string;
  ssid: string;
  security: string;
  passphrase?: string;
  vlan?: number;
  band: string;
  enabled: boolean;
  sites: string[]; // Sites to assign to
  description?: string;
}

export interface AutoAssignmentResponse {
  serviceId: string;
  sitesProcessed: number;
  deviceGroupsFound: number;
  profilesAssigned: number;
  assignments: AssignmentResult[];
  syncResults?: SyncResult[];
  success: boolean;
  errors?: string[];
}

export interface AssignmentResult {
  profileId: string;
  profileName: string;
  success: boolean;
  error?: string;
}

export interface SyncResult {
  profileId: string;
  profileName: string;
  success: boolean;
  error?: string;
  syncTime?: string;
}

// Form data for WLAN creation dialog
export interface WLANFormData {
  ssid: string;
  security: 'open' | 'wpa2-psk' | 'wpa3-sae' | 'wpa2-enterprise';
  passphrase: string;
  vlan: number | null;
  band: '2.4GHz' | '5GHz' | 'dual';
  enabled: boolean;
  selectedSites: string[];
}

// ============================================
// Site-Centric WLAN Deployment Types
// ============================================

/**
 * Deployment mode for WLAN-to-profile assignment
 * - ALL_PROFILES_AT_SITE: Assign to all profiles at selected site (default)
 * - INCLUDE_ONLY: Assign only to specifically selected profiles
 * - EXCLUDE_SOME: Assign to all profiles except specifically excluded ones
 */
export type DeploymentMode = 'ALL_PROFILES_AT_SITE' | 'INCLUDE_ONLY' | 'EXCLUDE_SOME';

/**
 * Source of profile assignment
 * - SITE_PROPAGATION: Assignment came from site-level deployment
 * - EXPLICIT_ASSIGNMENT: Direct profile-level assignment
 * - MANUAL_OVERRIDE: User manually overrode site-level assignment
 */
export type AssignmentSource = 'SITE_PROPAGATION' | 'EXPLICIT_ASSIGNMENT' | 'MANUAL_OVERRIDE';

/**
 * Mismatch reasons when expected state doesn't match actual state
 */
export type MismatchReason =
  | 'MISSING_ASSIGNMENT'        // Expected assigned but not found
  | 'UNEXPECTED_ASSIGNMENT'     // Not expected but found assigned
  | 'PROFILE_DELETED'           // Profile no longer exists
  | 'PROFILE_MOVED'             // Profile moved to different device group
  | 'SYNC_FAILED'               // Assignment succeeded but sync failed
  | null;

/**
 * Site-level WLAN assignment tracking
 * Stores the user's intent for which sites should receive a WLAN and how
 */
export interface WLANSiteAssignment {
  wlanId: string;
  wlanName: string;
  siteId: string;
  siteName: string;
  deploymentMode: DeploymentMode;
  includedProfiles: string[];      // Profile IDs to include (INCLUDE_ONLY mode)
  excludedProfiles: string[];      // Profile IDs to exclude (EXCLUDE_SOME mode)
  createdAt: string;
  lastModified: string;
}

/**
 * Profile-level WLAN assignment tracking
 * Tracks expected vs actual state for reconciliation
 */
export interface WLANProfileAssignment {
  wlanId: string;
  wlanName: string;
  profileId: string;
  profileName: string;
  siteId: string;
  siteName: string;
  source: AssignmentSource;
  expectedState: 'ASSIGNED' | 'NOT_ASSIGNED';
  actualState: 'ASSIGNED' | 'NOT_ASSIGNED' | 'UNKNOWN';
  mismatch: MismatchReason;
  lastReconciled: string;
  syncStatus: 'SYNCED' | 'PENDING' | 'FAILED' | 'UNKNOWN';
  syncError?: string;
}

/**
 * Calculated effective profile set for a site
 * Shows which profiles will/won't receive WLAN based on deployment mode
 */
export interface EffectiveProfileSet {
  siteId: string;
  siteName: string;
  deploymentMode: DeploymentMode;
  allProfiles: Profile[];           // All profiles at site
  selectedProfiles: Profile[];      // Profiles that will receive WLAN
  excludedProfiles: Profile[];      // Profiles that won't receive WLAN
}

/**
 * Result of reconciliation process
 * Compares expected vs actual assignments
 */
export interface ReconciliationResult {
  wlanId: string;
  wlanName: string;
  totalExpected: number;            // Profiles expected to have WLAN
  totalActual: number;              // Profiles actually having WLAN
  matched: number;                  // Profiles with correct state
  mismatched: number;               // Profiles with incorrect state
  mismatches: WLANProfileAssignment[];  // Detailed mismatch list
  timestamp: string;
}

/**
 * Remediation action to fix a mismatch
 */
export interface RemediationAction {
  type: 'ADD_ASSIGNMENT' | 'REMOVE_ASSIGNMENT' | 'RESYNC_PROFILE';
  wlanId: string;
  wlanName: string;
  profileId: string;
  profileName: string;
  siteId: string;
  reason: string;
  mismatchReason: MismatchReason;
}
