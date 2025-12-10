# WLAN Site Assignment and Automatic Profile Mapping

## Overview
Implement automatic WLAN-to-Profile assignment when creating WLANs with site selection. The system will automatically discover device groups and profiles within selected sites, assign the WLAN to all profiles, and trigger synchronization.

## User Specification
When a user creates a WLAN and selects sites:
1. System automatically determines which profiles are deployed within those sites
2. Automatically assigns the WLAN to all those profiles
3. Triggers profile sync so APs begin broadcasting
4. Shows confirmation of sites, device groups, and profiles updated

## Implementation Approach

### Architecture
```
User Creates WLAN + Selects Sites
    ↓
System Fetches Device Groups for Sites (separate API call)
    ↓
System Fetches Profiles for Device Groups
    ↓
System Assigns WLAN to Each Profile
    ↓
System Triggers Profile Sync
    ↓
APs Begin Broadcasting WLAN
```

### Key Findings from Exploration

**Existing:**
- `api.ts` EXISTS (2,253 lines) with Service CRUD methods
- `ConfigureSites.tsx` EXISTS - shows pattern for site management
- API endpoint: POST `/v1/services` creates WLANs (confirmed)
- Sites, Device Groups, Profiles structure identified

**Missing (to be created):**
- `ConfigureNetworks.tsx` - Main networks page
- `CreateWLANDialog.tsx` - WLAN creation dialog with site selection
- `wlanAssignment.ts` - Orchestration service for auto-assignment

**API Unknowns (need to discover):**
- Device Groups endpoint (user confirmed: separate API call needed)
- Profile assignment method (user said "figure it out")
- Profile sync trigger method

## Implementation Plan

### Phase 1: API Discovery & Enhancement

**File:** `src/services/api.ts` (modify existing)

Add missing methods:
```typescript
// Device Group Management (discover endpoint)
getDeviceGroupsBySite(siteId: string): Promise<DeviceGroup[]>

// Profile Management (discover endpoint)
getProfiles(): Promise<Profile[]>
getProfilesByDeviceGroup(groupId: string): Promise<Profile[]>

// Assignment Operations (discover method)
assignServiceToProfile(serviceId: string, profileId: string): Promise<void>
syncProfile(profileId: string): Promise<void>
```

**Endpoint Discovery Strategy:**
Test common patterns in order:
- Device Groups: `/v3/sites/{siteId}/devicegroups`, `/v3/devicegroups`, `/v1/devicegroups`
- Profiles: `/v3/profiles`, `/v3/approfiles`, `/v1/profiles`
- Assignment: Update profile config vs dedicated assignment endpoint

### Phase 2: Assignment Service

**File:** `src/services/wlanAssignment.ts` (new)

Core orchestration service:
```typescript
class WLANAssignmentService {
  async createWLANWithAutoAssignment(
    serviceData: CreateServiceRequest,
    options?: { dryRun?: boolean }
  ): Promise<AutoAssignmentResponse>

  private async discoverProfilesForSites(siteIds: string[]): Promise<Record<string, Profile[]>>
  private async assignToProfiles(serviceId: string, profileMap): Promise<AssignmentResult[]>
  private async syncProfiles(profileIds: string[]): Promise<any[]>
}
```

**Workflow:**
1. Create WLAN via `createService()`
2. For each site: fetch device groups
3. For each device group: fetch profiles
4. Deduplicate profiles across sites
5. Assign WLAN to each unique profile
6. Trigger profile sync (batch or individual)
7. Return detailed results

### Phase 3: UI Components

**File:** `src/components/ConfigureNetworks.tsx` (new)

Main networks management page following existing component patterns:
- Header with "Configure Networks" title
- Refresh button
- "Create WLAN" button (opens dialog)
- Table showing WLANs with sites/profiles assigned
- Loading states, error handling

**File:** `src/components/CreateWLANDialog.tsx` (new)

WLAN creation dialog with:
- WLAN Configuration section:
  - SSID (text input)
  - Security type (select: Open, WPA2-PSK, WPA3-SAE, WPA2-Enterprise)
  - Passphrase (conditional)
  - VLAN ID (optional number)
  - Band (select: 2.4GHz, 5GHz, Dual)

