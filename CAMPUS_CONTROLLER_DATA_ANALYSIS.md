# Campus Controller Data Analysis
## Application and RFQI Data Retrieval

**Date**: 2025-12-31
**Campus Controller**: https://tsophiea.ddns.net
**Target URL**: https://tsophiea.ddns.net/#/site/report/Production%20Site#Details

---

## Summary

The Campus Controller has **widget-based reporting** for application and RFQI data. While we can retrieve the list of available widgets, the actual data retrieval mechanism requires further investigation.

---

## Key Findings

### 1. Working Endpoints ✅

| Endpoint | Method | Status | Returns |
|----------|--------|--------|---------|
| `/v1/oauth2/token` | POST | 200 | Access token for authentication |
| `/v3/sites` | GET | 200 | List of sites (Production Site ID: `c7395471-aa5c-46dc-9211-3ed24c5789bd`) |
| `/v1/sites/report/widgets` | GET | 200 | Array of 94 widget definitions |
| `/v3/sites/report/widgets` | GET | 200 | Array of 94 widget definitions |
| `/v1/reports/widgets` | GET | 200 | Object with widgets array |
| `/v1/sites/{siteId}/report` | GET | 200 | Empty object (no data) |

### 2. Non-Working Endpoints ❌

| Endpoint | Status | Notes |
|----------|--------|-------|
| `/v1/applications` | 404 | Application analytics not available |
| `/v1/analytics/applications` | 404 | Not implemented |
| `/v1/sites/{siteId}/applications` | 404 | Not available |
| `/v3/sites/{siteId}/analytics` | 404 | Not implemented |
| `/v3/sites/{siteId}/report` | 404 | v3 report endpoint doesn't exist |

---

## Available Widgets

### RFQI Widget

**Widget ID**: `rfQuality`

**Filters**:
- `Filter_2_4` (2.4 GHz band)
- `Filter_5` (5 GHz band)
- Additional filters available

**Purpose**: RF Quality Index - measures wireless signal quality and interference

---

### Application Widgets (14 total)

#### 1. **Top Applications by Throughput**
- Widget ID: `topAppGroupsByThroughputReport`
- Purpose: Applications consuming most bandwidth

#### 2. **Worst Applications by Throughput**
- Widget ID: `worstAppGroupsByThroughputReport`
- Purpose: Applications with lowest throughput (potential issues)

#### 3. **Top Applications by Client Count**
- Widget ID: `topAppGroupsByClientCountReport`
- Purpose: Most popular applications by user count

#### 4. **Worst Applications by Client Count**
- Widget ID: `worstAppGroupsByClientCountReport`
- Purpose: Least used applications

#### 5. **Top Applications by Usage**
- Widget ID: `topAppGroupsByUsage`
- Purpose: Applications by total data usage

#### 6. **Worst Applications by Usage**
- Widget ID: `worstAppGroupsByUsage`
- Purpose: Applications with minimal usage

#### 7-14. **Radio-Specific Widgets**
- `apPerChannelRadio1` - APs per channel on 2.4 GHz
- `apPerChannelRadio2` - APs per channel on 5 GHz
- `apPerChannelRadio3` - APs per channel on 6 GHz
- `apPowerRadio1` - Power levels on 2.4 GHz
- `apPowerRadio2` - Power levels on 5 GHz
- `apPowerRadio3` - Power levels on 6 GHz
- `apPerChannel` - Combined channel distribution
- `apPower` - Combined power distribution

---

### Other Notable Widgets (80 additional)

| Category | Widget Examples |
|----------|-----------------|
| **Throughput** | `throughputReport`, `byteUtilization`, `topAccessPointsByThroughput` |
| **RF Health** | `topAccessPointsByRfHealth`, `worstApsByRfHealth`, `channelDistributionRadio1` |
| **Client Metrics** | `topClientsBySnr`, `worstClientsByRetries`, `clientsPerNetwork` |
| **Smart RF** | `smartRFMitigation`, `smartRFMitigationHistory` |
| **User Analytics** | `guestUsersReport`, `dwellTimeReport`, `countOfUniqueUsersReport` |
| **Network Analysis** | `topServicesByThroughput`, `usagePerNetwork`, `throughputPerNetwork` |
| **Device Analysis** | `topManufacturersByClientCount`, `topOsByClientCountReport` |
| **Mobility** | `mobilityOverTime`, `topFloorByMobility`, `topMobileClients` |
| **Scorecards** | `uniqueClientsTotalScorecard`, `ulThroughputPeakScorecard` |

---

## Data Retrieval Challenge

### What We Know ❓

1. **Widget Definitions Are Available**
   - We can successfully fetch the list of 94 available widgets
   - Each widget has an ID and optional filters

2. **Direct Widget Access Failed**
   - Attempted endpoints:
     - `/v1/sites/{siteId}/report/{widgetId}` ❌
     - `/v1/report/sites/{siteId}/{widgetId}` ❌
     - `/v1/sites/report/{widgetId}?siteId={siteId}` ❌
     - `/v1/widgets/{widgetId}?siteId={siteId}` ❌

3. **POST Requests Failed**
   - Attempted batch widget data fetch via POST ❌
   - Various payload structures tested ❌

### Possible Solutions 🔍

#### Option 1: Undiscovered Endpoint Pattern
The Campus Controller likely has a specific endpoint pattern we haven't discovered yet. Possibilities:
- Time-range based endpoint: `/v1/widgets/{widgetId}/data?start={timestamp}&end={timestamp}&siteId={siteId}`
- Batch query endpoint with specific structure
- Report generation endpoint that builds data on-demand

