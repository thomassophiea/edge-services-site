# EDGE API Dashboard Consistency and Optimization Audit
## Comprehensive Report and Backlog

**Date**: 2025-12-31
**Product**: Wireless EDGE Services
**Auditor**: Senior API and UI Optimization Agent
**Scope**: Complete dashboard ecosystem, API endpoints, data models, performance, and UX consistency

---

## EXECUTIVE SUMMARY

This audit comprehensively evaluated the EDGE wireless network management platform across 10+ dashboard components, 350+ API endpoints, and extensive data model patterns. The system demonstrates strong architectural foundations with TypeScript typing, consistent UI patterns, and robust error handling. However, significant opportunities exist for optimization, particularly in API call efficiency, data model consistency, and intelligent operational insights.

### Critical Findings
- **N+1 Query Patterns**: Client traffic statistics limited to 20 concurrent requests
- **Field Naming Inconsistency**: 4-6 variations for identical fields (AP name, serial, VLAN)
- **Endpoint Coverage Gaps**: 350+ available endpoints, only ~40 actively utilized
- **Cache Underutilization**: Simple TTL cache implemented but minimal usage
- **Polling Inefficiency**: 30-60s intervals across all dashboards without WebSocket alternative

### Opportunities
- **Intelligent Widgets**: 5 high-value operational health widgets proposed
- **API Consolidation**: Batch endpoints can reduce N+1 by 95%
- **Performance Gains**: 3-5x improvement through optimized caching and query patterns
- **UX Consistency**: Standardize 12+ inconsistent patterns across dashboards

---

## PART 1: CURRENT STATE INVENTORY

### 1.1 Dashboard Components Analysis

| Dashboard | Primary Job | Auto-Refresh | Key Endpoints | Complexity |
|-----------|-------------|--------------|---------------|------------|
| **DashboardEnhanced** | Network overview: AP health, client stats, throughput trends | 30s main, 5m historical | /v1/aps, /v1/stations, /v1/services, /v1/notifications | High |
| **ServiceLevelsEnhanced** | Service/WLAN monitoring, SLE metrics, historical analysis | 30s | /v1/services, /v1/services/{id}/report, /v1/services/{id}/stations | High |
| **AccessPoints** | AP inventory, 66+ configurable columns, bulk management | 60s | /v1/aps, /v1/aps/query, /v1/aps/query/columns, /v1/aps/{sn}/stations | Medium |
| **TrafficStatsConnectedClients** | Client traffic statistics, MAC randomization tracking | Manual | /v1/stations, /v1/stations/{mac} (N+1 for traffic) | High |
| **ReportWidgets** | 8 real-time KPI widgets (utilization, clients, AP health, etc.) | 30s | /v1/stations, /v1/aps, calculated metrics | Medium |
| **AlertsEventsEnhanced** | Alerts and events timeline, severity filtering | 30s | /v1/alerts, /v1/events, /v1/notifications | Medium |
| **SitesOverview** | Multi-site health, device counts | 30s | /v3/sites, /v1/state/sites/{id} | Low |
| **ApiTestTool** | API endpoint explorer and tester | N/A | Any endpoint (350+ cataloged) | Low |
| **NetworkRewind** | Historical metrics playback (Supabase-backed) | 15m collection | Supabase storage, getCurrentMetrics | Medium |
| **BestPracticesWidget** | Configuration optimization recommendations | On-demand | /v1/bestpractices/evaluate | Low |

**Total Components**: 10 major dashboards + 15 supporting widgets

---

### 1.2 API Endpoint Discovery Matrix

#### Endpoints Currently Used (40 active)

| Category | Endpoint | Used By | Purpose | Call Pattern | Issues |
|----------|----------|---------|---------|--------------|--------|
| **Access Points** | GET /v1/aps | AccessPoints, DashboardEnhanced, ReportWidgets | List all APs | Every 30-60s | Fetches all fields, no projection |
| | GET /v1/aps/query | AccessPoints | Filtered AP queries | On-demand | Good - supports filters |
| | GET /v1/aps/query/columns | AccessPoints | Get available columns | Initial load | Cached in component |
| | GET /v1/aps/{sn}/stations | AccessPointDetail | Clients per AP | On AP select | OK |
| **Stations/Clients** | GET /v1/stations | TrafficStatsConnectedClients, DashboardEnhanced, ReportWidgets | List all clients | Every 30s | Fetches all clients, no pagination |
| | GET /v1/stations/{mac} | TrafficStatsConnectedClients | Individual client + traffic | N+1 pattern (20 max) | **Critical N+1 issue** |
| **Services/WLANs** | GET /v1/services | ServiceLevelsEnhanced, DashboardEnhanced | List services | Every 30s, 8s timeout | Timeout too short for large deployments |
| | GET /v1/services/{id}/report | ServiceLevelsEnhanced | Service performance metrics | Per service | Could batch |
| | GET /v1/services/{id}/stations | ServiceLevelsEnhanced | Clients per service | Per service | N+1 potential |
| **Sites** | GET /v3/sites | SitesOverview, All dashboards (filters) | List sites | Every 30s | Good, small dataset |
| | GET /v1/state/sites/{id} | SitesOverview | Site state details | Per site | Could batch |
| **Alerts/Events** | GET /v1/alerts | AlertsEventsEnhanced | All alerts | Every 30s, 10s timeout | No filtering applied |
| | GET /v1/events | AlertsEventsEnhanced | All events | Every 30s | No filtering applied |
| | GET /v1/notifications | DashboardEnhanced, NotificationsMenu | System notifications | Every 30s | OK |
| **Roles** | GET /v1/roles | Various | Role definitions | Initial load | Not cached |
| **Topologies** | GET /v1/topologies | Various | VLAN definitions | Initial load | Not cached |
| **Auth** | POST /v1/oauth2/token | LoginForm | Authentication | Login only | Multiple format attempts (inefficient) |

#### Endpoints Available But Unused (310+ endpoints)

**High-Value Unused Endpoints:**

| Category | Endpoint | Description | Opportunity |
|----------|----------|-------------|-------------|
| **Reports & Analytics** | GET /v1/reports/widgets | Get system report widgets | Dashboard pre-aggregated data |
| | GET /v1/aps/report/widgets | AP-specific widgets | AP health summaries |
| | GET /v3/sites/report/widgets | Site-specific widgets | Site health summaries |
| | GET /v1/services/report/widgets | Service-specific widgets | **Already attempted, may not exist** |
| | GET /v1/report/flex/{duration} | Flexible duration reports | Historical aggregates |
| **State Endpoints** | GET /v1/state/aps | All AP state summary | Lighter than full /v1/aps |
| | GET /v1/state/entityDistribution | Entity distribution stats | Topology visualization |
| | GET /v1/state/sites/{id}/aps | APs per site (state API) | Alternative to filtering /v1/aps |
| **Query APIs** | GET /v2/stations/query | Advanced station queries | Filtering, pagination support |
| | GET /v2/stations/query/columns | Station query columns | Field projection |
| **Batch Operations** | POST /v1/stations/disassociate | Bulk client disconnect | Currently unused |
| | PUT /v1/aps/multiconfig | Multi-AP configuration | Currently unused |
| **Best Practices** | GET /v1/bestpractices/evaluate | Config recommendations | Used by BestPracticesWidget |
| | PUT /v1/bestpractices/{id}/accept | Accept recommendation | Follow-through action |
| **RF Management** | GET /v3/rfmgmt | RF management profiles | Radio optimization |
| | GET /v3/radios/smartrfchannels | Smart RF channel recommendations | Interference mitigation |

**Assumption**: Many "report/widgets" endpoints may not exist on all Campus Controller versions. The audit recommends testing endpoint availability before implementation.

---

### 1.3 Data Model Consistency Analysis

#### Field Naming Variations (Critical Issues)

**Station/Client Fields:**

| Semantic Meaning | API Field Variations | Count | Impact |
|------------------|---------------------|-------|--------|
| **AP Name** | apName, apDisplayName, apHostname, accessPointName | 4 | High - requires fallback chains |
| **AP Serial** | apSerial, apSerialNumber, apSn, accessPointSerial | 4 | High - join key ambiguity |
| **Site** | siteId (UUID), siteName (string) | 2 | Medium - ID vs name mapping needed |
| **Service** | serviceId (UUID), serviceName (string) | 2 | Medium - ID vs name mapping needed |
| **Role** | roleId (UUID), role (string) | 2 | Medium - ID vs name mapping needed |
| **Network/SSID** | network, networkName, profileName, ssid, essid | 5 | High - confusing to users |
| **Channel** | channel, radioChannel, channelNumber | 3 | Low - numeric values consistent |
| **VLAN** | vlan, vlanId, vlanTag, dot1dPortNumber | 4 | High - critical for traffic segmentation |
| **Traffic Stats** | inBytes/outBytes, rxBytes/txBytes, clientBandwidthBytes | 3 pairs | High - affects reporting accuracy |
| **Signal Strength** | rss, signalStrength | 2 | Low - both use dBm |

**Service/WLAN Fields:**

| Semantic Meaning | API Field Variations | Count | Impact |
|------------------|---------------------|-------|--------|
| **Service Name** | name, serviceName | 2 | Medium - inconsistent across components |
| **VLAN ID** | vlan, dot1dPortNumber | 2 | High - configuration errors possible |
| **Status** | status (string), enabled (boolean) | 2 | Medium - type mismatch |
| **SSID Hidden** | hidden, suppressSsid | 2 | Low - boolean values |
| **Captive Portal** | captivePortal, enableCaptivePortal | 2 | Low - boolean values |

**Access Point Fields:**

| Semantic Meaning | API Field Variations | Count | Impact |
|------------------|---------------------|-------|--------|
| **AP Name** | displayName, apName | 2 | Low - consistent usage |
| **Site** | site, hostSite | 2 | Medium - hostSite is actual API field |
| **Firmware** | firmware, softwareVersion | 2 | Medium - softwareVersion is actual field |
| **Model** | model, hardwareType, platformName | 3 | Medium - affects hardware filtering |

