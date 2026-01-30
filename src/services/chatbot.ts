import { apiService } from './api';
import { trafficService } from './traffic';
import { siteMappingService } from './siteMapping';

export interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  data?: any; // Additional structured data for rich responses
  // Deep link support
  actions?: ChatAction[];
  // Follow-up suggestions
  suggestions?: string[];
  // Evidence trail
  evidence?: EvidenceTrail;
  // Copyable values
  copyableValues?: CopyableValue[];
}

export interface ChatAction {
  label: string;
  type: 'client' | 'access-point' | 'site' | 'quick-action';
  entityId: string;
  entityName?: string;
  action?: 'disassociate' | 'refresh' | 'reboot';
}

export interface EvidenceTrail {
  endpointsCalled: string[];
  dataFields: string[];
  timestamp: Date;
}

export interface CopyableValue {
  label: string;
  value: string;
  type: 'mac' | 'ip' | 'serial';
}

// Assistant context from UI (what entity is currently focused)
export interface AssistantUIContext {
  type: 'site' | 'client' | 'access-point' | 'wlan' | null;
  entityId?: string;
  entityName?: string;
  siteId?: string;
  siteName?: string;
  timeRange?: string;
}

export interface QueryContext {
  accessPoints?: any[];
  stations?: any[];
  sites?: any[];
  services?: any[];
  globalSettings?: any;
}

export class ChatbotService {
  private context: QueryContext = {};
  private isInitialized = false;