#### Option 2: Browser DevTools Network Analysis
**Recommended Next Step**: Access the Campus Controller UI in a browser and use DevTools to capture the actual API calls when viewing the report page.

Steps:
1. Open https://tsophiea.ddns.net in Chrome/Firefox
2. Open DevTools (F12) → Network tab
3. Navigate to /#/site/report/Production%20Site#Details
4. Filter network requests by "XHR" or "Fetch"
5. Look for API calls made to fetch widget data
6. Document the exact endpoint, method, headers, and payload

#### Option 3: Alternative Data Sources
Since direct application analytics endpoints return 404, the Campus Controller may be using:
- **DPI (Deep Packet Inspection) data** aggregated into widgets
- **Service-level statistics** that include application categories
- **Client session data** that contains application info

---

## Recommended Implementation Strategy

### Phase 1: Capture Real API Calls (IMMEDIATE)
Use browser DevTools to capture the exact API pattern the Campus Controller UI uses

### Phase 2: Widget-Based Dashboard Components
Create components that mirror the Campus Controller's widget system:

```typescript
// Widget data fetcher hook
interface WidgetConfig {
  widgetId: string;
  siteId: string;
  duration?: string;
  filters?: string[];
}

async function fetchWidgetData(config: WidgetConfig) {
  // Use discovered endpoint pattern from Phase 1
  const endpoint = `/v1/discovered/pattern/${config.widgetId}`;
  const response = await apiService.makeAuthenticatedRequest(endpoint, {
    method: 'GET' // or POST based on findings
  });
  return response.json();
}

// RFQI Component
export function RFQualityWidget() {
  const data = useFetchWidget({
    widgetId: 'rfQuality',
    siteId: currentSiteId,
    filters: ['Filter_2_4', 'Filter_5']
  });

  return <div>/* Render RF quality metrics */</div>;
}

// Application Analytics Component
export function TopApplicationsWidget() {
  const data = useFetchWidget({
    widgetId: 'topAppGroupsByThroughputReport',
    siteId: currentSiteId
  });

  return <div>/* Render top apps table/chart */</div>;
}
```

### Phase 3: Integrate into Dashboard
Add the new widgets to DashboardEnhanced:
- RF Quality Summary card
- Top Applications by Throughput card
- Application Analytics detailed view

---

## Data Structure (Expected)

Based on widget names and typical network analytics:

### RFQI Data Structure (Expected)
```typescript
interface RFQualityData {
  overall: {
    score: number;          // 0-100 quality score
    status: 'excellent' | 'good' | 'fair' | 'poor';
    timestamp: string;
  };
  byBand: {
    '2.4GHz': {
      score: number;
      interference: number;
      channelUtilization: number;
      retryRate: number;
    };
    '5GHz': {
      score: number;
      interference: number;
      channelUtilization: number;
      retryRate: number;
    };
  };
  trends: Array<{
    timestamp: number;
    score: number;
  }>;
}
```

### Application Data Structure (Expected)
```typescript
interface ApplicationData {
  applications: Array<{
    name: string;              // e.g., "Office 365", "Netflix"
    category: string;          // e.g., "Productivity", "Streaming"
    throughput: number;        // bytes/sec
    totalBytes: number;        // total data transferred
    clientCount: number;       // number of users
    sessionCount: number;      // number of sessions/flows
    avgLatency?: number;       // ms
    packetLoss?: number;       // percentage
  }>;
  summary: {
    totalApplications: number;
    totalThroughput: number;
    totalClients: number;
  };
}
```

---

## Next Steps

1. **IMMEDIATE**: Use browser DevTools to capture actual API calls from Campus Controller UI
   - Document exact endpoints
   - Document request/response structures
   - Document authentication headers

2. **SHORT-TERM**: Once endpoint pattern is known:
   - Create `fetchRFQuality()` function in api.ts
   - Create `fetchApplicationAnalytics()` function in api.ts
   - Create `RFQualityWidget` component
   - Create `ApplicationAnalyticsWidget` component

3. **MEDIUM-TERM**: Integration
   - Add widgets to DashboardEnhanced
   - Add to OperationalHealthSummary calculations
   - Include in AnomalyDetector monitoring

4. **LONG-TERM**: Enhanced Features
   - Historical trending for RFQI
   - Application category breakdown
   - Bandwidth allocation recommendations
   - QoS rule suggestions based on app usage

---

## Files for Reference

- **Widget exploration script**: `test-campus-controller.cjs`
- **Widget data fetch attempts**: `fetch-widget-data.cjs`, `fetch-widgets-post.cjs`
- **Widget list (94 widgets)**: `campus-widgets.json`
- **Our existing app fetcher**: `src/components/ApplicationWidgets.tsx`
- **Our widget handler**: `src/components/PerformanceAnalytics.tsx`

---

## Authentication Pattern (Confirmed Working)

```javascript
// 1. Login
POST /management/v1/oauth2/token
Body: {
  "userId": "admin",
  "password": "AHah1232!!*7",
  "grantType": "password"
}
Response: {
  "access_token": "...",
  "refresh_token": "...",
  "token_type": "Bearer"
}

// 2. Authenticated Requests
GET /management/v1/sites/report/widgets
Headers: {
  "Authorization": "Bearer {access_token}"
}
```

---

## Conclusion

The Campus Controller **has** the application and RFQI data we need - it's available through 94 different widgets. The challenge is discovering the correct API endpoint pattern to fetch the actual widget data.

**CRITICAL NEXT ACTION**: Use browser DevTools to capture the live API calls the Campus Controller Angular app makes when displaying the report page. This will reveal the exact endpoint pattern and data structure.