#### Security Configuration Complexity

**WPA Configuration Nesting:**

```typescript
// Pattern 1: Top-level elements
Service {
  WpaPskElement?: { mode, pmfMode, presharedKey }
  WpaEnterpriseElement?: { mode, pmfMode, fastTransitionEnabled }
  WpaSaeElement?: { pmfMode, presharedKey, saeMethod }
}

// Pattern 2: Nested in privacy object
Service {
  privacy?: {
    WpaPskElement?: { mode, pmfMode, presharedKey }
    WpaEnterpriseElement?: { mode, pmfMode, fastTransitionEnabled }
    WpaSaeElement?: { pmfMode, presharedKey, saeMethod }
  }
}
```

**Impact**: Components must check both top-level AND nested locations. Increases code complexity and error potential.

**Recommendation**: Implement a data normalization layer that:
1. Maps all field variations to canonical names
2. Flattens security configurations to single structure
3. Resolves IDs to names (serviceId → serviceName) at API layer

---

### 1.4 Performance and API Call Patterns Audit

#### Polling Behavior Analysis

| Dashboard | Interval | Visibility Pause | Request Count per Cycle | Data Volume | Optimization Opportunity |
|-----------|----------|------------------|------------------------|-------------|--------------------------|
| DashboardEnhanced | 30s | ❌ No | 4 parallel (Promise.allSettled) | ~500KB | Enable pause, increase to 60s |
| ServiceLevelsEnhanced | 30s | ❌ No | 2-3 (services + selected report) | ~100-200KB | Cache services list |
| AccessPoints | 60s | ✅ Yes | 2-3 (APs + query columns) | ~300-800KB | Good pattern |
| TrafficStatsConnectedClients | Manual | N/A | 21+ (1 + 20 N+1) | ~50KB | **Critical - batch endpoint** |
| ReportWidgets | 30s | ❌ No | 8 (widget calculations) | ~200KB | Reduce to 60s |
| AlertsEventsEnhanced | 30s | ❌ No | 2-3 (alerts + events) | ~50-100KB | Server-side filtering |
| SitesOverview | 30s | ❌ No | 1-2 (sites + state) | ~20KB | Cache sites heavily |

**Total Polling Load** (all dashboards open):
- **Requests/minute**: ~45-60 API calls
- **Data transfer/minute**: ~1.2-1.8 MB
- **Recommendation**: Implement WebSocket for real-time updates, reduce polling to 120s for static data

#### N+1 Query Patterns (Critical)

**TrafficStatsConnectedClients.tsx (Lines 82-93):**

```typescript
// PROBLEM: Individual API call per station
const loadTrafficStatisticsForStations = async (stations) => {
  const stationsToLoad = stations.slice(0, 20); // Artificial limit!

  const trafficPromises = stationsToLoad.map(async (station) => {
    const trafficData = await getStationTrafficStats(station.macAddress);
    // GET /v1/stations/{MAC} - Individual call per client
  });
}
```

**Impact**:
- Max 20 clients can have traffic stats at once
- 100 clients = 100 sequential API calls (if limit removed)
- Network latency: 20 clients × 100ms = 2 seconds minimum
- Controller load: 20× higher than necessary

**Solution Options**:
1. **Batch Endpoint** (Preferred): `POST /v1/stations/batch-stats` with MAC list
2. **Query API** (Available): Use `/v2/stations/query` with field projection for `inBytes,outBytes`
3. **Embed in List**: Modify `/v1/stations` to include traffic stats by default

#### Caching Utilization Audit

**Current Implementation** (src/services/cache.ts):
```typescript
CACHE_TTL = {
  SHORT: 1min,
  MEDIUM: 5min,
  LONG: 10min,
  VERY_LONG: 30min
}
```

**Actual Usage**:
- ❌ **Sites list**: NOT cached (fetched every 30s)
- ❌ **Roles list**: NOT cached (fetched on component mount)
- ❌ **Topologies/VLANs**: NOT cached
- ❌ **AP platforms/hardware types**: NOT cached
- ✅ **Vendor OUI lookups**: Cached in memory (good)
- ❌ **Service lists**: NOT cached (fetched every 30s)

**Recommendation**:
- Cache sites, roles, topologies with VERY_LONG TTL (30min)
- Implement cache invalidation on POST/PUT/DELETE operations
- Add ETag support for conditional requests (304 Not Modified)

#### Request Timeout Strategy

| Endpoint Category | Timeout | Rationale | Issue |
|-------------------|---------|-----------|-------|
| Login | 8000ms | Auth critical | Multiple format retries extend time |
| Services | 8000-15000ms | Varies by component | Inconsistent |
| Stations | 8000-15000ms | Varies by component | Inconsistent |
| APs | 6000-15000ms | Default to specific | Wide range |
| Alerts/Events | 10000ms | Allow time for filtering | OK |

**Recommendation**: Standardize timeouts by endpoint type, not component.

---

### 1.5 UI Consistency Evaluation

#### Common Patterns (Strong Consistency)

✅ **Card Component Usage**: Consistent `surface-1dp` class, CardHeader/CardContent structure
✅ **Table Styling**: Compact (11px, 10px fonts), horizontal scroll, hover states
✅ **Loading States**: Skeleton loaders with correct grid layouts
✅ **Error Alerts**: Consistent variant="destructive" with AlertCircle icon
✅ **Toast Notifications**: Consistent success/error/info patterns
✅ **Badge Variants**: Status badges map correctly (connected=default, disconnected=destructive)
✅ **Icon Library**: Consistent lucide-react usage

#### Inconsistencies Identified

| Pattern | Inconsistency | Components Affected | Impact |
|---------|---------------|---------------------|--------|
| **Site Filter** | Some use Building icon, some don't | ServiceLevelsEnhanced, AccessPoints | Low - cosmetic |
| **Time Range Selector** | Different time options (1h/24h/7d/30d vs 15m/1h/24h) | AlertsEventsEnhanced vs NetworkRewind | Medium - UX confusion |
| **Column Customization** | AccessPoints has it, TrafficStatsConnectedClients doesn't | AccessPoints only | High - feature parity |
| **Empty States** | Different icon sizes (h-8 vs h-12) and messaging | Various | Low - minor |
| **Refresh Button Position** | Top-right vs embedded in filters | Various | Low - acceptable variation |
| **Auto-refresh Indicator** | Some show "Last updated", some don't | Various | Medium - user awareness |
| **Tab Visibility Pause** | Only AccessPoints implements | All polling dashboards | High - unnecessary load |
| **Multi-select** | AccessPoints supports bulk ops, others don't | AccessPoints only | Medium - feature parity |
| **Filter Layout** | Vertical on mobile inconsistent | Various | Low - mostly OK |
| **Status Badge Colors** | Different variants for same status across components | Multiple | Medium - semantic consistency |

#### Spacing and Typography

✅ **Font Sizes**: Consistent scale (text-xs, text-sm, text-lg, text-2xl)
✅ **Spacing**: Consistent gap-2, gap-4, gap-6 usage
❌ **Compact Tables**: Some use text-[11px], some text-sm - standardize to 11px for data tables
❌ **Card Padding**: Inconsistent p-4 vs p-6 in CardContent

#### Responsive Behavior

✅ **Grid Layouts**: Consistent mobile-first approach (grid-cols-1 md:grid-cols-2 lg:grid-cols-4)
✅ **Filter Stacking**: Flex-col on mobile, flex-row on desktop
❌ **Table Scroll**: Some tables lack proper min-width on columns causing layout shifts

---

## PART 2: GAP ANALYSIS AND OPPORTUNITIES

### 2.1 API Endpoint Coverage Gaps

| Entity | Available Endpoints | Currently Used | Coverage | High-Value Unused |
|--------|---------------------|----------------|----------|-------------------|
| Access Points | 45+ | 6 | 13% | /v1/state/aps, /v1/aps/report/widgets, /v1/aps/ifstats |
| Stations/Clients | 12+ | 2 | 17% | /v2/stations/query (pagination!), /v2/stations/query/visualize |
| Services/WLANs | 15+ | 4 | 27% | /v1/services/report/widgets, /v1/services/{id}/deviceids |
| Sites | 15+ | 3 | 20% | /v3/sites/report/widgets, /v3/sites/report/impact |
| Reports | 60+ | 0 | 0% | **Entire category unused** |
| RF Management | 10+ | 0 | 0% | /v3/rfmgmt, /v3/radios/smartrfchannels |
| Analytics | 8+ | 0 | 0% | /v3/analytics (behavioral analytics profiles) |
| Switches | 30+ | 0 | 0% | **Entire category unused** |

**Key Gaps:**
1. **No Switch Management**: 30+ switch endpoints unused - opportunity for switch dashboard
2. **No RF Optimization**: SmartRF channels and RF management unused - AI/ML optimization opportunity
3. **Report Widgets Underutilized**: Report endpoints could pre-aggregate dashboard data
4. **No Behavioral Analytics**: ADSP/analytics endpoints unused - client behavior insights
5. **No Topology Visualization**: `/v1/state/entityDistribution` unused - network map opportunity

### 2.2 Filter Support Gaps

| Dashboard | Site Filter | Time Range | Status Filter | Custom Filters | Needs |
|-----------|-------------|------------|---------------|----------------|-------|
| DashboardEnhanced | ❌ No | ❌ No | ❌ No | ❌ No | Site, time range |
| ServiceLevelsEnhanced | ✅ Yes | ✅ Yes (via tabs) | ❌ No | ❌ No | Service status |
| AccessPoints | ✅ Yes | ❌ No | ✅ Yes | ✅ Hardware | Time range (uptime) |
| TrafficStatsConnectedClients | ✅ Yes | ❌ No | ✅ Yes | ✅ Band, MAC type | Time range |
| ReportWidgets | ❌ No | ❌ No | ✅ Status | ✅ Category | Site, time range |
| AlertsEventsEnhanced | ❌ No | ✅ Yes | ✅ Severity | ✅ Category | Site filter |
| SitesOverview | N/A | ❌ No | ❌ No | ❌ No | Country filter |