  // Helper method to gracefully get global settings
  private async getGlobalSettingsGracefully() {
    try {
      // Check if the method exists on the apiService
      if (typeof (apiService as any).getGlobalSettings === 'function') {
        return await (apiService as any).getGlobalSettings();
      }
      
      // Use the direct API call if getGlobalSettings method doesn't exist
      const response = await apiService.makeAuthenticatedRequest('/v1/globalsettings');
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      // Silently handle failures for global settings since it's not critical
      return null;
    }
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Load basic context data
      await this.refreshContext();
      this.isInitialized = true;
      console.log('Chatbot service initialized with context');
    } catch (error) {
      console.warn('Failed to initialize chatbot context:', error);
    }
  }

  async refreshContext() {
    try {
      // Load key data in parallel
      const [accessPoints, stations, sites, globalSettings] = await Promise.allSettled([
        apiService.getAccessPoints().catch(() => []),
        apiService.getStationsWithSiteCorrelation().catch(() => []),
        apiService.getSites().catch(() => []),
        this.getGlobalSettingsGracefully().catch(() => null)
      ]);

      this.context = {
        accessPoints: accessPoints.status === 'fulfilled' ? accessPoints.value : [],
        stations: stations.status === 'fulfilled' ? stations.value : [],
        sites: sites.status === 'fulfilled' ? sites.value : [],
        globalSettings: globalSettings.status === 'fulfilled' ? globalSettings.value : null
      };
    } catch (error) {
      console.warn('Failed to refresh chatbot context:', error);
    }
  }

  async processQuery(query: string, uiContext?: AssistantUIContext): Promise<ChatMessage> {
    await this.initialize();

    const normalizedQuery = query.toLowerCase().trim();
    const messageId = `bot-${Date.now()}`;

    try {
      // Intent detection based on keywords
      const intent = this.detectIntent(normalizedQuery);

      let response: string;
      let data: any = null;
      let actions: ChatAction[] = [];
      let suggestions: string[] | undefined;
      let evidence: EvidenceTrail | undefined;
      let copyableValues: CopyableValue[] | undefined;

      switch (intent.type) {
        case 'access_points_status':
          response = await this.handleAccessPointsQuery(normalizedQuery, intent);
          break;
        case 'connected_clients':
          response = await this.handleConnectedClientsQuery(normalizedQuery, intent);
          break;
        case 'client_search':
          response = await this.handleClientSearchQuery(normalizedQuery, intent);
          break;
        case 'roaming_info':
          response = await this.handleRoamingQuery(normalizedQuery, intent);
          break;
        case 'client_health':
          const clientHealthResult = await this.handleClientHealthQuery(normalizedQuery, intent, uiContext);
          response = clientHealthResult.response;
          actions = clientHealthResult.actions;
          break;
        case 'ap_health':
          const apHealthResult = await this.handleAPHealthQuery(normalizedQuery, intent, uiContext);
          response = apHealthResult.response;
          actions = apHealthResult.actions;
          break;
        case 'worst_clients':
          const worstClientsResult = await this.handleWorstClientsQuery(normalizedQuery, intent, uiContext);
          response = worstClientsResult.response;
          actions = worstClientsResult.actions;
          suggestions = worstClientsResult.suggestions;
          evidence = worstClientsResult.evidence;
          copyableValues = worstClientsResult.copyableValues;
          break;
        case 'what_changed':
          const whatChangedResult = await this.handleWhatChangedQuery(normalizedQuery, intent, uiContext);
          response = whatChangedResult.response;
          actions = whatChangedResult.actions;
          suggestions = whatChangedResult.suggestions;
          evidence = whatChangedResult.evidence;
          break;
        case 'network_settings':
          response = await this.handleNetworkSettingsQuery(normalizedQuery, intent);
          break;
        case 'site_info':
          response = await this.handleSiteInfoQuery(normalizedQuery, intent);
          break;
        case 'troubleshooting':
          response = await this.handleTroubleshootingQuery(normalizedQuery, intent);
          break;
        case 'stats_summary':
          response = await this.handleStatsQuery(normalizedQuery, intent);
          break;
        default:
          response = this.getHelpResponse();
      }

      return {
        id: messageId,
        type: 'bot',
        content: response,
        timestamp: new Date(),
        data,
        actions: actions.length > 0 ? actions : undefined,
        suggestions,
        evidence,
        copyableValues
      };
    } catch (error) {
      console.error('Error processing chatbot query:', error);
      return {
        id: messageId,
        type: 'bot',
        content: "I encountered an error while processing your request. Please try again or contact support if the issue persists.",
        timestamp: new Date()
      };
    }
  }

  private detectIntent(query: string) {
    const patterns = {
      access_points_status: [
        /access\s*point|ap\s|aps\s/,
        /how\s+many\s+aps?/,
        /ap\s+status|access\s+point\s+status/,
        /offline\s+aps?|down\s+aps?/,
        /ap\s+health|access\s+point\s+health/
      ],
      connected_clients: [
        /how\s+many\s+clients?/,
        /connected\s+users?/,
        /client\s+count|device\s+count/,
        /wireless\s+clients?/,
        /^clients?$/,
        /^show\s+(me\s+)?clients?$/
      ],
      client_search: [
        /find\s+(client|device|station)/,
        /search\s+(for\s+)?(client|device|station)/,
        /look\s*(ing)?\s*(for|up)\s+(client|device|station)?/,
        /where\s+is\s+(client|device)?/,
        /locate\s+(client|device|station)/,
        /client\s+.+/,  // "client John's iPhone"
        /device\s+.+/,  // "device 192.168.1.50"
        /station\s+.+/  // "station aa:bb:cc:dd:ee:ff"
      ],
      roaming_info: [
        /roam(ing)?\s+(of|for|history|trail|events?)/,
        /roam(ing)?\s+.+/,  // "roaming iPhone" or "roaming aa:bb:cc"
        /show\s+(me\s+)?roam/,
        /client\s+roam/,
        /where\s+(has|did)\s+.+\s+(roam|move|connect)/,
        /movement\s+(of|for)/,
        /connection\s+history/
      ],
      client_health: [
        /is\s+(this\s+)?client\s+healthy/,
        /client\s+health/,
        /why\s+is\s+(this\s+)?(client|device)\s+slow/,
        /is\s+it\s+a\s+wi-?fi\s+issue/,
        /client\s+connection\s+(details|info)/,
        /how\s+is\s+(this\s+)?client/,
        /what('s|\s+is)\s+(wrong\s+with|the\s+issue\s+with)\s+(this\s+)?client/,
        /show\s+(me\s+)?connection\s+details/,
        /client\s+status/
      ],
      ap_health: [
        /is\s+(this\s+)?ap\s+healthy/,
        /how\s+is\s+(this\s+)?ap\s+perform/,
        /ap\s+health\s+check/,
        /how\s+is\s+(this\s+)?(access\s+point|ap)\s+(doing|performing)?/,
        /are\s+clients\s+having\s+issues/,
        /is\s+(any\s+)?radio\s+overloaded/,
        /is\s+this\s+an?\s+(rf|uplink)\s+issue/,
        /ap\s+status\s+check/,
        /show\s+ap\s+health/
      ],
      worst_clients: [
        /worst\s+clients?/,
        /problem\s+clients?/,
        /clients?\s+with\s+issues/,
        /struggling\s+clients?/,
        /bad\s+clients?/,
        /clients?\s+(having|with)\s+(problems?|issues?|trouble)/,
        /unhealthy\s+clients?/,
        /poor\s+(performing\s+)?clients?/,
        /triage\s+clients?/
      ],
      what_changed: [
        /what\s+(changed|happened)/,
        /recent\s+changes?/,
        /what's\s+(new|different)/,
        /any\s+changes?/,
        /show\s+(me\s+)?changes?/,
        /events?\s+(in\s+)?(the\s+)?(last|past)/,
        /activity\s+(log|history)/,
        /recent\s+(events?|activity)/
      ],
      network_settings: [
        /settings?|config|configuration/,
        /network\s+config|wifi\s+config/,
        /ssid|network\s+name/,
        /security|password|encryption/
      ],
      site_info: [
        /site|location|sites?/,
        /which\s+sites?|what\s+sites?/,
        /site\s+status|site\s+health/
      ],
      troubleshooting: [
        /problem|issue|error|trouble|help/,
        /not\s+working|broken|down/,
        /can't\s+connect|cannot\s+connect/,
        /slow|performance/
      ],
      stats_summary: [
        /overview|summary|stats|statistics/,
        /dashboard|report|status/,
        /network\s+health|system\s+health/
      ]
    };

    for (const [intentType, regexPatterns] of Object.entries(patterns)) {
      if (regexPatterns.some(pattern => pattern.test(query))) {
        return {
          type: intentType,
          confidence: 0.8,
          extractedEntities: this.extractEntities(query)
        };
      }
    }

    return { type: 'unknown', confidence: 0.0, extractedEntities: {} };
  }

  private extractEntities(query: string) {
    const entities: any = {};
    
    // Extract site names
    if (this.context.sites) {
      const siteNames = this.context.sites.map(site => site.name?.toLowerCase()).filter(Boolean);
      const mentionedSite = siteNames.find(name => query.includes(name));
      if (mentionedSite) {
        entities.site = mentionedSite;
      }
    }

    // Extract AP serial numbers or names
    const serialMatch = query.match(/([a-z0-9]{12,})/i);
    if (serialMatch) {
      entities.serialNumber = serialMatch[1];
    }

    // Extract MAC addresses
    const macMatch = query.match(/([0-9a-f]{2}[:-]){5}[0-9a-f]{2}/i);
    if (macMatch) {
      entities.macAddress = macMatch[0];
    }

    return entities;
  }

  // Helper function to determine if AP is online (aligned with AccessPoints.tsx logic)
  private isApOnline(ap: any): boolean {
    // If AP has clients connected, it's definitely online
    if ((ap.clientCount && ap.clientCount > 0) || (ap.connectedClients && ap.connectedClients > 0)) {
      return true;
    }

    // Check multiple possible status fields
    const status = (ap.status || ap.connectionState || ap.operationalState || ap.state || '').toLowerCase();
    const isUp = ap.isUp;
    const isOnline = ap.online;
    const connected = ap.connected;

    // Consider an AP online if:
    // 1. Status is "inservice" (primary status from Extreme Platform ONE)
    // 2. Status is "ONLINE" (case-insensitive)
    // 3. Status contains 'up', 'online', 'connected'
    // 4. isUp, online, or connected boolean is true
    // 5. No status field but AP exists in list (default to online)
    return (
      status === 'inservice' ||
      status === 'online' ||
      status.includes('up') ||
      status.includes('online') ||
      status.includes('connected') ||
      isUp === true ||
      isOnline === true ||
      connected === true ||
      (!status && isUp !== false && isOnline !== false && connected !== false)
    );
  }

  private async handleAccessPointsQuery(query: string, intent: any): Promise<string> {
    const aps = this.context.accessPoints || [];

    if (aps.length === 0) {
      return "I couldn't retrieve access point information at the moment. Please ensure you have the necessary permissions and try again.";
    }

    const onlineAPs = aps.filter(ap => this.isApOnline(ap));
    const offlineAPs = aps.filter(ap => !this.isApOnline(ap));
    
    if (query.includes('how many') || query.includes('count')) {
      return `You have **${aps.length} total access points**:
• **${onlineAPs.length} online** (${((onlineAPs.length / aps.length) * 100).toFixed(1)}%)
• **${offlineAPs.length} offline** (${((offlineAPs.length / aps.length) * 100).toFixed(1)}%)

${offlineAPs.length > 0 ? `⚠️ **Attention needed**: ${offlineAPs.length} access points are offline.` : '✅ All access points are online!'}`;
    }

    if (query.includes('offline') || query.includes('down') || query.includes('problem')) {
      if (offlineAPs.length === 0) {
        return "✅ Great news! All your access points are currently online and operational.";
      } else {
        const offlineDetails = offlineAPs.slice(0, 5).map(ap => 
          `• **${ap.apName || ap.displayName || ap.serialNumber}** (${ap.siteName || 'Unknown Site'})`
        ).join('\n');
        
        return `⚠️ **${offlineAPs.length} access points are offline:**

${offlineDetails}${offlineAPs.length > 5 ? `\n...and ${offlineAPs.length - 5} more` : ''}

**Recommendations:**
1. Check physical power connections
2. Verify network connectivity
3. Check for firmware issues
4. Contact support if problems persist`;
      }
    }

    // Default AP status overview
    const siteBreakdown = this.groupAPsBySite(aps);
    const siteInfo = Object.entries(siteBreakdown).slice(0, 3).map(([site, count]) => 
      `• **${site}**: ${count} APs`
    ).join('\n');

    return `📡 **Access Points Overview:**

**Total**: ${aps.length} access points
**Status**: ${onlineAPs.length} online, ${offlineAPs.length} offline

**Top Sites:**
${siteInfo}

**Health Score**: ${((onlineAPs.length / aps.length) * 100).toFixed(1)}%

Type "offline APs" to see details about any issues.`;
  }

  private async handleConnectedClientsQuery(query: string, intent: any): Promise<string> {
    const stations = this.context.stations || [];
    
    if (stations.length === 0) {
      return "I couldn't retrieve connected client information at the moment. Please check your permissions and try again.";
    }

    const activeClients = stations.filter(station => 
      station.status?.toLowerCase() === 'connected' || 
      station.status?.toLowerCase() === 'associated' ||
      station.status?.toLowerCase() === 'active'
    );

    if (query.includes('how many') || query.includes('count')) {
      const deviceTypes = this.groupClientsByType(activeClients);
      const typeBreakdown = Object.entries(deviceTypes).slice(0, 3).map(([type, count]) => 
        `• **${type}**: ${count} devices`
      ).join('\n');

      return `👥 **Connected Clients:**

**Total Active**: ${activeClients.length} clients
**Total Tracked**: ${stations.length} clients

**Device Breakdown:**
${typeBreakdown}

**Connection Quality:**
• **Excellent**: ${this.getClientsBySignalQuality(activeClients, 'excellent')} clients
• **Good**: ${this.getClientsBySignalQuality(activeClients, 'good')} clients  
• **Fair/Poor**: ${this.getClientsBySignalQuality(activeClients, 'poor')} clients`;
    }

    // Check for specific client MAC
    if (intent.extractedEntities.macAddress) {
      const client = stations.find(s => 
        s.macAddress?.toLowerCase() === intent.extractedEntities.macAddress.toLowerCase()
      );
      
      if (client) {
        return `📱 **Client Found**: ${client.hostName || client.macAddress}

**Status**: ${client.status || 'Unknown'}
**IP Address**: ${client.ipAddress || 'Not assigned'}
**Access Point**: ${client.apName || client.apSerial || 'Unknown'}
**Site**: ${client.siteName || 'Unknown'}
**Signal Strength**: ${client.rss || client.signalStrength || 'N/A'} dBm
**Connected Since**: ${client.firstSeen || 'Unknown'}`;
      } else {
        return `❌ **Client not found**: No active client with MAC address ${intent.extractedEntities.macAddress} was found.`;
      }
    }

    // Default clients overview
    const siteDistribution = this.groupClientsBySite(activeClients);
    const siteInfo = Object.entries(siteDistribution).slice(0, 3).map(([site, count]) => 
      `• **${site}**: ${count} clients`
    ).join('\n');

    return `👥 **Connected Clients Overview:**

**Active Connections**: ${activeClients.length}
**Total Devices Seen**: ${stations.length}

**Site Distribution:**
${siteInfo}

**Recent Activity**: ${this.getRecentActivitySummary(stations)}

Need details about a specific client? Provide the MAC address!`;
  }

  private async handleClientSearchQuery(query: string, intent: any): Promise<string> {
    const stations = this.context.stations || [];

    if (stations.length === 0) {
      return "I couldn't retrieve client information at the moment. Please check your permissions and try again.";
    }

    // Extract search term from query
    const searchTerm = this.extractSearchTerm(query);

    // If no search term or generic query, show list of connected clients
    if (!searchTerm || searchTerm === 'by name or mac' || searchTerm === 'name or mac') {
      const connectedClients = stations
        .filter(s => s.status?.toLowerCase() === 'connected' || s.status?.toLowerCase() === 'associated')
        .slice(0, 10);

      if (connectedClients.length === 0) {
        return `🔍 **Client Search**

No connected clients found. Please specify a search term.

Example: "find client aa:bb:cc:dd:ee:ff"`;
      }

      const clientList = connectedClients.map(client => {
        const name = client.hostName || 'Unknown';
        const mac = client.macAddress;
        const ip = client.ipAddress || 'No IP';
        const site = client.siteName || '';
        const deviceType = client.deviceType || '';
        const info = [deviceType, site].filter(Boolean).join(' • ');
        return `• **${name}** - ${ip}\n  \`${mac}\`${info ? ` (${info})` : ''}`;
      }).join('\n\n');

      return `🔍 **Client Search - Connected Clients**

Type "find client" followed by a name, MAC, or IP:

${clientList}${stations.length > 10 ? `\n\n...and ${stations.length - 10} more clients` : ''}

**Example queries:**
• "find client ${connectedClients[0]?.hostName || connectedClients[0]?.macAddress}"
• "find client ${connectedClients[0]?.macAddress}"`;
    }

    const searchLower = searchTerm.toLowerCase();

    // Search across multiple fields (similar to ConnectedClients.tsx filtering)
    const matchingClients = stations.filter(station => {
      return (
        station.macAddress?.toLowerCase().includes(searchLower) ||
        station.ipAddress?.toLowerCase().includes(searchLower) ||
        station.hostName?.toLowerCase().includes(searchLower) ||
        station.apName?.toLowerCase().includes(searchLower) ||
        station.apSerial?.toLowerCase().includes(searchLower) ||
        station.username?.toLowerCase().includes(searchLower) ||
        station.siteName?.toLowerCase().includes(searchLower) ||
        station.network?.toLowerCase().includes(searchLower) ||
        station.manufacturer?.toLowerCase().includes(searchLower) ||
        station.deviceType?.toLowerCase().includes(searchLower)
      );
    });

    if (matchingClients.length === 0) {
      return `❌ **No clients found matching "${searchTerm}"**

Try searching by:
• Hostname (e.g., "iPhone", "MacBook")
• MAC address (e.g., "aa:bb:cc:dd:ee:ff")
• IP address (e.g., "192.168.1.50")
• Device type (e.g., "laptop", "phone")
• Site name`;
    }

    if (matchingClients.length === 1) {
      const client = matchingClients[0];
      return `📱 **Client Found**: ${client.hostName || client.macAddress}

**Status**: ${client.status || 'Unknown'}
**MAC Address**: ${client.macAddress || 'N/A'}
**IP Address**: ${client.ipAddress || 'Not assigned'}
**Device Type**: ${client.deviceType || 'Unknown'}
**Manufacturer**: ${client.manufacturer || 'Unknown'}
**Access Point**: ${client.apName || client.apSerial || 'Unknown'}
**Site**: ${client.siteName || 'Unknown'}
**Network/SSID**: ${client.network || 'Unknown'}
**Signal Strength**: ${client.rss || client.signalStrength || 'N/A'} dBm
**Connected Since**: ${client.firstSeen || 'Unknown'}`;
    }

    // Multiple matches - show summary list
    const displayClients = matchingClients.slice(0, 8);
    const clientList = displayClients.map(client => {
      const status = client.status?.toLowerCase() === 'connected' ? '🟢' : '⚪';
      const name = client.hostName || client.macAddress;
      const site = client.siteName || 'Unknown Site';
      const ip = client.ipAddress || 'No IP';
      return `${status} **${name}** - ${ip} (${site})`;
    }).join('\n');

    return `🔍 **Found ${matchingClients.length} clients matching "${searchTerm}":**

${clientList}${matchingClients.length > 8 ? `\n\n...and ${matchingClients.length - 8} more matches` : ''}

**Tip**: Search with a more specific term (MAC address or full hostname) to see detailed info for a single client.`;
  }

  private extractSearchTerm(query: string): string {
    // Remove common command prefixes to extract the search term
    const cleanedQuery = query
      .replace(/^(find|search|look\s*(for|up)?|where\s+is|locate)\s*/i, '')
      .replace(/^(client|device|station|for)\s*/i, '')
      .trim();

    return cleanedQuery;
  }

  private extractRoamingSearchTerm(query: string): string {
    // Remove roaming-related prefixes to extract the client identifier
    const cleanedQuery = query
      .replace(/^(show\s+(me\s+)?)?roam(ing)?\s*(of|for|history|trail|events?)?\s*/i, '')
      .replace(/^(client\s+roam(ing)?|connection\s+history|movement)\s*(of|for)?\s*/i, '')
      .replace(/^(where\s+(has|did))\s*/i, '')
      .replace(/\s*(roam|move|connect).*$/i, '')
      .trim();

    return cleanedQuery;
  }

  private async handleRoamingQuery(query: string, intent: any): Promise<string> {
    const stations = this.context.stations || [];

    // Extract client identifier from query
    const searchTerm = this.extractRoamingSearchTerm(query);

    // If no search term or generic query, show list of connected clients
    if (!searchTerm || searchTerm === 'a client' || searchTerm === 'client') {
      const connectedClients = stations
        .filter(s => s.status?.toLowerCase() === 'connected' || s.status?.toLowerCase() === 'associated')
        .slice(0, 10);

      if (connectedClients.length === 0) {
        return `📍 **Client Roaming**

No connected clients found. Please specify a client MAC address or hostname.

Example: "roaming aa:bb:cc:dd:ee:ff"`;
      }

      const clientList = connectedClients.map(client => {
        const name = client.hostName || 'Unknown';
        const mac = client.macAddress;
        const site = client.siteName || '';
        const deviceType = client.deviceType || '';
        const info = [deviceType, site].filter(Boolean).join(' • ');
        return `• **${name}**\n  \`${mac}\`${info ? ` (${info})` : ''}`;
      }).join('\n\n');

      return `📍 **Client Roaming - Select a Client**

Type "roaming" followed by a name or MAC address:

${clientList}${stations.length > 10 ? `\n\n...and ${stations.length - 10} more clients` : ''}

**Example queries:**
• "roaming ${connectedClients[0]?.hostName || connectedClients[0]?.macAddress}"
• "roaming ${connectedClients[0]?.macAddress}"`;
    }

    const searchLower = searchTerm.toLowerCase();

    // Find matching client(s)
    const matchingClients = stations.filter(station => {
      return (
        station.macAddress?.toLowerCase().includes(searchLower) ||
        station.ipAddress?.toLowerCase().includes(searchLower) ||
        station.hostName?.toLowerCase().includes(searchLower) ||
        station.deviceType?.toLowerCase().includes(searchLower)
      );
    });

    if (matchingClients.length === 0) {
      return `❌ **No client found matching "${searchTerm}"**

Try searching by:
• Hostname (e.g., "roaming of iPhone")
• MAC address (e.g., "roaming aa:bb:cc:dd:ee:ff")
• IP address (e.g., "roaming 192.168.1.50")`;
    }

    // If multiple matches, ask user to be more specific
    if (matchingClients.length > 1) {
      const clientList = matchingClients.slice(0, 5).map(client => {
        const name = client.hostName || client.macAddress;
        return `• **${name}** (${client.macAddress})`;
      }).join('\n');

      return `🔍 **Multiple clients found matching "${searchTerm}":**

${clientList}${matchingClients.length > 5 ? `\n...and ${matchingClients.length - 5} more` : ''}

Please specify the exact MAC address for roaming history.
Example: "roaming ${matchingClients[0].macAddress}"`;
    }

    // Single match - fetch roaming events
    const client = matchingClients[0];
    const macAddress = client.macAddress;

    try {
      // Fetch roaming events from API
      const events = await apiService.fetchStationEvents(macAddress);

      if (!events || events.length === 0) {
        return `📍 **Roaming History for ${client.hostName || macAddress}**

**Current Connection:**
• **Access Point**: ${client.apName || client.apSerial || 'Unknown'}
• **Site**: ${client.siteName || 'Unknown'}
• **Network**: ${client.network || 'Unknown'}
• **Signal**: ${client.rss || client.signalStrength || 'N/A'} dBm

ℹ️ No roaming events found in the last 30 days. This client may have stayed connected to the same AP.`;
      }

      // Process roaming events
      const roamingTypes = ['Roam', 'Registration', 'Associate', 'Disassociate', 'State Change'];
      const roamingEvents = events.filter(e => roamingTypes.includes(e.eventType));

      // Get unique APs
      const uniqueAPs = new Set<string>();
      roamingEvents.forEach(e => {
        if (e.apName) uniqueAPs.add(e.apName);
      });

      // Count events by type
      const eventCounts: Record<string, number> = {};
      roamingEvents.forEach(e => {
        eventCounts[e.eventType] = (eventCounts[e.eventType] || 0) + 1;
      });

      // Get recent events (last 5)
      const recentEvents = roamingEvents
        .sort((a, b) => parseInt(b.timestamp) - parseInt(a.timestamp))
        .slice(0, 5);

      const recentList = recentEvents.map(e => {
        const time = new Date(parseInt(e.timestamp)).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        const icon = e.eventType === 'Roam' ? '🔄' :
                     e.eventType === 'Associate' || e.eventType === 'Registration' ? '✅' :
                     e.eventType === 'Disassociate' || e.eventType === 'De-registration' ? '❌' : '📍';
        return `${icon} ${time} - ${e.eventType} → ${e.apName || 'Unknown AP'}`;
      }).join('\n');

      // Build event type summary
      const eventSummary = Object.entries(eventCounts)
        .map(([type, count]) => `• **${type}**: ${count}`)
        .join('\n');

      return `📍 **Roaming History for ${client.hostName || macAddress}**

**Summary (Last 30 Days):**
• **Total Events**: ${roamingEvents.length}
• **Unique APs Visited**: ${uniqueAPs.size}
• **Roams**: ${eventCounts['Roam'] || 0}

**Event Breakdown:**
${eventSummary}

**Current Connection:**
• **AP**: ${client.apName || client.apSerial || 'Unknown'}
• **Site**: ${client.siteName || 'Unknown'}
• **Signal**: ${client.rss || client.signalStrength || 'N/A'} dBm

**Recent Activity:**
${recentList}

💡 **Tip**: Open the client details page to see the full Roaming Trail visualization.`;

    } catch (error) {
      console.error('Error fetching roaming events:', error);
      return `📍 **Roaming for ${client.hostName || macAddress}**

**Current Connection:**
• **Access Point**: ${client.apName || client.apSerial || 'Unknown'}
• **Site**: ${client.siteName || 'Unknown'}
• **Signal**: ${client.rss || client.signalStrength || 'N/A'} dBm

⚠️ Unable to fetch detailed roaming history at this time. Please check the client details page for the full Roaming Trail.`;
    }
  }

  private async handleClientHealthQuery(
    query: string,
    intent: any,
    uiContext?: AssistantUIContext
  ): Promise<{ response: string; actions: ChatAction[] }> {
    const stations = this.context.stations || [];
    const actions: ChatAction[] = [];

    // If we have client context from UI, use it
    let targetClient: any = null;
    if (uiContext?.type === 'client' && uiContext.entityId) {
      targetClient = stations.find(s =>
        s.macAddress?.toLowerCase() === uiContext.entityId?.toLowerCase()
      );
    }

    // If no context, try to extract from query or ask for selection
    if (!targetClient) {
      const searchTerm = this.extractSearchTerm(query);
      if (searchTerm && searchTerm !== 'this client' && searchTerm !== 'client') {
        const matches = stations.filter(s =>
          s.macAddress?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.hostName?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        if (matches.length === 1) {
          targetClient = matches[0];
        } else if (matches.length > 1) {
          const clientList = matches.slice(0, 5).map(c => {
            const name = c.hostName || c.macAddress;
            return `• **${name}** (\`${c.macAddress}\`)`;
          }).join('\n');
          return {
            response: `🔍 **Multiple clients found. Please be more specific:**\n\n${clientList}`,
            actions: matches.slice(0, 5).map(c => ({
              label: c.hostName || c.macAddress,
              type: 'client' as const,
              entityId: c.macAddress,
              entityName: c.hostName
            }))
          };
        }
      }
    }

    if (!targetClient) {
      // Show list of clients to choose from
      const connectedClients = stations
        .filter(s => s.status?.toLowerCase() === 'connected')
        .slice(0, 8);

      if (connectedClients.length === 0) {
        return { response: "No connected clients found to analyze.", actions: [] };
      }

      const clientList = connectedClients.map(c => {
        const name = c.hostName || 'Unknown';
        return `• **${name}** - \`${c.macAddress}\``;
      }).join('\n');

      return {
        response: `🩺 **Client Health Check**\n\nPlease specify which client to analyze:\n\n${clientList}\n\nExample: "Is client ${connectedClients[0]?.hostName || connectedClients[0]?.macAddress} healthy?"`,
        actions: connectedClients.map(c => ({
          label: c.hostName || c.macAddress,
          type: 'client' as const,
          entityId: c.macAddress,
          entityName: c.hostName
        }))
      };
    }

    // We have a target client - perform health analysis
    const client = targetClient;
    const clientName = client.hostName || client.macAddress;

    // Add action to view client details
    actions.push({
      label: `View ${clientName} Details`,
      type: 'client',
      entityId: client.macAddress,
      entityName: clientName
    });

    // Fetch roaming events for deeper analysis
    let events: any[] = [];
    try {
      events = await apiService.fetchStationEvents(client.macAddress);
    } catch (e) {
      // Continue without events
    }

    // Analyze client health
    const healthIndicators: string[] = [];
    const issues: string[] = [];
    let overallHealth: 'good' | 'warning' | 'critical' = 'good';

    // Signal strength analysis
    const rssi = client.rss || client.signalStrength;
    if (rssi) {
      const rssiNum = parseInt(rssi);
      if (rssiNum >= -65) {
        healthIndicators.push(`✅ **Signal**: ${rssi} dBm (Excellent)`);
      } else if (rssiNum >= -75) {
        healthIndicators.push(`✅ **Signal**: ${rssi} dBm (Good)`);
      } else if (rssiNum >= -85) {
        healthIndicators.push(`⚠️ **Signal**: ${rssi} dBm (Fair)`);
        issues.push("Weak signal strength may cause slow speeds");
        overallHealth = 'warning';
      } else {
        healthIndicators.push(`❌ **Signal**: ${rssi} dBm (Poor)`);
        issues.push("Very weak signal - likely cause of connectivity issues");
        overallHealth = 'critical';
      }
    }

    // Connection status
    const status = client.status?.toLowerCase();
    if (status === 'connected' || status === 'associated') {
      healthIndicators.push(`✅ **Status**: Connected`);
    } else {
      healthIndicators.push(`❌ **Status**: ${client.status || 'Unknown'}`);
      issues.push("Client is not currently connected");
      overallHealth = 'critical';
    }

    // Data rates
    if (client.txRate || client.rxRate) {
      const txRate = parseInt(client.txRate) || 0;
      const rxRate = parseInt(client.rxRate) || 0;
      if (txRate > 100 || rxRate > 100) {
        healthIndicators.push(`✅ **Data Rate**: TX ${client.txRate || 'N/A'} / RX ${client.rxRate || 'N/A'} Mbps`);
      } else if (txRate > 50 || rxRate > 50) {
        healthIndicators.push(`⚠️ **Data Rate**: TX ${client.txRate || 'N/A'} / RX ${client.rxRate || 'N/A'} Mbps`);
        issues.push("Lower than optimal data rates");
        if (overallHealth === 'good') overallHealth = 'warning';
      } else {
        healthIndicators.push(`❌ **Data Rate**: TX ${client.txRate || 'N/A'} / RX ${client.rxRate || 'N/A'} Mbps`);
        issues.push("Very low data rates - may indicate interference or distance issues");
        overallHealth = 'critical';
      }
    }

    // Band/frequency
    if (client.band || client.frequency) {
      const band = client.band || client.frequency;
      if (band?.includes('5') || band?.includes('6')) {
        healthIndicators.push(`✅ **Band**: ${band}`);
      } else if (band?.includes('2.4')) {
        healthIndicators.push(`⚠️ **Band**: ${band} (consider 5GHz for better performance)`);
        issues.push("Client on 2.4GHz - may experience congestion");
        if (overallHealth === 'good') overallHealth = 'warning';
      }
    }

    // Roaming analysis
    if (events.length > 0) {
      const roamEvents = events.filter(e => e.eventType === 'Roam');
      const recentRoams = roamEvents.filter(e => {
        const eventTime = parseInt(e.timestamp);
        const hourAgo = Date.now() - (60 * 60 * 1000);
        return eventTime > hourAgo;
      });

      if (recentRoams.length > 5) {
        healthIndicators.push(`⚠️ **Roaming**: ${recentRoams.length} roams in last hour (excessive)`);
        issues.push("Frequent roaming may indicate coverage gaps or RF issues");
        if (overallHealth === 'good') overallHealth = 'warning';
      } else if (recentRoams.length > 0) {
        healthIndicators.push(`✅ **Roaming**: ${recentRoams.length} roams in last hour (normal)`);
      } else {
        healthIndicators.push(`✅ **Roaming**: Stable connection`);
      }
    }

    // Build response
    const healthEmoji = overallHealth === 'good' ? '🟢' : overallHealth === 'warning' ? '🟡' : '🔴';
    const healthLabel = overallHealth === 'good' ? 'Healthy' : overallHealth === 'warning' ? 'Some Issues' : 'Needs Attention';

    let response = `🩺 **Client Health Check: ${clientName}**\n\n`;
    response += `**Overall Status**: ${healthEmoji} ${healthLabel}\n\n`;
    response += `**Health Indicators:**\n${healthIndicators.join('\n')}\n\n`;
    response += `**Connection Details:**\n`;
    response += `• **AP**: ${client.apName || client.apSerial || 'Unknown'}\n`;
    response += `• **Network**: ${client.network || client.ssid || 'Unknown'}\n`;
    response += `• **IP Address**: ${client.ipAddress || 'Not assigned'}\n`;
    response += `• **Site**: ${client.siteName || 'Unknown'}\n`;

    if (issues.length > 0) {
      response += `\n**⚠️ Potential Issues:**\n${issues.map(i => `• ${i}`).join('\n')}\n`;
    }

    if (client.apName || client.apSerial) {
      actions.push({
        label: `View AP: ${client.apName || client.apSerial}`,
        type: 'access-point',
        entityId: client.apSerial,
        entityName: client.apName
      });
    }

    response += `\n💡 **Tip**: Click the buttons below to view detailed information.`;

    return { response, actions };
  }

  private async handleAPHealthQuery(
    query: string,
    intent: any,
    uiContext?: AssistantUIContext
  ): Promise<{ response: string; actions: ChatAction[] }> {
    const accessPoints = this.context.accessPoints || [];
    const stations = this.context.stations || [];
    const actions: ChatAction[] = [];

    // If we have AP context from UI, use it
    let targetAP: any = null;
    if (uiContext?.type === 'access-point' && uiContext.entityId) {
      targetAP = accessPoints.find(ap =>
        ap.serialNumber?.toLowerCase() === uiContext.entityId?.toLowerCase() ||
        ap.apSerial?.toLowerCase() === uiContext.entityId?.toLowerCase()
      );
    }

    // If no context, try to extract from query
    if (!targetAP) {
      const searchTerm = query
        .replace(/^(is\s+(this\s+)?|how\s+is\s+(this\s+)?|show\s+)/i, '')
        .replace(/\s*(ap|access\s+point)?\s*(health|perform|doing|status|check).*$/i, '')
        .trim();

      if (searchTerm && searchTerm !== 'this' && searchTerm.length > 2) {
        const matches = accessPoints.filter(ap =>
          ap.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ap.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ap.apName?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        if (matches.length === 1) {
          targetAP = matches[0];
        }
      }
    }

    if (!targetAP) {
      // Show list of APs
      const onlineAPs = accessPoints
        .filter(ap => ap.status?.toLowerCase() === 'online' || ap.connectionState?.toLowerCase() === 'connected')
        .slice(0, 8);

      if (onlineAPs.length === 0) {
        return { response: "No online access points found to analyze.", actions: [] };
      }

      const apList = onlineAPs.map(ap => {
        const name = ap.name || ap.apName || ap.serialNumber;
        return `• **${name}** - \`${ap.serialNumber}\``;
      }).join('\n');

      return {
        response: `📡 **AP Health Check**\n\nPlease specify which AP to analyze:\n\n${apList}\n\nExample: "How is AP ${onlineAPs[0]?.name || onlineAPs[0]?.serialNumber} performing?"`,
        actions: onlineAPs.map(ap => ({
          label: ap.name || ap.apName || ap.serialNumber,
          type: 'access-point' as const,
          entityId: ap.serialNumber,
          entityName: ap.name || ap.apName
        }))
      };
    }

    // We have a target AP - perform health analysis
    const ap = targetAP;
    const apName = ap.name || ap.apName || ap.serialNumber;

    // Add action to view AP details
    actions.push({
      label: `View ${apName} Details`,
      type: 'access-point',
      entityId: ap.serialNumber,
      entityName: apName
    });

    // Get clients connected to this AP
    const apClients = stations.filter(s =>
      s.apSerial?.toLowerCase() === ap.serialNumber?.toLowerCase() ||
      s.apSerialNumber?.toLowerCase() === ap.serialNumber?.toLowerCase()
    );

    // Analyze AP health
    const healthIndicators: string[] = [];
    const issues: string[] = [];
    let overallHealth: 'good' | 'warning' | 'critical' = 'good';

    // Connection status
    const status = ap.status?.toLowerCase() || ap.connectionState?.toLowerCase();
    if (status === 'online' || status === 'connected') {
      healthIndicators.push(`✅ **Status**: Online`);
    } else {
      healthIndicators.push(`❌ **Status**: ${ap.status || 'Unknown'}`);
      issues.push("AP is not online");
      overallHealth = 'critical';
    }

    // Client load
    const clientCount = apClients.length;
    if (clientCount < 20) {
      healthIndicators.push(`✅ **Client Load**: ${clientCount} clients (Light)`);
    } else if (clientCount < 50) {
      healthIndicators.push(`⚠️ **Client Load**: ${clientCount} clients (Moderate)`);
      if (overallHealth === 'good') overallHealth = 'warning';
    } else {
      healthIndicators.push(`❌ **Client Load**: ${clientCount} clients (Heavy)`);
      issues.push("High client density may impact performance");
      overallHealth = 'critical';
    }

    // Radio information
    if (ap.radios && Array.isArray(ap.radios)) {
      ap.radios.forEach((radio: any, index: number) => {
        const band = radio.band || radio.frequency || `Radio ${index + 1}`;
        const channel = radio.channel || 'Auto';
        const power = radio.txPower || radio.power || 'Auto';
        const radioStatus = radio.status?.toLowerCase() === 'up' ? '✅' : '⚠️';
        healthIndicators.push(`${radioStatus} **${band}**: Ch ${channel}, Power ${power}`);
      });
    }

    // Uplink status
    if (ap.uplinkStatus || ap.ethernetStatus) {
      const uplink = ap.uplinkStatus || ap.ethernetStatus;
      if (uplink.toLowerCase().includes('up') || uplink.toLowerCase().includes('connected')) {
        healthIndicators.push(`✅ **Uplink**: Connected`);
      } else {
        healthIndicators.push(`❌ **Uplink**: ${uplink}`);
        issues.push("Uplink connectivity issue");
        overallHealth = 'critical';
      }
    }

    // Analyze client signal quality on this AP
    if (apClients.length > 0) {
      const signalValues = apClients
        .map(c => parseInt(c.rss || c.signalStrength))
        .filter(v => !isNaN(v));

      if (signalValues.length > 0) {
        const avgSignal = Math.round(signalValues.reduce((a, b) => a + b, 0) / signalValues.length);
        const poorSignalClients = signalValues.filter(v => v < -80).length;

        if (avgSignal >= -70) {
          healthIndicators.push(`✅ **Avg Client Signal**: ${avgSignal} dBm (Good)`);
        } else if (avgSignal >= -80) {
          healthIndicators.push(`⚠️ **Avg Client Signal**: ${avgSignal} dBm (Fair)`);
          if (overallHealth === 'good') overallHealth = 'warning';
        } else {
          healthIndicators.push(`❌ **Avg Client Signal**: ${avgSignal} dBm (Poor)`);
          issues.push("Clients experiencing weak signals");
          overallHealth = 'critical';
        }

        if (poorSignalClients > 0) {
          healthIndicators.push(`⚠️ **Weak Signal Clients**: ${poorSignalClients} clients below -80 dBm`);
        }
      }
    }

    // Build response
    const healthEmoji = overallHealth === 'good' ? '🟢' : overallHealth === 'warning' ? '🟡' : '🔴';
    const healthLabel = overallHealth === 'good' ? 'Healthy' : overallHealth === 'warning' ? 'Some Issues' : 'Needs Attention';

    let response = `📡 **AP Health Check: ${apName}**\n\n`;
    response += `**Overall Status**: ${healthEmoji} ${healthLabel}\n\n`;
    response += `**Health Indicators:**\n${healthIndicators.join('\n')}\n\n`;
    response += `**AP Details:**\n`;
    response += `• **Serial**: ${ap.serialNumber}\n`;
    response += `• **Model**: ${ap.model || ap.hardwareType || 'Unknown'}\n`;
    response += `• **IP Address**: ${ap.ipAddress || 'Unknown'}\n`;
    response += `• **Site**: ${ap.siteName || ap.site || 'Unknown'}\n`;

    if (issues.length > 0) {
      response += `\n**⚠️ Potential Issues:**\n${issues.map(i => `• ${i}`).join('\n')}\n`;
    }

    // Add actions for clients with issues
    const problemClients = apClients.filter(c => {
      const rssi = parseInt(c.rss || c.signalStrength);
      return !isNaN(rssi) && rssi < -80;
    }).slice(0, 3);

    problemClients.forEach(c => {
      actions.push({
        label: `View Client: ${c.hostName || c.macAddress}`,
        type: 'client',
        entityId: c.macAddress,
        entityName: c.hostName
      });
    });

    response += `\n💡 **Tip**: Click the buttons below to drill into specific entities.`;

    return { response, actions };
  }

  private async handleWorstClientsQuery(
    query: string,
    intent: any,
    uiContext?: AssistantUIContext
  ): Promise<{
    response: string;
    actions: ChatAction[];
    suggestions: string[];
    evidence: EvidenceTrail;
    copyableValues: CopyableValue[];
  }> {
    const stations = this.context.stations || [];
    const actions: ChatAction[] = [];
    const copyableValues: CopyableValue[] = [];

    // Score each client based on various health metrics
    const scoredClients = stations.map(client => {
      let score = 100; // Start with perfect score
      const issues: string[] = [];

      // Signal strength scoring
      const rssi = parseInt(client.rss || client.signalStrength);
      if (!isNaN(rssi)) {
        if (rssi < -85) {
          score -= 40;
          issues.push('Very weak signal');
        } else if (rssi < -75) {
          score -= 20;
          issues.push('Weak signal');
        } else if (rssi < -65) {
          score -= 5;
        }
      }

      // Data rate scoring
      const txRate = parseInt(client.txRate) || 0;
      const rxRate = parseInt(client.rxRate) || 0;
      if (txRate < 50 && rxRate < 50) {
        score -= 25;
        issues.push('Low data rates');
      }

      // Band scoring (2.4GHz is less optimal)
      const band = client.band || client.frequency || '';
      if (band.includes('2.4')) {
        score -= 10;
        issues.push('On 2.4GHz');
      }

      // Connection status
      const status = client.status?.toLowerCase();
      if (status !== 'connected' && status !== 'associated') {
        score -= 50;
        issues.push('Disconnected');
      }

      return {
        ...client,
        healthScore: Math.max(0, score),
        issues
      };
    });

    // Sort by health score (worst first)
    const worstClients = scoredClients
      .filter(c => c.healthScore < 80) // Only show clients with issues
      .sort((a, b) => a.healthScore - b.healthScore)
      .slice(0, 10);

    if (worstClients.length === 0) {
      return {
        response: `✅ **All Clients Healthy!**\n\nNo clients with significant issues found. All ${stations.length} connected clients are performing well.`,
        actions: [],
        suggestions: ['Show me connected clients', 'How many APs are online?', 'Show site health status'],
        evidence: {
          endpointsCalled: ['/v1/stations'],
          dataFields: ['rss', 'txRate', 'rxRate', 'band', 'status'],
          timestamp: new Date()
        },
        copyableValues: []
      };
    }

    // Build response
    let response = `⚠️ **Clients Needing Attention** (${worstClients.length} found)\n\n`;

    worstClients.forEach((client, index) => {
      const name = client.hostName || client.macAddress;
      const scoreEmoji = client.healthScore < 40 ? '🔴' : client.healthScore < 70 ? '🟡' : '🟢';
      const issueText = client.issues.slice(0, 2).join(', ');

      response += `${index + 1}. ${scoreEmoji} **${name}**\n`;
      response += `   Score: ${client.healthScore}/100 • ${issueText}\n`;
      response += `   AP: ${client.apName || 'Unknown'} • Signal: ${client.rss || 'N/A'} dBm\n\n`;

      // Add action
      actions.push({
        label: name.length > 20 ? name.substring(0, 20) + '...' : name,
        type: 'client',
        entityId: client.macAddress,
        entityName: client.hostName
      });

      // Add copyable MAC
      copyableValues.push({
        label: name,
        value: client.macAddress,
        type: 'mac'
      });
    });

    return {
      response,
      actions: actions.slice(0, 5), // Limit to 5 action buttons
      suggestions: [
        'Is this client healthy?',
        'Show roaming history',
        'How is this AP performing?'
      ],
      evidence: {
        endpointsCalled: ['/v1/stations'],
        dataFields: ['rss', 'txRate', 'rxRate', 'band', 'status', 'hostName', 'apName'],
        timestamp: new Date()
      },
      copyableValues
    };
  }

  private async handleWhatChangedQuery(
    query: string,
    intent: any,
    uiContext?: AssistantUIContext
  ): Promise<{
    response: string;
    actions: ChatAction[];
    suggestions: string[];
    evidence: EvidenceTrail;
  }> {
    const actions: ChatAction[] = [];
    const endpointsCalled: string[] = [];

    // Try to get recent events from various sources
    let allEvents: any[] = [];

    // If we have a client context, get client events
    if (uiContext?.type === 'client' && uiContext.entityId) {
      try {
        const events = await apiService.fetchStationEvents(uiContext.entityId);
        endpointsCalled.push('/platformmanager/v2/logging/stations/events/query');
        allEvents = events.map(e => ({
          ...e,
          source: 'client',
          entityName: uiContext.entityName
        }));
      } catch (e) {
        // Continue
      }
    }

    // Try to get audit logs
    try {
      const auditLogs = await apiService.getAuditLogs?.() || [];
      endpointsCalled.push('/v1/audit/logs');
      allEvents = [
        ...allEvents,
        ...auditLogs.slice(0, 20).map((log: any) => ({
          timestamp: log.timestamp,
          eventType: log.action || log.type || 'Config Change',
          details: log.message || log.details,
          source: 'audit'
        }))
      ];
    } catch (e) {
      // Continue without audit logs
    }

    // Sort by timestamp (most recent first)
    allEvents.sort((a, b) => {
      const timeA = parseInt(a.timestamp) || new Date(a.timestamp).getTime();
      const timeB = parseInt(b.timestamp) || new Date(b.timestamp).getTime();
      return timeB - timeA;
    });

    // Filter to last hour by default
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const recentEvents = allEvents.filter(e => {
      const eventTime = parseInt(e.timestamp) || new Date(e.timestamp).getTime();
      return eventTime > oneHourAgo;
    }).slice(0, 15);

    if (recentEvents.length === 0) {
      const contextText = uiContext?.entityName ? ` for ${uiContext.entityName}` : '';
      return {
        response: `📋 **Recent Activity${contextText}**\n\nNo significant changes detected in the last hour.\n\n💡 Try expanding the time range or checking specific clients/APs.`,
        actions: [],
        suggestions: [
          'Show worst clients',
          'Show site health status',
          'Are there any offline devices?'
        ],
        evidence: {
          endpointsCalled,
          dataFields: ['timestamp', 'eventType', 'details'],
          timestamp: new Date()
        }
      };
    }

    // Build response
    const contextText = uiContext?.entityName ? ` for ${uiContext.entityName}` : '';
    let response = `📋 **Recent Activity${contextText}** (Last Hour)\n\n`;

    // Group events by type
    const eventCounts: Record<string, number> = {};
    recentEvents.forEach(e => {
      const type = e.eventType || 'Unknown';
      eventCounts[type] = (eventCounts[type] || 0) + 1;
    });

    response += `**Summary:**\n`;
    Object.entries(eventCounts).forEach(([type, count]) => {
      const emoji = type.includes('Roam') ? '🔄' :
                    type.includes('Associate') || type.includes('Registration') ? '✅' :
                    type.includes('Disassociate') || type.includes('De-registration') ? '❌' :
                    type.includes('Config') ? '⚙️' : '📍';
      response += `${emoji} ${type}: ${count}\n`;
    });

    response += `\n**Recent Events:**\n`;
    recentEvents.slice(0, 8).forEach(event => {
      const time = new Date(parseInt(event.timestamp) || event.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
      const emoji = event.eventType?.includes('Roam') ? '🔄' :
                    event.eventType?.includes('Associate') ? '✅' :
                    event.eventType?.includes('Disassociate') ? '❌' : '📍';
      response += `${emoji} ${time} - ${event.eventType || 'Event'}`;
      if (event.apName) response += ` → ${event.apName}`;
      response += '\n';
    });

    if (recentEvents.length > 8) {
      response += `\n...and ${recentEvents.length - 8} more events`;
    }

    return {
      response,
      actions,
      suggestions: [
        'Is this client healthy?',
        'Show worst clients',
        'Show roaming history'
      ],
      evidence: {
        endpointsCalled,
        dataFields: ['timestamp', 'eventType', 'apName', 'details'],
        timestamp: new Date()
      }
    };
  }

  private async handleNetworkSettingsQuery(query: string, intent: any): Promise<string> {
    try {
      // Try to get services/network configurations
      const services = await apiService.getServices().catch(() => []);
      const globalSettings = this.context.globalSettings;

      if (services.length === 0 && !globalSettings) {
        return "I couldn't retrieve network configuration information. Please check your permissions.";
      }

      if (query.includes('ssid') || query.includes('network name')) {
        const ssids = services
          .filter(service => service.ssid)
          .map(service => `• **${service.ssid}** (${service.networkName || 'Default'})`)
          .slice(0, 10);

        return `📶 **Network SSIDs:**

${ssids.length > 0 ? ssids.join('\n') : 'No SSIDs configured or visible.'}

${ssids.length > 10 ? `\n...and ${services.length - 10} more networks` : ''}

Type "security settings" for encryption details.`;
      }

      if (query.includes('security') || query.includes('encryption')) {
        const securitySummary = services
          .filter(service => service.ssid)
          .map(service => `• **${service.ssid}**: ${service.securityMode || 'Unknown'} ${service.encryptionMethod || ''}`)
          .slice(0, 8);

        return `🔒 **Network Security:**

${securitySummary.length > 0 ? securitySummary.join('\n') : 'No security information available.'}

**Security Recommendations:**
✅ Use WPA3 when possible
✅ Enable strong passphrases  
✅ Regular security audits
✅ Guest network isolation`;
      }

      // General settings overview
      return `⚙️ **Network Configuration:**

**Total Networks**: ${services.length}
**Active SSIDs**: ${services.filter(s => s.ssid).length}

**Configuration Areas:**
• Wireless Networks & SSIDs
• Security & Encryption
• Access Control Policies
• Guest Access Settings
• Quality of Service (QoS)

Ask about specific settings like "SSIDs" or "security settings" for details.`;

    } catch (error) {
      return "I encountered an error retrieving network settings. Please try again.";
    }
  }

  private async handleSiteInfoQuery(query: string, intent: any): Promise<string> {
    const sites = this.context.sites || [];
    
    if (sites.length === 0) {
      return "I couldn't retrieve site information. Please check your permissions.";
    }

    if (intent.extractedEntities.site) {
      const site = sites.find(s => 
        s.name?.toLowerCase().includes(intent.extractedEntities.site)
      );
      
      if (site) {
        const siteAPs = this.context.accessPoints?.filter(ap => ap.siteId === site.id) || [];
        const siteClients = this.context.stations?.filter(station => station.siteId === site.id) || [];
        
        return `🏢 **Site: ${site.name}**

**Access Points**: ${siteAPs.length} (${siteAPs.filter(ap => ap.status?.toLowerCase() === 'online').length} online)
**Connected Clients**: ${siteClients.filter(c => c.status?.toLowerCase() === 'connected').length}
**Location**: ${site.address || site.location || 'Not specified'}
**Timezone**: ${site.timezone || 'Not specified'}

**Health Status**: ${this.calculateSiteHealth(siteAPs, siteClients)}`;
      }
    }

    // General sites overview
    const siteHealth = sites.map(site => {
      const siteAPs = this.context.accessPoints?.filter(ap => ap.siteId === site.id) || [];
      const onlineAPs = siteAPs.filter(ap => ap.status?.toLowerCase() === 'online');
      const healthScore = siteAPs.length > 0 ? (onlineAPs.length / siteAPs.length) * 100 : 0;
      
      return {
        name: site.name,
        health: healthScore,
        apCount: siteAPs.length
      };
    }).sort((a, b) => b.health - a.health);

    const healthySites = siteHealth.filter(s => s.health >= 90).length;
    const warningSites = siteHealth.filter(s => s.health >= 70 && s.health < 90).length;
    const criticalSites = siteHealth.filter(s => s.health < 70).length;

    const topSites = siteHealth.slice(0, 5).map(site => 
      `• **${site.name}**: ${site.health.toFixed(1)}% (${site.apCount} APs)`
    ).join('\n');

    return `🏢 **Sites Overview:**

**Total Sites**: ${sites.length}
**Health Distribution**:
• 🟢 **Healthy** (≥90%): ${healthySites} sites
• 🟡 **Warning** (70-89%): ${warningSites} sites  
• 🔴 **Critical** (<70%): ${criticalSites} sites

**Site Health Rankings:**
${topSites}

Ask about a specific site by name for detailed information.`;
  }

  private async handleTroubleshootingQuery(query: string, intent: any): Promise<string> {
    const aps = this.context.accessPoints || [];
    const stations = this.context.stations || [];
    
    if (query.includes("can't connect") || query.includes("cannot connect")) {
      return `🔧 **Connection Troubleshooting:**

**Quick Checks:**
1. **Verify SSID**: Ensure you're connecting to the correct network
2. **Check Password**: Confirm WiFi password is correct  
3. **Signal Strength**: Move closer to access point
4. **Device Limits**: Check if network has client limits

**Network Status:**
• Access Points Online: ${aps.filter(ap => ap.status?.toLowerCase() === 'online').length}/${aps.length}
• Active Clients: ${stations.filter(s => s.status?.toLowerCase() === 'connected').length}

**If problems persist:**
• Restart your device's WiFi
• Forget and reconnect to network
• Check for device-specific issues
• Contact IT support`;
    }

    if (query.includes('slow') || query.includes('performance')) {
      const poorSignalClients = stations.filter(station => {
        const rss = station.rss || station.signalStrength;
        return rss && parseInt(rss) < -70;
      }).length;

      return `🐌 **Performance Troubleshooting:**

**Current Network Load:**
• Connected Clients: ${stations.filter(s => s.status?.toLowerCase() === 'connected').length}
• Poor Signal Clients: ${poorSignalClients}

**Performance Optimization:**
1. **Signal Strength**: Move closer to access point
2. **Bandwidth**: Check for heavy usage applications
3. **Interference**: Avoid 2.4GHz congestion
4. **Access Point Load**: Balance across multiple APs

**Recommendations:**
• Use 5GHz when available
• Update device drivers
• Check background applications
• Consider mesh network expansion`;
    }

    // General troubleshooting
    const offlineAPs = aps.filter(ap => ap.status?.toLowerCase() === 'offline').length;
    const issues = [];
    
    if (offlineAPs > 0) issues.push(`${offlineAPs} access points offline`);
    if (poorSignalClients > 0) issues.push(`${poorSignalClients} clients with poor signal`);
    
    return `🛠️ **Network Health Check:**

${issues.length > 0 ? 
  `**Issues Detected:**\n${issues.map(issue => `⚠️ ${issue}`).join('\n')}` : 
  '✅ **No major issues detected**'
}

**Common Solutions:**
• **Connectivity**: Check "offline APs" for access point issues
• **Performance**: Ask about "slow performance" 
• **Client Issues**: Provide MAC address for specific client help
• **Network Settings**: Ask about "network configuration"

What specific issue can I help you troubleshoot?`;
  }

  private async handleStatsQuery(query: string, intent: any): Promise<string> {
    const aps = this.context.accessPoints || [];
    const stations = this.context.stations || [];
    const sites = this.context.sites || [];

    const onlineAPs = aps.filter(ap => ap.status?.toLowerCase() === 'online');
    const activeClients = stations.filter(station => 
      station.status?.toLowerCase() === 'connected' || 
      station.status?.toLowerCase() === 'associated'
    );

    const networkHealth = aps.length > 0 ? (onlineAPs.length / aps.length) * 100 : 0;
    
    // Calculate basic traffic stats if available
    let totalTraffic = 0;
    stations.forEach(station => {
      const rx = station.rxBytes || station.inBytes || 0;
      const tx = station.txBytes || station.outBytes || 0;
      totalTraffic += rx + tx;
    });

    return `📊 **Network Statistics Summary:**

**🏢 Infrastructure:**
• Sites: ${sites.length}
• Access Points: ${aps.length} (${onlineAPs.length} online)
• Network Health: ${networkHealth.toFixed(1)}%

**👥 Clients:**
• Active Connections: ${activeClients.length}
• Total Devices Tracked: ${stations.length}
• Device Types: ${this.getUniqueDeviceTypesCount()} different types

**📈 Performance:**
• Total Data Transfer: ${this.formatBytes(totalTraffic)}
• Average Clients per AP: ${aps.length > 0 ? (activeClients.length / aps.length).toFixed(1) : 0}
• Signal Quality: ${this.getSignalQualitySummary(activeClients)}

**⚡ Quick Actions:**
• Type "problems" for troubleshooting
• Type "offline APs" for device issues  
• Type "client count" for user details
• Type "sites" for location breakdown`;
  }

  private getHelpResponse(): string {
    return `🤖 **Network Assistant Help:**

I can help you with information about your EDGE network:

**📡 Access Points:**
• "How many access points?" - Get AP count and status
• "Offline APs" - Check for device issues
• "AP health" - Overall access point status

**👥 Connected Clients:**
• "How many clients?" - Client count and breakdown
• "Client [MAC address]" - Specific client details
• "Device types" - Connected device categories

**🔍 Search Clients:**
• "Find client [name]" - Search by hostname
• "Search device [IP]" - Search by IP address
• "Find client [MAC]" - Search by MAC address
• "Search for iPhone" - Search by device type

**📍 Roaming History:**
• "Roaming of [client]" - View client roaming history
• "Roaming [MAC address]" - Roaming events by MAC
• "Connection history [name]" - Where client has connected

**⚙️ Network Settings:**  
• "SSIDs" or "Network names" - View wireless networks
• "Security settings" - Encryption and security info
• "Network configuration" - General settings overview

**🏢 Sites & Locations:**
• "Sites" - Site health and status
• "Site [name]" - Specific site details

**🛠️ Troubleshooting:**
• "Problems" or "Issues" - Network health check
• "Can't connect" - Connection troubleshooting
• "Slow performance" - Performance optimization

**📊 Statistics:**
• "Overview" or "Summary" - Network statistics
• "Network health" - Overall system status

Try asking something like "How many clients are connected?" or "Show me offline access points"`;
  }

  // Helper methods
  private groupAPsBySite(aps: any[]): Record<string, number> {
    return aps.reduce((acc, ap) => {
      const site = ap.siteName || 'Unknown Site';
      acc[site] = (acc[site] || 0) + 1;
      return acc;
    }, {});
  }

  private groupClientsByType(clients: any[]): Record<string, number> {
    return clients.reduce((acc, client) => {
      const type = client.deviceType || 'Unknown Device';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
  }

  private groupClientsBySite(clients: any[]): Record<string, number> {
    return clients.reduce((acc, client) => {
      const site = client.siteName || 'Unknown Site';
      acc[site] = (acc[site] || 0) + 1;
      return acc;
    }, {});
  }

  private getClientsBySignalQuality(clients: any[], quality: string): number {
    return clients.filter(client => {
      const rss = client.rss || client.signalStrength;
      if (!rss) return false;
      
      const signal = parseInt(rss);
      switch (quality) {
        case 'excellent': return signal >= -30;
        case 'good': return signal >= -60 && signal < -30;
        case 'poor': return signal < -60;
        default: return false;
      }
    }).length;
  }

  private calculateSiteHealth(aps: any[], clients: any[]): string {
    if (aps.length === 0) return 'No APs';
    
    const onlineAPs = aps.filter(ap => ap.status?.toLowerCase() === 'online').length;
    const healthScore = (onlineAPs / aps.length) * 100;
    
    if (healthScore >= 90) return '🟢 Excellent';
    if (healthScore >= 70) return '🟡 Good';
    return '🔴 Needs Attention';
  }

  private getRecentActivitySummary(stations: any[]): string {
    const recentClients = stations.filter(station => {
      if (!station.lastSeen) return false;
      const lastSeen = new Date(station.lastSeen);
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      return lastSeen > fiveMinutesAgo;
    }).length;
    
    return `${recentClients} clients active in last 5 minutes`;
  }

  private getUniqueDeviceTypesCount(): number {
    const types = new Set(this.context.stations?.map(s => s.deviceType).filter(Boolean));
    return types.size;
  }

  private getSignalQualitySummary(clients: any[]): string {
    const excellent = this.getClientsBySignalQuality(clients, 'excellent');
    const good = this.getClientsBySignalQuality(clients, 'good');
    const poor = this.getClientsBySignalQuality(clients, 'poor');
    
    const total = excellent + good + poor;
    if (total === 0) return 'No signal data';
    
    const excellentPct = ((excellent / total) * 100).toFixed(0);
    return `${excellentPct}% excellent signal`;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export const chatbotService = new ChatbotService();