- Site Assignment section:
  - Multi-select for sites
  - Live profile preview (updates when sites selected)
  - Shows discovered device groups and profiles

- Action buttons:
  - Cancel
  - Create & Assign (submits to assignment service)

**Profile Preview:**
```typescript
useEffect(() => {
  if (selectedSites.length > 0) {
    // Fetch and display profiles that will be assigned
    const service = new WLANAssignmentService(apiService);
    const profileMap = await service.discoverProfilesForSites(selectedSites);
    setProfilePreview(Object.values(profileMap).flat());
  }
}, [selectedSites]);
```

### Phase 4: Type Definitions

**File:** `src/types/network.ts` (new)

```typescript
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
  sites?: string[];
  profiles?: string[];
}

export interface DeviceGroup {
  id: string;
  name: string;
  siteId: string;
  profiles?: string[];
}

export interface Profile {
  id: string;
  name: string;
  deviceGroupId: string;
  services?: string[];
  syncStatus?: 'synced' | 'pending' | 'error';
}

export interface CreateServiceRequest {
  name: string;
  ssid: string;
  security: string;
  passphrase?: string;
  vlan?: number;
  band: string;
  enabled: boolean;
  sites: string[];
}

export interface AutoAssignmentResponse {
  serviceId: string;
  sitesProcessed: number;
  deviceGroupsFound: number;
  profilesAssigned: number;
  assignments: AssignmentResult[];
  syncResults?: any[];
}

export interface AssignmentResult {
  profileId: string;
  profileName: string;
  success: boolean;
  error?: string;
}
```

### Phase 5: Integration

**File:** `src/App.tsx` (modify)

Add route for configure-networks page:
```typescript
{currentPage === 'configure-networks' && <ConfigureNetworks />}
```

**Note:** Sidebar already has Networks navigation item configured - no changes needed.

## Error Handling

### Levels:
1. **API Level:** Network errors, authentication failures, endpoint not found
2. **Service Level:** Partial failures (some profiles succeed, others fail)
3. **UI Level:** Toast notifications, error alerts, retry mechanisms

### User Feedback:
- **Success:** "WLAN 'Guest' created and assigned to 12 profiles across 3 sites"
- **Partial:** "WLAN created, but 2 of 12 profile assignments failed" + retry option
- **Failure:** Specific error message + keep form open with data

## Testing Strategy

1. **API Discovery:**
   - Test endpoint patterns until correct ones found
   - Verify caching of discovered endpoints

2. **Assignment Flow:**
   - Single site, single profile
   - Multiple sites, multiple profiles
   - Site with no profiles (graceful handling)
   - Partial assignment failure

3. **UI:**
   - Form validation
   - Site selection updates profile preview
   - Loading states
   - Error handling

## Implementation Sequence

1. **API Discovery** (Day 1-2)
   - Enhance api.ts with device group/profile methods
   - Discover correct endpoints through testing
   - Implement error handling

2. **Assignment Service** (Day 2-3)
   - Create wlanAssignment.ts
   - Implement profile discovery logic
   - Implement assignment and sync logic
   - Test with mock data

3. **UI Components** (Day 3-5)
   - Create ConfigureNetworks.tsx main page
   - Create CreateWLANDialog.tsx with form
   - Implement multi-select component
   - Add loading states and error displays

4. **Integration** (Day 5)
   - Update App.tsx routing
   - End-to-end testing
   - Bug fixes

5. **Polish** (Day 6)
   - Animations and transitions
   - Performance optimizations
   - Documentation

## Critical Files

1. **`src/services/api.ts`** - API layer with device group/profile methods (modify existing)
2. **`src/services/wlanAssignment.ts`** - Assignment orchestration logic (new)
3. **`src/components/CreateWLANDialog.tsx`** - WLAN creation UI (new)
4. **`src/components/ConfigureNetworks.tsx`** - Main networks page (new)
5. **`src/types/network.ts`** - Type definitions (new)
6. **`src/App.tsx`** - Routing integration (modify)

## Success Criteria

- ✅ WLAN creation with site selection works
- ✅ Profiles automatically discovered for selected sites
- ✅ WLAN assigned to all discovered profiles
- ✅ Profile sync triggered successfully
- ✅ Clear user feedback at every step
- ✅ Graceful error handling for partial failures
- ✅ <5 second operation time for typical assignment