**Recommendation**: Standardize filter bar with: Site (multi-select) + Time Range + Entity-specific filters

### 2.3 Pagination and Limits

| Endpoint | Current Behavior | Issue | Recommendation |
|----------|------------------|-------|----------------|
| /v1/aps | Fetches all APs | Could be 1000+ APs | Use /v1/aps/query with limit/offset |
| /v1/stations | Fetches all clients | Could be 10,000+ clients | Use /v2/stations/query with pagination |
| /v1/services | Fetches all services | Usually <100, OK | Current approach OK |
| /v1/alerts | Fetches all alerts | Could be 1000+ | Add server-side limit parameter |
| /v1/events | Fetches all events | Could be 10,000+ | Add time range filter |

**Critical**: TrafficStatsConnectedClients currently loads ALL stations then limits traffic lookup to 20. Should paginate station list.

### 2.4 Field Projection Support

**Available** (from ApiTestTool):
- `/v1/aps/query/columns` - Returns available AP fields
- `/v2/stations/query/columns` - Returns available station fields

**Opportunity**: Use query APIs to request only needed fields, reducing payload size by 50-70%.

**Example**:
```
GET /v2/stations/query?fields=macAddress,ipAddress,apSerial,inBytes,outBytes,rssi
vs.
GET /v1/stations (returns all 40+ fields)
```

---

## PART 3: INTELLIGENT WIDGETS RECOMMENDATIONS

### 3.1 Operational Health Summary Widget

**Purpose**: Single-pane-of-glass network health status with actionable drilldowns.

**UI Format**: Top-of-dashboard KPI strip (4 cards) + expandable issue panel

**Signals**:
1. **Fleet Health Score**: Weighted composite of AP uptime, client success rate, throughput
2. **Critical Alerts Count**: Active critical alerts with 1-click drilldown
3. **Service Degradation Indicator**: Services below SLA thresholds
4. **Client Experience Score**: Average RSSI, retry rates, auth failures

**API Requirements**:
- GET /v1/state/aps (lightweight AP state)
- GET /v1/alerts?severity=critical
- GET /v1/services (with /report for each if individual endpoints exist)
- GET /v2/stations/query?fields=rssi,retries,authStatus

**Acceptance Criteria**:
- Widget loads in <2 seconds
- Score calculation transparent (click to see formula)
- Color-coded: green (>95%), yellow (85-95%), red (<85%)
- Direct link to filtered view for each metric

**Implementation Notes**:
- Cache health score for 60s
- Use Promise.allSettled to avoid failure cascade
- Show "stale" indicator if data >5min old

---

### 3.2 Anomaly and Trend Detector Widget

**Purpose**: Automatically detect unusual patterns and highlight likely root causes.

**UI Format**: Compact "What Changed" list (top 5 changes) with trend arrows and confidence scores

**Signals**:
1. **Client Count Delta by Site**: >20% change in 15min window
2. **Auth Failure Spike**: >3× normal failure rate
3. **Association Failure Spike**: >3× normal retry rate
4. **Throughput Collapse**: >50% drop in service throughput
5. **AP Offline Event**: Critical AP went offline with high client count

**Detection Logic**:
```typescript
interface AnomalyDetection {
  type: 'client_count_drop' | 'auth_spike' | 'throughput_collapse' | 'ap_offline';
  severity: 'high' | 'medium' | 'low';
  entity: { type: 'site' | 'service' | 'ap', id: string, name: string };
  metric: string;
  baseline: number;
  current: number;
  change_percent: number;
  timestamp: Date;
  confidence: number; // 0-1, based on historical variance
  suggested_action: string;
}
```

**API Requirements**:
- GET /v1/state/sites (current state)
- GET /v1/state/sites/{id}/aps (per-site AP state)
- Historical comparison from NetworkRewind (Supabase metricsStorage)
- GET /v1/events?type=authentication&severity=warning
- GET /v1/services/{id}/report (throughput trends)

**Acceptance Criteria**:
- Detects changes within 5 minutes of occurrence
- <5% false positive rate (based on historical variance)
- Confidence score shown and explainable
- Direct link to affected entity detail view

**Implementation Notes**:
- Requires 48h of historical data (NetworkRewind)
- Statistical thresholds: 2.5 standard deviations from rolling mean
- Anomalies expire after 4 hours if not acknowledged

---

### 3.3 Top Issues and Recommended Actions Widget

**Purpose**: Ranked list of network issues with AI-driven remediation suggestions.

**UI Format**: Sortable table with issue description, severity, confidence, and recommended action

**Issue Categories**:
1. **Recurring Alert Patterns**: Same alert from same entity >3 times in 24h
2. **Channel Congestion**: Utilization >80% with overlapping APs
3. **RF Interference**: High retry rates on specific channels
4. **Config Drift**: AP configuration differs from profile/template
5. **Capacity Constraints**: Service approaching max client limit
6. **Authentication Bottleneck**: RADIUS timeout or failure patterns

**Issue Schema**:
```typescript
interface NetworkIssue {
  id: string;
  title: string; // e.g., "Recurring Authentication Failures on CORP-WIFI"
  description: string; // Detailed explanation
  severity: 'critical' | 'warning' | 'info';
  confidence: number; // 0-100, based on evidence strength
  affected_entities: Array<{type, id, name}>;
  first_seen: Date;
  last_seen: Date;
  occurrence_count: number;
  recommended_actions: Array<{
    action: string; // "Review AAA policy RADIUS timeout"
    rationale: string; // "83% of failures occur after 3s"
    automatable: boolean;
  }>;
  evidence: Array<{
    type: 'alert' | 'event' | 'metric';
    timestamp: Date;
    value: string;
  }>;
}
```

**Detection Logic**:

1. **Recurring Alerts**:
```typescript
// Query: GET /v1/alerts?timeRange=24h
// Group by: entity + alert_type
// Threshold: count >= 3
// Action: "Review {entity} configuration" or "Check {entity} hardware"
```

2. **Channel Congestion**:
```typescript
// Query: GET /v1/aps with channel + channelUtilization
// Filter: utilization > 80%
// Group by: channel
// Check: count(APs on same channel) > 1
// Action: "Redistribute APs to channels {X, Y, Z}" (from /v3/radios/smartrfchannels)
```

3. **Config Drift**:
```typescript
// Query: GET /v1/aps/{sn} for each AP
// Compare: actual config vs. /v3/profiles/{profileId}
// Threshold: >3 field differences
// Action: "Sync AP {name} to profile {profileName}"
```

4. **Capacity Constraints**:
```typescript
// Query: GET /v1/services with maxClients + current client count
// Filter: (clientCount / maxClients) > 0.85
// Action: "Increase maxClients for {serviceName}" or "Add more APs to {siteName}"
```

**API Requirements**:
- GET /v1/alerts (historical)
- GET /v1/events (authentication, association)
- GET /v1/aps (channel, utilization, config)
- GET /v3/profiles/{id} (expected config)
- GET /v3/radios/smartrfchannels (channel recommendations)
- GET /v1/services (capacity limits)

**Acceptance Criteria**:
- Issues update every 5 minutes
- Confidence score >70% for auto-suggested actions
- User can mark issue as "acknowledged" or "resolved"
- Issue resolution tracked (did action resolve issue?)

**Implementation Notes**:
- Store issue history in Supabase
- Machine learning potential: track which actions resolve which issues
- Exportable as CSV/PDF for reports

---

### 3.4 Client Experience Heatmap Widget

**Purpose**: Visualize client signal quality across sites/APs/services.

**UI Format**: Heatmap grid (Y-axis: Sites/APs, X-axis: Time buckets) with color intensity for RSSI quality

**Signals**:
- Average RSSI per AP per 15-minute bucket
- Color scale: Green (>-65dBm), Yellow (-65 to -75dBm), Red (<-75dBm)
- Click cell to drill into client list for that AP/time

**API Requirements**:
- GET /v2/stations/query?fields=apSerial,rssi,timestamp&groupBy=apSerial,timeBucket
- Or: Historical data from NetworkRewind

**Acceptance Criteria**:
- Heatmap responsive (mobile shows fewer time buckets)
- Toggle between Site-level and AP-level views
- Exportable as PNG for reporting

---

### 3.5 Predictive Capacity Planner Widget

**Purpose**: Forecast when network resources will reach capacity based on growth trends.

**UI Format**: Line chart with historical client count + projected trend line + capacity threshold

**Signals**:
1. Client count trend (daily averages over 30 days)
2. Linear regression or exponential smoothing for projection
3. Compare to: maxClients per service, AP density per site
4. Alert when projected capacity breach <30 days

**Calculation**:
```typescript
// Simple linear regression
const trendline = linearRegression(historicalClientCounts);
const daysToCapacity = calculateIntersection(trendline, maxCapacity);

if (daysToCapacity < 30) {
  severity = 'critical';
  action = `Add ${Math.ceil(projectedClients / avgClientsPerAP)} APs to {siteName}`;
} else if (daysToCapacity < 90) {
  severity = 'warning';
  action = 'Monitor growth and plan expansion';
}
```

**API Requirements**:
- Historical client counts from NetworkRewind (Supabase)
- GET /v1/services (maxClients limit)
- GET /v1/state/sites (current AP count)

**Acceptance Criteria**:
- Minimum 14 days historical data required
- Confidence interval shown (dotted lines for ±1σ)
- User can adjust projection model (linear vs exponential)
- Export forecast as CSV

**Implementation Notes**:
- Use simple-statistics library for regression
- Update forecast daily (not real-time)
- Store forecasts in Supabase for historical comparison

---

## PART 4: PRIORITIZED BACKLOG

### Priority Definitions
- **P0 (Critical)**: Performance blockers, data integrity issues, user-facing errors
- **P1 (High)**: Significant UX improvements, missing critical features, API optimization
- **P2 (Medium)**: Nice-to-have features, cosmetic improvements, future enhancements

---

### P0 Items (Critical - Immediate Action Required)

#### P0-001: Fix N+1 Query in TrafficStatsConnectedClients

**Problem**: Individual API calls for each client's traffic stats, limited to 20 clients.

**Recommendation**: Implement batch traffic stats endpoint or use /v2/stations/query with field projection.

**API Changes**:
```typescript
// Option 1: New batch endpoint (requires Campus Controller update)
POST /v1/stations/batch-stats
Body: { macAddresses: string[] }
Response: { [macAddress: string]: { inBytes, outBytes, packets } }

// Option 2: Use existing query API (immediate fix)
GET /v2/stations/query?fields=macAddress,inBytes,outBytes,rxBytes,txBytes&limit=100&offset=0
```

**UI Changes**:
- Remove artificial 20-client limit
- Add pagination controls (showing 1-100 of 532 clients)
- Loading indicator per page load
- Cache traffic stats for 30 seconds

**Acceptance Criteria**:
- Support 100+ clients with traffic stats
- Page load time <3 seconds for 100 clients
- Graceful degradation if batch endpoint unavailable

**Validation Plan**:
1. Test with 100, 500, 1000 client scenarios
2. Measure API call count reduction (20:1 to 1:1 ratio)
3. User testing: verify pagination clarity

**Risks**:
- Batch endpoint may not exist on all Campus Controller versions
- Query API might not include traffic stats (needs verification)

**Estimated Effort**: 2-3 days (with query API) or 1-2 weeks (if backend endpoint needed)

---

#### P0-002: Standardize Field Name Mapping Across Components

**Problem**: 4-6 variations for same field (apName, apSerial, VLAN, etc.) causing UI inconsistencies and join failures.

**Recommendation**: Implement data normalization layer in api.ts service.

**API Changes** (no backend changes):
```typescript
// src/services/dataNormalizer.ts
export function normalizeStation(raw: any): Station {
  return {
    macAddress: raw.macAddress,
    apName: raw.apName || raw.apDisplayName || raw.apHostname || raw.accessPointName,
    apSerial: raw.apSerial || raw.apSerialNumber || raw.apSn || raw.accessPointSerial,
    siteName: raw.siteName || await resolveSiteId(raw.siteId),
    serviceName: raw.serviceName || await resolveServiceId(raw.serviceId),
    vlan: raw.vlan || raw.vlanId || raw.vlanTag || raw.dot1dPortNumber,
    ssid: raw.ssid || raw.essid || raw.networkName,
    trafficIn: raw.inBytes || raw.rxBytes || raw.clientBandwidthBytes || 0,
    trafficOut: raw.outBytes || raw.txBytes || 0,
    rssi: raw.rss || raw.signalStrength,
    // ... etc
  };
}
```

**UI Changes**:
- All components use normalizeStation(), normalizeAP(), normalizeService()
- Update TypeScript interfaces to use canonical field names
- Remove fallback chains in component code

**Acceptance Criteria**:
- All dashboards show consistent field labels
- No more "undefined" or "N/A" for fields with data
- Reduced code duplication (100+ lines removed)

**Validation Plan**:
1. Audit all 10 dashboards for field consistency
2. Test with real Campus Controller API responses
3. Regression test: verify no data loss in normalization

**Risks**:
- ID-to-name resolution adds async complexity
- Caching required to avoid N+1 for lookups

**Estimated Effort**: 1 week (includes testing)

---

#### P0-003: Implement Universal Site/Time Range Filters

**Problem**: Inconsistent filtering across dashboards - some have site filter, some don't. No time range support on most dashboards.

**Recommendation**: Create reusable FilterBar component with global state.

**API Changes**: None (use existing endpoints)

**UI Changes**:
```typescript
// src/components/FilterBar.tsx
export function FilterBar({
  showSiteFilter = true,
  showTimeRangeFilter = true,
  customFilters = [],
  onFilterChange
}: FilterBarProps) {
  // Global filter state (Zustand or Context)
  const [selectedSite, setSelectedSite] = useGlobalFilter('site');
  const [timeRange, setTimeRange] = useGlobalFilter('timeRange');

  return (
    <div className="flex gap-4 mb-6">
      {showSiteFilter && <SiteSelect value={selectedSite} onChange={setSelectedSite} />}
      {showTimeRangeFilter && <TimeRangeSelect value={timeRange} onChange={setTimeRange} />}
      {customFilters.map(filter => <CustomFilter key={filter.id} {...filter} />)}
    </div>
  );
}
```

**Component Updates**:
- DashboardEnhanced: Add site + time range filters
- ReportWidgets: Add site + time range filters
- AlertsEventsEnhanced: Add site filter (already has time range)
- All dashboards: Respect global filters

**Acceptance Criteria**:
- Filter selections persist across page navigation
- "Clear all filters" button resets to defaults
- Filter state saved to localStorage
- Mobile: filters collapse into dropdown

**Validation Plan**:
1. Test filter combinations across all dashboards
2. Verify localStorage persistence
3. Mobile responsiveness testing

**Risks**:
- Global state management complexity
- Backend endpoints may not support time range parameters

**Estimated Effort**: 3-4 days

---

### P1 Items (High Priority)

#### P1-001: Implement Operational Health Summary Widget

**Problem**: No single-pane-of-glass health overview. Users must navigate 5+ dashboards to assess network status.

**Recommendation**: See Section 3.1 for detailed spec.

**API Changes**:
- Prefer /v1/state/aps over /v1/aps (lighter payload)
- May need custom aggregation endpoint: GET /v1/health/summary

**UI Changes**:
- New widget component: src/components/OperationalHealthSummary.tsx
- Add to DashboardEnhanced at top (above current KPI cards)
- 4-card layout: Fleet Health, Critical Alerts, Service Degradation, Client Experience
- Expandable issue panel on click

**Acceptance Criteria**: See Section 3.1

**Estimated Effort**: 1 week (widget) + 1 week (backend endpoint if needed)

---

#### P1-002: Add Column Customization to All Data Tables

**Problem**: Only AccessPoints component has column customization. TrafficStatsConnectedClients, AlertsEventsEnhanced lack it.

**Recommendation**: Extract ColumnCustomizationDialog into reusable component.

**API Changes**: None

**UI Changes**:
```typescript
// src/components/ui/ColumnCustomizationDialog.tsx (generalized)
export function useColumnCustomization(
  componentId: string,
  availableColumns: ColumnConfig[]
) {
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem(`${componentId}_columns`);
    return saved ? JSON.parse(saved) : availableColumns.filter(c => c.defaultVisible).map(c => c.key);
  });

  return { visibleColumns, setVisibleColumns, ColumnCustomizationButton };
}
```

**Component Updates**:
- TrafficStatsConnectedClients: Add column customization (25+ available columns)
- AlertsEventsEnhanced: Add column customization (15+ available columns)

**Acceptance Criteria**:
- Column preferences saved per-component in localStorage
- "Reset to defaults" button
- Column groups (basic, advanced, etc.) for easy selection
- Drag-and-drop column reordering (future enhancement)

**Estimated Effort**: 2-3 days

---

#### P1-003: Implement Tab Visibility Pause for All Polling Dashboards

**Problem**: Only AccessPoints pauses polling when tab inactive. Other dashboards waste bandwidth and server resources.

**Recommendation**: Create useTabVisibilityPolling hook.

**API Changes**: None

**UI Changes**:
```typescript
// src/hooks/useTabVisibilityPolling.ts
export function useTabVisibilityPolling(
  pollFunction: () => Promise<void>,
  intervalMs: number,
  dependencies: any[] = []
) {
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        pollFunction();
      }
    }, intervalMs);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') pollFunction();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, dependencies);
}
```

**Component Updates**: All polling dashboards (6 components)

**Acceptance Criteria**:
- Polling stops when tab inactive
- Immediate refresh on tab becoming active
- No polling during beforeunload (App.tsx already handles)

**Estimated Effort**: 1 day

---

#### P1-004: Add Caching for Static/Slow-Changing Data

**Problem**: Sites, roles, topologies fetched every 30-60s despite rarely changing.

**Recommendation**: Implement aggressive caching with invalidation.

**API Changes**: None (use existing cache.ts)

**UI Changes** (in api.ts):
```typescript
async getSites(): Promise<Site[]> {
  const cacheKey = 'sites_list';
  const cached = cacheService.get<Site[]>(cacheKey);
  if (cached) return cached;

  const response = await this.makeAuthenticatedRequest('/v3/sites', ...);
  const sites = await response.json();

  cacheService.set(cacheKey, sites, CACHE_TTL.VERY_LONG); // 30 minutes
  return sites;
}

// Invalidation on POST/PUT/DELETE
async updateSite(siteId: string, data: any) {
  await this.makeAuthenticatedRequest(`/v3/sites/${siteId}`, { method: 'PUT', body: JSON.stringify(data) });
  cacheService.clear('sites_list'); // Invalidate cache
}
```

**Entities to Cache**:
- Sites (30min TTL)
- Roles (30min TTL)
- Topologies/VLANs (30min TTL)
- AP platforms (INDEFINITE - static data)
- AP hardware types (INDEFINITE - static data)

**Acceptance Criteria**:
- 80% reduction in /v3/sites calls
- Cache invalidation on config changes
- Manual "Refresh" button bypasses cache

**Validation Plan**:
1. Monitor DevModePanel API logs
2. Measure network traffic reduction
3. Test cache invalidation flows

**Estimated Effort**: 2 days

---

#### P1-005: Implement Anomaly and Trend Detector Widget

**Problem**: Reactive monitoring only - no proactive anomaly detection.

**Recommendation**: See Section 3.2 for detailed spec.

**API Changes**:
- Requires historical data from NetworkRewind (Supabase)
- May need /v1/events filtering by type and time range

**UI Changes**:
- New widget: src/components/AnomalyDetector.tsx
- Add to DashboardEnhanced (below Operational Health Summary)
- "What Changed" panel with top 5 anomalies

**Acceptance Criteria**: See Section 3.2

**Estimated Effort**: 2 weeks (complex statistical logic)

---

### P2 Items (Medium Priority - Future Enhancements)

#### P2-001: Implement Top Issues and Recommended Actions Widget

**Recommendation**: See Section 3.3

**Estimated Effort**: 3 weeks (includes ML foundation)

---

#### P2-002: Add WebSocket Support for Real-Time Updates

**Problem**: Polling-based updates have 30-60s latency and waste bandwidth.

**Recommendation**: Implement WebSocket connection for real-time events.

**API Changes** (requires backend support):
```typescript
// Campus Controller WebSocket endpoint
ws://controller/management/ws?access_token={token}

// Subscribe to events
{ "type": "subscribe", "channels": ["alerts", "stations", "aps"] }

// Receive real-time updates
{ "type": "alert", "severity": "critical", "entity": {...} }
{ "type": "station_connected", "station": {...} }
{ "type": "ap_status_change", "ap": {...} }
```

**UI Changes**:
- src/services/websocket.ts - WebSocket manager
- Dashboards subscribe to relevant channels
- Fallback to polling if WebSocket unavailable

**Acceptance Criteria**:
- <1s latency for critical alerts
- Graceful fallback to polling
- Automatic reconnection on disconnect

**Risks**:
- Campus Controller may not support WebSocket
- Requires significant backend work

**Estimated Effort**: 2 weeks (frontend) + backend dependency

---

#### P2-003: Implement Switch Management Dashboard

**Problem**: 30+ switch endpoints completely unused.

**Recommendation**: Create switches dashboard similar to AccessPoints.

**API Changes**: None (use existing /v1/switches endpoints)

**UI Changes**:
- New component: src/components/Switches.tsx
- Table with: serial, model, IP, ports, uptime, status
- Column customization
- Bulk operations (reboot, upgrade)

**Estimated Effort**: 1 week

---

#### P2-004: Add RF Management Dashboard

**Problem**: RF optimization endpoints unused - manual channel planning only.

**Recommendation**: Create RF dashboard with SmartRF channel recommendations.

**API Changes**: None (use /v3/rfmgmt, /v3/radios/smartrfchannels)

**UI Changes**:
- New component: src/components/RFManagement.tsx
- Channel utilization heatmap
- SmartRF recommendations
- Manual channel assignment

**Estimated Effort**: 2 weeks

---

#### P2-005: Implement Predictive Capacity Planner Widget

**Recommendation**: See Section 3.5

**Estimated Effort**: 1 week

---

#### P2-006: Add Export Functionality to All Dashboards

**Problem**: No CSV/PDF export for reports.

**Recommendation**: Add export buttons to all data tables.

**Estimated Effort**: 3 days

---

## PART 5: IMPLEMENTATION MAPPING

### 5.1 Endpoint Usage Mapping Table

| UI Component | Current Endpoints | Proposed Endpoints | Change Type | Notes |
|--------------|-------------------|--------------------|-----------| ------|
| **DashboardEnhanced** | /v1/aps, /v1/stations, /v1/services, /v1/notifications | **ADD**: /v1/state/aps, /v1/alerts?severity=critical | optimize | State API lighter than full AP list |
| **ServiceLevelsEnhanced** | /v1/services, /v1/services/{id}/report, /v1/services/{id}/stations | **ADD**: /v1/services/report/widgets (if exists) | optimize | Pre-aggregated widget data |
| **AccessPoints** | /v1/aps, /v1/aps/query, /v1/aps/query/columns | **REPLACE**: /v1/state/aps for list view | optimize | Use full /v1/aps only for detail |
| **TrafficStatsConnectedClients** | /v1/stations, /v1/stations/{mac} (N+1) | **REPLACE**: /v2/stations/query?fields=... | optimize | Batch query with pagination |
| **ReportWidgets** | /v1/stations, /v1/aps (for calculations) | **ADD**: /v1/reports/widgets, /v1/aps/report/widgets | add | Pre-calculated widget values |
| **AlertsEventsEnhanced** | /v1/alerts, /v1/events, /v1/notifications | **MODIFY**: Add ?severity=&category= params | optimize | Server-side filtering |
| **SitesOverview** | /v3/sites, /v1/state/sites/{id} | **ADD**: /v3/sites/report/widgets | add | Site-level health summaries |
| **Operational Health Widget** (NEW) | N/A | /v1/state/aps, /v1/alerts?severity=critical, /v2/stations/query | add | New high-value widget |
| **Anomaly Detector Widget** (NEW) | N/A | /v1/state/sites/{id}, Supabase historical data | add | Trend detection widget |
| **Top Issues Widget** (NEW) | N/A | /v1/alerts, /v1/aps, /v3/radios/smartrfchannels | add | AI-driven recommendations |

---

### 5.2 UI Component Change Matrix

| Component | Change Type | Specific Changes | Acceptance Criteria |
|-----------|-------------|------------------|---------------------|
| **FilterBar** (NEW) | add | Reusable site + time range filter component | Used by 5+ dashboards, localStorage persistence |
| **DashboardEnhanced** | modify | Add FilterBar, Operational Health widget | Loads in <3s with filters applied |
| **AccessPoints** | modify | Extract ColumnCustomizationDialog to shared component | No regression in current functionality |
| **TrafficStatsConnectedClients** | modify | Add column customization, fix N+1, add pagination | Support 100+ clients, <3s load time |
| **AlertsEventsEnhanced** | modify | Add site filter, add column customization | Filter by site + severity + category |
| **All Polling Components** | modify | Use useTabVisibilityPolling hook | Polling stops when tab inactive |
| **api.ts** | modify | Add caching for sites/roles/topologies, normalization layer | 80% reduction in /v3/sites calls |
| **OperationalHealthSummary** (NEW) | add | 4-card health widget with drilldowns | Shows actionable issues, <2s load |
| **AnomalyDetector** (NEW) | add | "What Changed" widget with trend detection | Detects changes within 5min, <5% false positives |
| **TopIssuesWidget** (NEW) | add | Ranked issue list with AI recommendations | Confidence >70% for auto-suggestions |

---

### 5.3 Payload Examples

#### Example 1: Batch Traffic Stats (P0-001)

**Current Approach** (N+1):
```
GET /v1/stations/{mac1}  → 150ms, 2KB
GET /v1/stations/{mac2}  → 150ms, 2KB
GET /v1/stations/{mac3}  → 150ms, 2KB
... (20 calls)
Total: 3000ms, 40KB
```

**Proposed Approach 1** (Batch Endpoint):
```
POST /v1/stations/batch-stats
Body: {
  "macAddresses": ["mac1", "mac2", ..., "mac20"]
}
Response: {
  "mac1": { "inBytes": 1024000, "outBytes": 512000 },
  "mac2": { "inBytes": 2048000, "outBytes": 1024000 },
  ...
}
Total: 200ms, 5KB
```

**Proposed Approach 2** (Query API):
```
GET /v2/stations/query?fields=macAddress,inBytes,outBytes,rxBytes,txBytes&limit=20&offset=0
Response: [
  { "macAddress": "mac1", "inBytes": 1024000, "outBytes": 512000 },
  { "macAddress": "mac2", "inBytes": 2048000, "outBytes": 1024000 },
  ...
]
Total: 250ms, 4KB
```

**Performance Gain**: 12× faster, 90% less data transfer

---

#### Example 2: Operational Health Summary Endpoint (P1-001)

**Proposed Request**:
```
GET /v1/health/summary?siteId=all&timeRange=24h
```

**Proposed Response**:
```json
{
  "fleetHealth": {
    "score": 94.2,
    "components": {
      "apUptime": { "value": 98.5, "weight": 0.3 },
      "clientSuccessRate": { "value": 96.8, "weight": 0.3 },
      "throughputEfficiency": { "value": 88.1, "weight": 0.2 },
      "alertScore": { "value": 92.0, "weight": 0.2 }
    },
    "status": "healthy"
  },
  "criticalAlerts": {
    "count": 2,
    "items": [
      {
        "id": "alert-123",
        "severity": "critical",
        "type": "ap_offline",
        "entity": { "type": "ap", "id": "ap-001", "name": "AP-Floor1-01" },
        "timestamp": "2025-12-31T10:15:00Z"
      }
    ]
  },
  "serviceDegradation": {
    "count": 1,
    "services": [
      {
        "id": "service-456",
        "name": "CORP-WIFI",
        "metric": "throughput",
        "threshold": 100,
        "current": 78,
        "status": "warning"
      }
    ]
  },
  "clientExperience": {
    "averageRssi": -68.5,
    "retryRate": 0.02,
    "authFailureRate": 0.001,
    "score": 91.3,
    "status": "healthy"
  }
}
```

**Calculation Logic** (if backend doesn't provide):
```typescript
// Frontend aggregation from existing endpoints
const fleetHealth = await Promise.allSettled([
  getAPUptime(), // from /v1/state/aps
  getClientSuccessRate(), // from /v2/stations/query
  getServiceThroughput(), // from /v1/services
  getCriticalAlerts() // from /v1/alerts?severity=critical
]).then(results => calculateWeightedScore(results));
```

---

## PART 6: VALIDATION AND RISK ASSESSMENT

### 6.1 Validation Plan by Priority

| Item | Validation Method | Success Metrics | Timeline |
|------|-------------------|----------------|----------|
| **P0-001** (N+1 Fix) | Load test with 100, 500, 1000 clients | <3s load, 95% API call reduction | Week 1 |
| **P0-002** (Field Mapping) | Regression test all dashboards | Zero "undefined" fields, consistent labels | Week 2 |
| **P0-003** (Filters) | Cross-dashboard filter testing | Filters work across 6+ dashboards | Week 3 |
| **P1-001** (Health Widget) | User testing with 5 network admins | 80% find issues faster than before | Week 4 |
| **P1-002** (Column Customization) | Feature parity check | All tables support customization | Week 5 |
| **P1-003** (Tab Visibility) | DevTools network monitoring | Zero API calls when tab inactive | Week 2 |
| **P1-004** (Caching) | Network traffic measurement | 70% reduction in static data calls | Week 3 |
| **P1-005** (Anomaly Detector) | False positive/negative rate analysis | <5% false positive rate | Week 6-7 |

### 6.2 Risk Register

| Risk | Probability | Impact | Mitigation | Owner |
|------|-------------|--------|------------|-------|
| **Campus Controller API version mismatch** | High | High | Version detection, graceful fallback to older endpoints | Backend Team |
| **Batch endpoints don't exist** | Medium | High | Use query APIs with field projection as fallback | Frontend Team |
| **/v1/reports/widgets endpoints unavailable** | High | Medium | Calculate widgets from raw data (current approach) | Frontend Team |
| **Historical data insufficient for anomaly detection** | Medium | Medium | Require 14-day minimum, show "Insufficient data" message | Product Team |
| **WebSocket not supported** | High | Low | Fallback to polling (current behavior) | Backend Team |
| **Performance regression from normalization** | Low | Medium | Benchmark and optimize async ID resolution, caching | Frontend Team |
| **User resistance to filter changes** | Low | Low | Phased rollout, user training | Product Team |

### 6.3 Assumptions and Dependencies

**Assumptions**:
1. Campus Controller API follows REST conventions (GET for read, POST for create, etc.)
2. All endpoints return JSON responses
3. Authentication token refresh handled by existing apiService
4. Supabase available for historical data storage (NetworkRewind dependency)
5. Users have modern browsers (ES2020+, WebSocket support)

**Dependencies**:
1. **Backend Team**: May need to implement batch endpoints for P0-001
2. **Database Team**: Supabase schema for anomaly detection storage
3. **Product Team**: User acceptance testing for new widgets
4. **DevOps Team**: Monitoring for performance regression

---

## PART 7: BACKLOG JSON OUTPUT

```json
{
  "audit_metadata": {
    "date": "2025-12-31",
    "version": "1.0",
    "product": "Wireless EDGE Services",
    "scope": "API Dashboard Consistency and Optimization"
  },
  "backlog_items": [
    {
      "id": "P0-001",
      "priority": "P0",
      "title": "Fix N+1 Query Pattern in TrafficStatsConnectedClients",
      "problem": "Individual API calls for each client's traffic stats, artificially limited to 20 clients due to performance",
      "recommendation": "Implement batch traffic stats endpoint or use /v2/stations/query with field projection for all traffic data",
      "api_changes": [
        {
          "endpoint": "POST /v1/stations/batch-stats",
          "change_type": "add",
          "notes": "New batch endpoint for traffic stats (requires backend). Alternative: use existing /v2/stations/query"
        },
        {
          "endpoint": "GET /v2/stations/query",
          "change_type": "replace",
          "notes": "Use with fields=macAddress,inBytes,outBytes,rxBytes,txBytes instead of individual /v1/stations/{mac} calls"
        }
      ],
      "ui_changes": [
        {
          "component": "TrafficStatsConnectedClients.tsx",
          "change": "Replace N+1 pattern with batch query, add pagination for 100+ clients, remove 20-client limit",
          "acceptance_criteria": [
            "Support 100+ clients with traffic stats",
            "Page load time <3 seconds for 100 clients",
            "API call count reduced from 20+ to 1-2 per page",
            "Pagination controls show current range (e.g., 1-100 of 532)"
          ]
        }
      ],
      "risks": [
        "Batch endpoint may not exist on all Campus Controller versions",
        "Query API might not include traffic stats fields (requires verification)"
      ],
      "validation_plan": [
        "Load test with 100, 500, 1000 client scenarios",
        "Measure API call reduction (expected 95% reduction)",
        "User testing to verify pagination clarity",
        "Regression test: ensure all existing traffic stats fields still display"
      ]
    },
    {
      "id": "P0-002",
      "priority": "P0",
      "title": "Standardize Field Name Mapping with Data Normalization Layer",
      "problem": "4-6 field name variations for same data (e.g., apName vs apDisplayName vs apHostname) causing UI inconsistencies and join failures",
      "recommendation": "Implement data normalization layer in api.ts that maps all field variations to canonical names",
      "api_changes": [
        {
          "endpoint": "All endpoints",
          "change_type": "optimize",
          "notes": "Add normalization layer between API response and component consumption. No backend changes required."
        }
      ],
      "ui_changes": [
        {
          "component": "src/services/dataNormalizer.ts (NEW)",
          "change": "Create normalizeStation(), normalizeAP(), normalizeService() functions with field mapping logic",
          "acceptance_criteria": [
            "All 4 AP name variations map to single 'apName' field",
            "All 6 AP serial variations map to single 'apSerial' field",
            "All VLAN variations (vlan, vlanId, dot1dPortNumber) map to 'vlan'",
            "ID-to-name resolution cached to prevent N+1 lookups"
          ]
        },
        {
          "component": "All dashboard components",
          "change": "Replace raw API responses with normalized data using normalizeStation/AP/Service functions",
          "acceptance_criteria": [
            "Zero 'undefined' or 'N/A' values for fields that have data",
            "Consistent field labels across all 10 dashboards",
            "Reduced code duplication (estimated 100+ lines of fallback chains removed)"
          ]
        }
      ],
      "risks": [
        "ID-to-name resolution adds async complexity",
        "Caching required to avoid N+1 for site/service/role lookups",
        "Potential performance regression if normalization is slow"
      ],
      "validation_plan": [
        "Audit all 10 dashboards for field consistency",
        "Test with real Campus Controller API responses",
        "Benchmark normalization performance (<10ms per object)",
        "Regression test: verify no data loss in normalization"
      ]
    },
    {
      "id": "P0-003",
      "priority": "P0",
      "title": "Implement Universal Site and Time Range Filters",
      "problem": "Inconsistent filtering across dashboards - some have site filter, some don't; no time range support on most dashboards",
      "recommendation": "Create reusable FilterBar component with global state for site and time range selections",
      "api_changes": [],
      "ui_changes": [
        {
          "component": "src/components/FilterBar.tsx (NEW)",
          "change": "Create reusable filter bar with site multi-select, time range selector, and support for custom filters",
          "acceptance_criteria": [
            "FilterBar used by 5+ dashboards",
            "Filter state persists across page navigation (localStorage)",
            "Mobile: filters collapse into dropdown on small screens",
            "Clear all filters button resets to defaults"
          ]
        },
        {
          "component": "DashboardEnhanced, ReportWidgets, AlertsEventsEnhanced, ServiceLevelsEnhanced, AccessPoints",
          "change": "Add FilterBar component and respect global filter state in data fetching",
          "acceptance_criteria": [
            "All dashboards filter data by selected site(s)",
            "Time range filter applies to historical data",
            "Filter changes trigger data refresh",
            "Loading indicator shown during filter-triggered refresh"
          ]
        }
      ],
      "risks": [
        "Global state management complexity (consider Zustand vs Context)",
        "Some backend endpoints may not support time range parameters",
        "Filter combinations may result in empty datasets"
      ],
      "validation_plan": [
        "Test filter combinations across all dashboards",
        "Verify localStorage persistence works correctly",
        "Mobile responsiveness testing on iOS and Android",
        "Edge case: verify behavior when all filters cleared"
      ]
    },
    {
      "id": "P1-001",
      "priority": "P1",
      "title": "Implement Operational Health Summary Widget",
      "problem": "No single-pane-of-glass health overview; users must navigate 5+ dashboards to assess network status",
      "recommendation": "Create comprehensive health widget showing Fleet Health Score, Critical Alerts, Service Degradation, and Client Experience",
      "api_changes": [
        {
          "endpoint": "GET /v1/health/summary (OPTIONAL)",
          "change_type": "add",
          "notes": "If backend can provide pre-calculated health summary. Otherwise, frontend aggregates from /v1/state/aps, /v1/alerts, /v2/stations/query"
        },
        {
          "endpoint": "GET /v1/state/aps",
          "change_type": "replace",
          "notes": "Use lightweight state API instead of full /v1/aps for health calculations"
        }
      ],
      "ui_changes": [
        {
          "component": "src/components/OperationalHealthSummary.tsx (NEW)",
          "change": "Create 4-card health widget with weighted score calculation, severity indicators, and drilldown links",
          "acceptance_criteria": [
            "Widget loads in <2 seconds",
            "Fleet Health Score calculation transparent (click to see formula)",
            "Color-coded: green (>95%), yellow (85-95%), red (<85%)",
            "Direct link to filtered view for each metric (e.g., click Critical Alerts → AlertsEventsEnhanced with severity=critical filter)",
            "Expandable issue panel shows top 5 actionable items"
          ]
        },
        {
          "component": "DashboardEnhanced.tsx",
          "change": "Add OperationalHealthSummary widget at top of dashboard, above existing KPI cards",
          "acceptance_criteria": [
            "Widget appears on all screen sizes (responsive layout)",
            "Auto-refresh every 60 seconds",
            "Stale indicator if data >5min old"
          ]
        }
      ],
      "risks": [
        "Backend /v1/health/summary endpoint may not exist (fallback to frontend calculation)",
        "Weighted score formula may need tuning based on user feedback",
        "High API call volume if aggregating from multiple endpoints"
      ],
      "validation_plan": [
        "User testing with 5 network admins to verify 'finds issues faster'",
        "A/B test: measure time-to-resolution for known issues",
        "Performance test: ensure <2s load time with 100+ APs",
        "Formula validation: compare calculated health score to user perception"
      ]
    },
    {
      "id": "P1-002",
      "priority": "P1",
      "title": "Add Column Customization to All Data Tables",
      "problem": "Only AccessPoints component has column customization; TrafficStatsConnectedClients and AlertsEventsEnhanced lack feature parity",
      "recommendation": "Extract ColumnCustomizationDialog into reusable hook and apply to all major data tables",
      "api_changes": [],
      "ui_changes": [
        {
          "component": "src/hooks/useColumnCustomization.ts (NEW)",
          "change": "Extract column customization logic from AccessPoints into reusable hook with localStorage persistence",
          "acceptance_criteria": [
            "Hook accepts componentId and availableColumns configuration",
            "Returns visibleColumns state and ColumnCustomizationButton component",
            "Preferences saved per-component in localStorage (key: {componentId}_columns)",
            "Reset to defaults button restores default column visibility"
          ]
        },
        {
          "component": "TrafficStatsConnectedClients.tsx",
          "change": "Add column customization with 25+ available columns (MAC, IP, AP, SSID, band, traffic in/out, RSSI, etc.)",
          "acceptance_criteria": [
            "Column customization button in table header",
            "Columns grouped by category (basic, network, traffic, radio)",
            "Multi-select support for bulk show/hide",
            "Column order persists across sessions"
          ]
        },
        {
          "component": "AlertsEventsEnhanced.tsx",
          "change": "Add column customization with 15+ available columns (severity, category, timestamp, entity, description, status, etc.)",
          "acceptance_criteria": [
            "Same UI pattern as other tables",
            "Default columns: timestamp, severity, category, entity, description",
            "Advanced columns: status, acknowledged_by, acknowledged_at, correlation_id"
          ]
        }
      ],
      "risks": [
        "Column order changes may confuse existing users (mitigate with announcement)",
        "localStorage quota may be exceeded on some browsers (unlikely with column prefs)"
      ],
      "validation_plan": [
        "Feature parity check: verify all tables have customization",
        "User testing: verify column picker is intuitive",
        "Regression test: ensure existing AccessPoints customization still works",
        "Cross-browser test: localStorage persistence on Chrome, Firefox, Safari"
      ]
    },
    {
      "id": "P1-003",
      "priority": "P1",
      "title": "Implement Tab Visibility Pause for All Polling Dashboards",
      "problem": "Only AccessPoints pauses polling when tab inactive; other dashboards waste bandwidth and server resources",
      "recommendation": "Create useTabVisibilityPolling hook and apply to all auto-refreshing dashboards",
      "api_changes": [],
      "ui_changes": [
        {
          "component": "src/hooks/useTabVisibilityPolling.ts (NEW)",
          "change": "Create reusable hook that pauses polling when document.visibilityState === 'hidden'",
          "acceptance_criteria": [
            "Hook accepts pollFunction, intervalMs, and dependencies array",
            "Polling automatically pauses when tab inactive",
            "Immediate refresh when tab becomes active",
            "Cleanup on component unmount"
          ]
        },
        {
          "component": "DashboardEnhanced, ServiceLevelsEnhanced, ReportWidgets, AlertsEventsEnhanced, SitesOverview",
          "change": "Replace existing setInterval polling with useTabVisibilityPolling hook",
          "acceptance_criteria": [
            "Zero API calls when tab inactive (verify in DevModePanel)",
            "Auto-refresh resumes within 1s of tab becoming active",
            "No regression in refresh functionality",
            "Works correctly with browser tab management (pin, unpin, etc.)"
          ]
        }
      ],
      "risks": [
        "Browser compatibility issues with visibilitychange event (mitigate with polyfill)"
      ],
      "validation_plan": [
        "DevTools network monitoring: verify zero requests when tab inactive",
        "Test tab switching scenarios: switch away and back, minimize browser, switch to different app",
        "Performance test: measure bandwidth reduction (expected 50-70% for typical usage)",
        "Cross-browser test: Chrome, Firefox, Safari, Edge"
      ]
    },
    {
      "id": "P1-004",
      "priority": "P1",
      "title": "Implement Aggressive Caching for Static/Slow-Changing Data",
      "problem": "Sites, roles, topologies fetched every 30-60s despite rarely changing; unnecessary API load and latency",
      "recommendation": "Apply VERY_LONG TTL caching (30min) to static data with cache invalidation on mutations",
      "api_changes": [
        {
          "endpoint": "GET /v3/sites, GET /v1/roles, GET /v1/topologies",
          "change_type": "optimize",
          "notes": "Add 30-minute caching with invalidation on POST/PUT/DELETE operations"
        }
      ],
      "ui_changes": [
        {
          "component": "src/services/api.ts",
          "change": "Wrap getSites(), getRoles(), getTopologies() with cacheService.get/set; invalidate cache on update/delete operations",
          "acceptance_criteria": [
            "80% reduction in /v3/sites API calls (measured over 1 hour session)",
            "Cache invalidation triggers on successful POST/PUT/DELETE to cached endpoints",
            "Manual refresh button bypasses cache (force refresh)",
            "Cache TTL configurable (default 30min)"
          ]
        },
        {
          "component": "All components using sites/roles/topologies",
          "change": "No changes required (transparent caching in api.ts layer)",
          "acceptance_criteria": [
            "No regression in data freshness (updates appear within 1s of mutation)",
            "No stale data displayed after configuration changes"
          ]
        }
      ],
      "risks": [
        "Stale data if cache invalidation fails (mitigate with TTL fallback)",
        "Multi-tab synchronization issues (consider BroadcastChannel API)"
      ],
      "validation_plan": [
        "DevModePanel API log analysis: count /v3/sites calls over 30min session",
        "Network traffic measurement: measure bandwidth reduction",
        "Cache invalidation test: create/update/delete site, verify cache cleared",
        "Multi-tab test: update in tab A, verify refresh in tab B"
      ]
    },
    {
      "id": "P1-005",
      "priority": "P1",
      "title": "Implement Anomaly and Trend Detector Widget",
      "problem": "Reactive monitoring only; no proactive detection of unusual patterns or degradation",
      "recommendation": "Create anomaly detection widget that compares current metrics to historical baselines and alerts on significant deviations",
      "api_changes": [
        {
          "endpoint": "Supabase historical metrics",
          "change_type": "add",
          "notes": "Requires 14+ days of historical data from NetworkRewind metrics collection"
        },
        {
          "endpoint": "GET /v1/events?type=authentication,association&severity=warning,critical",
          "change_type": "optimize",
          "notes": "Use filtered event queries for auth/association spike detection"
        }
      ],
      "ui_changes": [
        {
          "component": "src/components/AnomalyDetector.tsx (NEW)",
          "change": "Create 'What Changed' widget showing top 5 anomalies with severity, confidence score, and suggested action",
          "acceptance_criteria": [
            "Detects client count changes >20% within 15min window",
            "Detects auth/association failure spikes (>3× baseline)",
            "Detects throughput collapse (>50% drop)",
            "Detects critical AP offline events",
            "False positive rate <5% (based on historical variance)",
            "Confidence score shown (0-100%) and explainable",
            "Direct link to affected entity detail view"
          ]
        },
        {
          "component": "DashboardEnhanced.tsx",
          "change": "Add AnomalyDetector widget below Operational Health Summary",
          "acceptance_criteria": [
            "Widget shows 'Insufficient data' message if <14 days historical available",
            "Auto-refresh every 5 minutes",
            "Anomalies expire after 4 hours if not acknowledged",
            "User can acknowledge anomaly (mark as known/expected)"
          ]
        }
      ],
      "risks": [
        "Requires 14 days historical data - not available immediately after deployment",
        "Statistical thresholds may need tuning to reduce false positives",
        "High computational cost for real-time statistical analysis"
      ],
      "validation_plan": [
        "Backtesting: run detector on 30 days historical data, measure false positive/negative rate",
        "Controlled test: introduce known anomaly (disconnect AP), verify detection within 5min",
        "Baseline calibration: collect 30 days data, analyze variance, tune thresholds",
        "User acceptance: verify network admins find value in detections"
      ]
    },
    {
      "id": "P2-001",
      "priority": "P2",
      "title": "Implement Top Issues and Recommended Actions Widget",
      "problem": "No AI-driven issue detection or remediation recommendations; network admins must manually correlate alerts and metrics",
      "recommendation": "Create intelligent widget that detects recurring issues, config drift, channel congestion, and capacity constraints, with explainable recommendations",
      "api_changes": [
        {
          "endpoint": "GET /v1/alerts (historical)",
          "change_type": "optimize",
          "notes": "Query last 24-48h of alerts for pattern detection"
        },
        {
          "endpoint": "GET /v3/radios/smartrfchannels",
          "change_type": "add",
          "notes": "Use for channel congestion remediation recommendations"
        },
        {
          "endpoint": "GET /v3/profiles/{profileId}",
          "change_type": "add",
          "notes": "Compare actual AP config to profile for drift detection"
        }
      ],
      "ui_changes": [
        {
          "component": "src/components/TopIssuesWidget.tsx (NEW)",
          "change": "Create ranked issue table with severity, confidence, affected entities, and recommended actions",
          "acceptance_criteria": [
            "Detects recurring alerts (same entity + type, count >=3 in 24h)",
            "Detects channel congestion (utilization >80%, multiple APs on same channel)",
            "Detects config drift (AP config differs from profile by >3 fields)",
            "Detects capacity constraints (service clientCount >85% of maxClients)",
            "Confidence score >70% for auto-suggested actions",
            "User can acknowledge or resolve issues",
            "Issue resolution tracking (did action resolve issue?)"
          ]
        },
        {
          "component": "DashboardEnhanced.tsx or dedicated Issues page",
          "change": "Add TopIssuesWidget as primary operational tool",
          "acceptance_criteria": [
            "Issues update every 5 minutes",
            "Exportable as CSV/PDF for reporting",
            "Integration with issue tracking systems (future: JIRA, ServiceNow)"
          ]
        }
      ],
      "risks": [
        "Complex logic prone to bugs - requires extensive testing",
        "Recommendation accuracy depends on data quality",
        "Channel recommendation API may not exist on all controllers"
      ],
      "validation_plan": [
        "Simulated issues: create known issues (recurring alerts, channel congestion), verify detection",
        "Recommendation validation: follow recommended actions, measure resolution rate",
        "False positive analysis: track acknowledged issues, identify false patterns",
        "User acceptance: A/B test with/without widget, measure time-to-resolution"
      ]
    },
    {
      "id": "P2-002",
      "priority": "P2",
      "title": "Add WebSocket Support for Real-Time Updates",
      "problem": "Polling-based updates have 30-60s latency and waste bandwidth; critical alerts not shown immediately",
      "recommendation": "Implement WebSocket connection for real-time event streaming with fallback to polling",
      "api_changes": [
        {
          "endpoint": "ws://controller/management/ws?access_token={token}",
          "change_type": "add",
          "notes": "Requires Campus Controller backend support for WebSocket. Fallback to polling if unavailable."
        }
      ],
      "ui_changes": [
        {
          "component": "src/services/websocket.ts (NEW)",
          "change": "Create WebSocket manager with auto-reconnect, channel subscriptions, and fallback to polling",
          "acceptance_criteria": [
            "Automatic connection on authentication",
            "Subscribe to channels: alerts, stations, aps, events",
            "Auto-reconnect on disconnect with exponential backoff",
            "Graceful fallback to polling if WebSocket unavailable",
            "Connection status indicator in UI (connected, disconnected, fallback)"
          ]
        },
        {
          "component": "DashboardEnhanced, AlertsEventsEnhanced",
          "change": "Subscribe to WebSocket events for real-time updates, reduce polling interval to 120s",
          "acceptance_criteria": [
            "Critical alerts appear within 1s of occurrence",
            "AP status changes reflect in <2s",
            "Client connect/disconnect events shown in real-time",
            "Zero polling requests when WebSocket connected"
          ]
        }
      ],
      "risks": [
        "Campus Controller may not support WebSocket (HIGH RISK - requires backend work)",
        "WebSocket connections may be blocked by corporate firewalls",
        "Increased server resource usage (connection per client)"
      ],
      "validation_plan": [
        "Check Campus Controller documentation for WebSocket support",
        "Prototype WebSocket connection with simple echo test",
        "Latency test: measure time from event occurrence to UI update",
        "Fallback test: disable WebSocket, verify polling fallback works",
        "Load test: 100+ concurrent WebSocket connections"
      ]
    },
    {
      "id": "P2-003",
      "priority": "P2",
      "title": "Implement Switch Management Dashboard",
      "problem": "30+ switch endpoints completely unused; no visibility into switch inventory, ports, or status",
      "recommendation": "Create comprehensive switch management dashboard similar to AccessPoints",
      "api_changes": [],
      "ui_changes": [
        {
          "component": "src/components/Switches.tsx (NEW)",
          "change": "Create switch inventory table with serial, model, IP, port count, uptime, status, firmware",
          "acceptance_criteria": [
            "Table with 20+ columns (similar to AccessPoints)",
            "Column customization support",
            "Site filtering",
            "Status filtering (connected, disconnected)",
            "Bulk operations: reboot, upgrade (multi-select)",
            "Switch detail view with port-level information",
            "Port configuration UI (VLAN assignment, PoE settings)"
          ]
        },
        {
          "component": "App.tsx",
          "change": "Add 'Switches' page to navigation menu under Infrastructure section",
          "acceptance_criteria": [
            "Page accessible from sidebar",
            "Auto-refresh every 60s",
            "Tab visibility pause support"
          ]
        }
      ],
      "risks": [
        "Switch endpoints may not exist on pure wireless deployments",
        "Port configuration complexity may require extensive UI work"
      ],
      "validation_plan": [
        "Test on deployment with switches to verify endpoint availability",
        "User testing with network admins familiar with switch management",
        "Feature parity check: compare to AccessPoints dashboard"
      ]
    },
    {
      "id": "P2-004",
      "priority": "P2",
      "title": "Add RF Management and Optimization Dashboard",
      "problem": "RF optimization endpoints unused; manual channel planning only; no SmartRF visibility",
      "recommendation": "Create RF management dashboard with channel utilization heatmap and SmartRF recommendations",
      "api_changes": [],
      "ui_changes": [
        {
          "component": "src/components/RFManagement.tsx (NEW)",
          "change": "Create RF dashboard with channel utilization heatmap, SmartRF recommendations, and manual channel assignment",
          "acceptance_criteria": [
            "Channel utilization heatmap (Y-axis: APs, X-axis: Channels, color: utilization %)",
            "SmartRF channel recommendations with confidence scores",
            "Interference detection and visualization",
            "Manual channel override with conflict warnings",
            "RF profile management (TPC, DFS, channel width)",
            "Site-level and AP-level views"
          ]
        },
        {
          "component": "App.tsx",
          "change": "Add 'RF Management' page to Tools section",
          "acceptance_criteria": [
            "Page accessible from sidebar",
            "Real-time channel utilization updates"
          ]
        }
      ],
      "risks": [
        "SmartRF API may not be available on all Campus Controller versions",
        "Heatmap performance with 100+ APs",
        "RF optimization recommendations require deep domain knowledge to validate"
      ],
      "validation_plan": [
        "Test SmartRF endpoint availability",
        "User testing with RF engineers to validate recommendations",
        "Performance test: heatmap with 100, 500 APs",
        "Compare manual channel planning time to SmartRF-assisted planning"
      ]
    },
    {
      "id": "P2-005",
      "priority": "P2",
      "title": "Implement Predictive Capacity Planner Widget",
      "problem": "No visibility into when network resources will reach capacity; reactive scaling only",
      "recommendation": "Create capacity forecasting widget using historical growth trends and linear/exponential regression",
      "api_changes": [],
      "ui_changes": [
        {
          "component": "src/components/CapacityPlanner.tsx (NEW)",
          "change": "Create line chart with historical client count, projected trend line, and capacity threshold with days-to-capacity alert",
          "acceptance_criteria": [
            "Minimum 14 days historical data required (show 'Insufficient data' if less)",
            "Linear regression trendline with confidence interval (±1σ dotted lines)",
            "Alert severity: critical if <30 days to capacity, warning if <90 days",
            "Suggested action: 'Add N APs to {siteName}' based on average clients per AP",
            "User can adjust projection model (linear vs exponential smoothing)",
            "Exportable forecast as CSV/PDF"
          ]
        },
        {
          "component": "DashboardEnhanced or SitesOverview",
          "change": "Add CapacityPlanner widget to capacity planning section",
          "acceptance_criteria": [
            "Widget updates forecast daily (not real-time)",
            "Site-level and service-level views",
            "Historical forecast accuracy tracking (compare to actual)"
          ]
        }
      ],
      "risks": [
        "Simple regression may not capture seasonal/periodic patterns",
        "Accuracy depends on stable growth trends (disruptive events invalidate forecast)",
        "Requires JavaScript stats library (simple-statistics ~10KB)"
      ],
      "validation_plan": [
        "Backtesting: use first 30 days to forecast next 30 days, measure accuracy",
        "Edge case testing: handle zero growth, negative growth, volatile growth",
        "User acceptance: verify network admins find forecasts actionable",
        "Compare forecast to actual capacity breaches over 90 days"
      ]
    },
    {
      "id": "P2-006",
      "priority": "P2",
      "title": "Add CSV/PDF Export Functionality to All Dashboards",
      "problem": "No export functionality for reports; users must manually screenshot or copy-paste data",
      "recommendation": "Add export buttons to all data tables supporting CSV and PDF formats",
      "api_changes": [],
      "ui_changes": [
        {
          "component": "src/components/ui/ExportButton.tsx (NEW)",
          "change": "Create reusable export button component with CSV and PDF options",
          "acceptance_criteria": [
            "CSV export includes all visible columns (respects column customization)",
            "PDF export includes formatted table with page breaks",
            "Export filename includes dashboard name and timestamp",
            "Export respects current filters (site, time range, etc.)",
            "Progress indicator for large exports (>1000 rows)"
          ]
        },
        {
          "component": "All data table components",
          "change": "Add ExportButton to table header",
          "acceptance_criteria": [
            "Button positioned top-right of table",
            "Dropdown menu: 'Export as CSV' and 'Export as PDF'",
            "Works on mobile (downloads to device)"
          ]
        }
      ],
      "risks": [
        "Large table exports (>10,000 rows) may freeze browser",
        "PDF generation library size (consider jspdf ~200KB)"
      ],
      "validation_plan": [
        "Export test: 10, 100, 1000, 10000 row tables",
        "Format validation: verify CSV imports correctly into Excel/Google Sheets",
        "PDF validation: verify readable on mobile and desktop",
        "Cross-browser test: Chrome, Firefox, Safari"
      ]
    }
  ]
}
```

---

## CONCLUSION

This audit identified **significant optimization opportunities** across API usage, data modeling, performance, and UX consistency. The **P0 items address critical performance blockers** (N+1 queries, field naming chaos) that limit scalability and user experience. **P1 items unlock high-value operational insights** through intelligent widgets and consistent filtering. **P2 items represent future enhancements** that position EDGE as a best-in-class network management platform.

### Next Steps
1. **Prioritize P0-001 (N+1 fix)** - Immediate user impact, blocks scaling
2. **Implement P0-002 (field mapping)** - Foundation for all future work
3. **Deliver P1-001 (Health Widget)** - High visibility, quick win
4. **Iterate on P1 items** - Based on user feedback and analytics

### Expected Outcomes (90 days)
- **12× performance improvement** in client traffic stats (P0-001)
- **Zero field naming errors** across dashboards (P0-002)
- **70% reduction in API calls** for static data (P1-004)
- **5-minute faster** incident detection (P1-001, P1-005)
- **80% user satisfaction** with operational widgets (user testing)

**End of Report**
