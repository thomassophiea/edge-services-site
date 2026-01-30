import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import {
  Search,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Server,
  Wifi,
  Users,
  Building2,
  Shield,
  Network,
  HardDrive,
  Activity,
  Settings,
  Key,
  MapPin,
  Radio,
  Globe,
  Cpu,
  Database,
  Lock,
  UserPlus,
  Gauge,
  Package,
  ArrowLeft,
  Download,
  FileJson
} from 'lucide-react';

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
  parameters?: string[];
}

interface ApiCategory {
  name: string;
  icon: any;
  description: string;
  endpoints: ApiEndpoint[];
}

const apiCategories: ApiCategory[] = [
  {
    name: 'Authentication',
    icon: Key,
    description: 'User authentication and session management',
    endpoints: [
      { method: 'POST', path: '/management/v1/oauth2/token', description: 'Login and obtain access token. Requires grant_type, userId, and password in request body.' },
      { method: 'POST', path: '/management/v1/oauth2/revoke', description: 'Logout and revoke the current access token. Invalidates the session.' },
      { method: 'GET', path: '/management/v1/oauth2/validate', description: 'Validate the current session and check if the access token is still valid.' },
    ]
  },
  {
    name: 'Sites',
    icon: Building2,
    description: 'Site configuration and management',
    endpoints: [
      { method: 'GET', path: '/v1/sites', description: 'Retrieve all sites in the organization. Returns site IDs, names, and configuration details.' },
      { method: 'GET', path: '/v1/sites/{siteId}', description: 'Get detailed information for a specific site including configuration and statistics.', parameters: ['siteId'] },
      { method: 'PUT', path: '/v1/sites/{siteId}', description: 'Update site configuration. Can modify name, location, timezone, and other settings.', parameters: ['siteId'] },
      { method: 'DELETE', path: '/v1/sites/{siteId}', description: 'Delete a site and all associated configurations. Use with caution.', parameters: ['siteId'] },
      { method: 'GET', path: '/v1/state/sites', description: 'Get real-time operational state of all sites including health status and alerts.' },
      { method: 'GET', path: '/v1/report/sites', description: 'Generate aggregated reports across all sites with traffic and performance metrics.' },
      { method: 'GET', path: '/v1/report/sites/{siteId}', description: 'Get detailed performance report for a specific site including throughput, clients, and events.', parameters: ['siteId'] },
      { method: 'GET', path: '/v1/report/sites/{siteId}/smartrf', description: 'Get SmartRF optimization data and channel utilization for the site.', parameters: ['siteId'] },
    ]
  },
  {
    name: 'Access Points',
    icon: Wifi,
    description: 'Access point management and monitoring',
    endpoints: [
      { method: 'GET', path: '/v1/aps', description: 'List all access points with basic information including serial number, model, and status.' },
      { method: 'POST', path: '/v1/aps/query', description: 'Query access points with advanced filters. Supports pagination, sorting, and field selection.' },
      { method: 'GET', path: '/v1/aps/query/columns', description: 'Get available columns for AP queries. Use to build dynamic filter interfaces.' },
      { method: 'GET', path: '/v1/aps/query/visualize', description: 'Get AP data formatted for visualization including coordinates and status indicators.' },
      { method: 'GET', path: '/v1/aps/{serialNumber}', description: 'Get complete details for a specific AP including radio config, connected clients, and diagnostics.', parameters: ['serialNumber'] },
      { method: 'PUT', path: '/v1/aps/{serialNumber}', description: 'Update AP configuration including name, location, radio settings, and network assignments.', parameters: ['serialNumber'] },
      { method: 'DELETE', path: '/v1/aps/{serialNumber}', description: 'Remove an access point from management. The AP will need to be re-adopted.', parameters: ['serialNumber'] },
      { method: 'GET', path: '/v1/aps/{serialNumber}/stations', description: 'List all clients currently connected to a specific access point.', parameters: ['serialNumber'] },
      { method: 'GET', path: '/v1/aps/{serialNumber}/lldp', description: 'Get LLDP neighbor discovery information showing connected network devices.', parameters: ['serialNumber'] },
      { method: 'GET', path: '/v1/aps/ifstats', description: 'Get interface statistics for all APs including CPU, memory, and throughput metrics.' },
      { method: 'GET', path: '/v1/aps/ifstats/{serialNumber}', description: 'Get detailed interface statistics for a specific AP.', parameters: ['serialNumber'] },
      { method: 'GET', path: '/v1/state/aps', description: 'Get real-time operational state of all APs including online/offline status.' },
      { method: 'GET', path: '/v1/aps/displaynames', description: 'Get display names for all APs. Useful for building selection dropdowns.' },
      { method: 'GET', path: '/v1/aps/swversion', description: 'Get current software versions running on all access points.' },
      { method: 'GET', path: '/v1/aps/list', description: 'Get a lightweight list of APs with essential fields for quick lookups.' },
      { method: 'POST', path: '/v1/aps/{serialNumber}/reboot', description: 'Reboot an access point. The AP will be offline briefly during restart.', parameters: ['serialNumber'] },
      { method: 'POST', path: '/v1/aps/{serialNumber}/reset', description: 'Factory reset an access point. All local configuration will be lost.', parameters: ['serialNumber'] },
      { method: 'POST', path: '/v1/aps/{serialNumber}/upgrade', description: 'Initiate firmware upgrade on an AP. Specify target version in request body.', parameters: ['serialNumber'] },
      { method: 'PUT', path: '/v1/aps/{serialNumber}/site', description: 'Move an AP to a different site. The AP will inherit the new site\'s configuration.', parameters: ['serialNumber'] },
      { method: 'GET', path: '/v1/aps/upgradeimagelist', description: 'List available firmware images for AP upgrades by hardware type.' },
      { method: 'GET', path: '/v1/aps/upgradeschedule', description: 'Get scheduled firmware upgrade tasks and their status.' },
      { method: 'GET', path: '/v1/aps/adoptionrules', description: 'Get AP adoption rules that determine automatic site assignment.' },
      { method: 'GET', path: '/v1/report/aps/{serialNumber}', description: 'Get comprehensive performance report for an AP including traffic, clients, and RF metrics.', parameters: ['serialNumber'] },
      { method: 'GET', path: '/v1/report/aps/{serialNumber}/smartrf', description: 'Get SmartRF analysis for an AP showing channel recommendations and interference.', parameters: ['serialNumber'] },
      { method: 'GET', path: '/v1/ap/environment/{serialNumber}', description: 'Get environmental data from AP sensors including temperature and interference levels.', parameters: ['serialNumber'] },
    ]
  },
  {
    name: 'Stations / Clients',
    icon: Users,
    description: 'Connected client management',
    endpoints: [
      { method: 'GET', path: '/v1/stations', description: 'List all connected wireless clients with MAC, IP, hostname, and connection details.' },
      { method: 'POST', path: '/v1/stations/query', description: 'Query stations with filters for site, SSID, device type, and more.' },
      { method: 'GET', path: '/v1/stations/query/columns', description: 'Get available columns for station queries to build dynamic filters.' },
      { method: 'GET', path: '/v1/stations/{macAddress}', description: 'Get detailed information for a specific client including session history.', parameters: ['macAddress'] },
      { method: 'GET', path: '/v1/stations/{macAddress}/history', description: 'Get historical connection data for a client showing roaming and reconnections.', parameters: ['macAddress'] },
      { method: 'GET', path: '/v1/stations/{macAddress}/location', description: 'Get last known location of a client based on AP proximity.', parameters: ['macAddress'] },
      { method: 'GET', path: '/v1/stations/events/{macAddress}', description: 'Get events for a specific client including auth, assoc, and roaming events.', parameters: ['macAddress'] },
      { method: 'POST', path: '/v1/stations/{macAddress}/deauth', description: 'Force disconnect a client. They may reconnect automatically.', parameters: ['macAddress'] },
      { method: 'POST', path: '/v1/stations/{macAddress}/block', description: 'Block a client MAC address. The client will not be able to connect.', parameters: ['macAddress'] },
      { method: 'DELETE', path: '/v1/stations/{macAddress}/block', description: 'Remove a client from the block list, allowing them to connect again.', parameters: ['macAddress'] },
      { method: 'POST', path: '/v1/stations/{macAddress}/bandwidth/limit', description: 'Apply bandwidth limit to a specific client session.', parameters: ['macAddress'] },
      { method: 'POST', path: '/v1/stations/disassociate', description: 'Disassociate multiple clients by MAC address. Accepts array in body.' },
      { method: 'POST', path: '/v1/stations/reauthenticate', description: 'Force reauthentication for multiple clients. Useful for policy changes.' },
      { method: 'DELETE', path: '/v1/stations', description: 'Delete station records from the database. Does not affect active sessions.' },
      { method: 'GET', path: '/v1/stations/blocked', description: 'List all blocked MAC addresses with reason and timestamp.' },
      { method: 'POST', path: '/v1/stations/allowlist', description: 'Add MAC addresses to the allow list for MAC filtering.' },
      { method: 'POST', path: '/v1/stations/denylist', description: 'Add MAC addresses to the deny list for MAC filtering.' },
      { method: 'GET', path: '/v1/report/stations/{macAddress}', description: 'Get performance report for a client including throughput and signal quality.', parameters: ['macAddress'] },
    ]
  },
  {
    name: 'Services / Networks',
    icon: Network,
    description: 'Wireless network services (SSIDs)',
    endpoints: [
      { method: 'GET', path: '/v1/services', description: 'List all wireless services (SSIDs) with their configuration and status.' },
      { method: 'POST', path: '/v1/services', description: 'Create a new wireless service. Specify SSID, security, VLAN, and other settings.' },
      { method: 'GET', path: '/v1/services/{serviceId}', description: 'Get detailed configuration for a specific service including all security settings.', parameters: ['serviceId'] },
      { method: 'PUT', path: '/v1/services/{serviceId}', description: 'Update service configuration. Changes may cause brief client disconnections.', parameters: ['serviceId'] },
      { method: 'DELETE', path: '/v1/services/{serviceId}', description: 'Delete a wireless service. All clients will be disconnected.', parameters: ['serviceId'] },
      { method: 'GET', path: '/v1/services/{serviceId}/stations', description: 'List all clients connected to a specific service/SSID.', parameters: ['serviceId'] },
      { method: 'GET', path: '/v1/report/services/{serviceId}', description: 'Get performance report for a service including client count and throughput.', parameters: ['serviceId'] },
    ]
  },
  {
    name: 'Roles',
    icon: Shield,
    description: 'User role management and policies',
    endpoints: [
      { method: 'GET', path: '/v1/roles', description: 'List all user roles with their permissions and policy assignments.' },
      { method: 'POST', path: '/v1/roles', description: 'Create a new role with specified permissions and network access policies.' },
      { method: 'GET', path: '/v1/roles/{roleId}', description: 'Get detailed role configuration including all assigned policies.', parameters: ['roleId'] },
      { method: 'PUT', path: '/v1/roles/{roleId}', description: 'Update role configuration. Changes apply to all users with this role.', parameters: ['roleId'] },
      { method: 'DELETE', path: '/v1/roles/{roleId}', description: 'Delete a role. Users will need to be reassigned to another role.', parameters: ['roleId'] },
      { method: 'GET', path: '/v1/report/roles/{roleId}', description: 'Get usage report for a role showing assigned users and session data.', parameters: ['roleId'] },
    ]
  },
  {
    name: 'Switches',
    icon: Server,
    description: 'Network switch management',
    endpoints: [
      { method: 'GET', path: '/v1/switches', description: 'List all managed switches with model, firmware, and status information.' },
      { method: 'GET', path: '/v1/switches/{serialNumber}', description: 'Get detailed switch information including port configuration and VLANs.', parameters: ['serialNumber'] },
      { method: 'GET', path: '/v1/switches/{serialNumber}/ports', description: 'List all ports on a switch with status, speed, and connected devices.', parameters: ['serialNumber'] },
      { method: 'GET', path: '/v1/switches/{serialNumber}/poe', description: 'Get PoE status for all ports including power draw and available budget.', parameters: ['serialNumber'] },
      { method: 'GET', path: '/v1/switches/displaynames', description: 'Get display names for all switches for UI selection components.' },
      { method: 'GET', path: '/v1/switches/list', description: 'Get lightweight switch list for quick lookups and dashboards.' },
      { method: 'GET', path: '/v1/report/switches/{serialNumber}', description: 'Get performance report for a switch including throughput and errors.', parameters: ['serialNumber'] },
      { method: 'GET', path: '/v1/report/switches/{serialNumber}/ports', description: 'Get detailed port statistics report for a switch.', parameters: ['serialNumber'] },
      { method: 'GET', path: '/v1/report/ports/{portId}', description: 'Get traffic and error statistics for a specific switch port.', parameters: ['portId'] },
    ]
  },
  {
    name: 'Profiles',
    icon: Settings,
    description: 'Configuration profiles',
    endpoints: [
      { method: 'GET', path: '/v1/profiles', description: 'List all configuration profiles including device groups and templates.' },
      { method: 'GET', path: '/v1/profiles/{profileId}', description: 'Get complete profile configuration with all assigned services and settings.', parameters: ['profileId'] },
      { method: 'GET', path: '/v1/profiles/rf-management', description: 'Get RF management profiles for radio configuration and power settings.' },
      { method: 'GET', path: '/v1/profiles/iot', description: 'Get IoT profiles for BLE and Zigbee radio configuration.' },
      { method: 'GET', path: '/v1/profiles/adsp', description: 'Get ADSP (AirDefense) profiles for wireless intrusion detection.' },
      { method: 'GET', path: '/v1/profiles/analytics', description: 'Get analytics profiles for location and presence services.' },
      { method: 'GET', path: '/v1/profiles/positioning', description: 'Get positioning profiles for indoor location services.' },
      { method: 'GET', path: '/v1/profiles/switch-port', description: 'Get switch port profiles for VLAN and security configuration.' },
      { method: 'GET', path: '/v1/devicegroups', description: 'List all device groups that can be assigned to profiles.' },
      { method: 'GET', path: '/v1/devicegroups/{siteId}', description: 'Get device groups for a specific site.', parameters: ['siteId'] },
    ]
  },
  {
    name: 'Reports & Analytics',
    icon: Activity,
    description: 'Reporting and analytics data',
    endpoints: [
      { method: 'GET', path: '/v1/report/flex/{duration}', description: 'Get flexible time-range report. Duration format: 1H, 24H, 7D, 30D.', parameters: ['duration'] },
      { method: 'GET', path: '/v1/reports/templates', description: 'List available report templates for scheduled and ad-hoc reports.' },
      { method: 'GET', path: '/v1/reports/scheduled', description: 'Get all scheduled reports with next run time and recipients.' },
      { method: 'GET', path: '/v1/reports/generated', description: 'List previously generated reports available for download.' },
      { method: 'GET', path: '/v1/reports/widgets', description: 'Get dashboard widget data for real-time metrics display.' },
      { method: 'GET', path: '/v1/state/entityDistribution', description: 'Get distribution of entities (APs, clients, services) across sites.' },
      { method: 'GET', path: '/v1/analytics/wireless/interference', description: 'Get RF interference analysis showing channel utilization and noise.' },
      { method: 'GET', path: '/v1/analytics/wireless/coverage', description: 'Get coverage analysis showing signal strength distribution.' },
      { method: 'GET', path: '/v1/analytics/clients/roaming', description: 'Get client roaming analytics showing handoff success and latency.' },
    ]
  },
  {
    name: 'Radio & RF',
    icon: Radio,
    description: 'Radio and RF management',
    endpoints: [
      { method: 'GET', path: '/v1/radios/channels', description: 'Get available radio channels by regulatory domain and band.' },
      { method: 'GET', path: '/v1/radios/modes', description: 'Get supported radio modes (a/b/g/n/ac/ax) by hardware type.' },
      { method: 'GET', path: '/v1/rtlsprofile', description: 'Get RTLS profiles for real-time location system integration.' },
      { method: 'GET', path: '/v1/dpisignatures', description: 'Get DPI (Deep Packet Inspection) signatures for application visibility.' },
      { method: 'GET', path: '/v1/ratelimiters', description: 'List rate limiter profiles for bandwidth management.' },
      { method: 'GET', path: '/v1/cos', description: 'Get Class of Service profiles for QoS and traffic prioritization.' },
    ]
  },
  {
    name: 'Security',
    icon: Lock,
    description: 'Security and threat management',
    endpoints: [
      { method: 'POST', path: '/v1/security/rogue-ap/detect', description: 'Trigger on-demand rogue AP detection scan across all APs.' },
      { method: 'GET', path: '/v1/security/rogue-ap/list', description: 'List detected rogue APs with classification and threat level.' },
      { method: 'POST', path: '/v1/security/rogue-ap/{mac}/classify', description: 'Classify a detected AP as rogue, neighbor, or known.', parameters: ['mac'] },
      { method: 'GET', path: '/v1/security/threats', description: 'Get active security threats including DoS attacks and intrusions.' },
      { method: 'POST', path: '/v1/security/wids/enable', description: 'Enable WIDS (Wireless Intrusion Detection System) monitoring.' },
      { method: 'GET', path: '/v1/aaapolicy', description: 'Get AAA (Authentication, Authorization, Accounting) policies.' },
      { method: 'GET', path: '/v1/accesscontrol', description: 'Get access control rules and firewall policies.' },
    ]
  },
  {
    name: 'Guest Management',
    icon: UserPlus,
    description: 'Guest access and captive portal',
    endpoints: [
      { method: 'GET', path: '/v1/guests', description: 'List all guest accounts with status and expiration time.' },
      { method: 'POST', path: '/v1/guests/create', description: 'Create a new guest account with specified duration and bandwidth.' },
      { method: 'DELETE', path: '/v1/guests/{id}', description: 'Delete a guest account, immediately revoking access.', parameters: ['id'] },
      { method: 'POST', path: '/v1/guests/{id}/voucher', description: 'Generate a printable voucher for guest account credentials.', parameters: ['id'] },
      { method: 'GET', path: '/v1/guests/portal/config', description: 'Get captive portal configuration including branding and terms.' },
      { method: 'POST', path: '/v1/guests/portal/customize', description: 'Customize captive portal appearance and authentication options.' },
      { method: 'GET', path: '/v1/eguest', description: 'Get eGuest configuration for self-service guest registration.' },
    ]
  },
  {
    name: 'Location Services',
    icon: MapPin,
    description: 'Location tracking and analytics',
    endpoints: [
      { method: 'POST', path: '/v1/location/zone/create', description: 'Create a location zone for presence analytics and notifications.' },
      { method: 'GET', path: '/v1/location/zone/list', description: 'List all defined location zones with boundaries and settings.' },
      { method: 'POST', path: '/v1/location/presence/notify', description: 'Configure presence notifications when devices enter/exit zones.' },
      { method: 'GET', path: '/v1/location/analytics/dwell', description: 'Get dwell time analytics showing how long visitors stay in zones.' },
      { method: 'GET', path: '/v1/location/analytics/traffic', description: 'Get foot traffic analytics showing visitor patterns over time.' },
      { method: 'GET', path: '/v1/report/location/aps/{serialNumber}', description: 'Get location report centered on a specific AP.', parameters: ['serialNumber'] },
      { method: 'GET', path: '/v1/report/location/floor/{floorId}', description: 'Get location report for a floor plan showing device positions.', parameters: ['floorId'] },
      { method: 'GET', path: '/v1/report/location/stations/{stationId}', description: 'Get location history for a specific station.', parameters: ['stationId'] },
    ]
  },
  {
    name: 'QoS',
    icon: Gauge,
    description: 'Quality of Service management',
    endpoints: [
      { method: 'POST', path: '/v1/qos/policy/create', description: 'Create a QoS policy for traffic classification and prioritization.' },
      { method: 'GET', path: '/v1/qos/statistics', description: 'Get QoS statistics showing traffic classification distribution.' },
      { method: 'POST', path: '/v1/qos/bandwidth/allocate', description: 'Allocate bandwidth to specific applications or user groups.' },
      { method: 'GET', path: '/v1/qos/dscp/mappings', description: 'Get DSCP (Differentiated Services Code Point) to queue mappings.' },
    ]
  },
  {
    name: 'Events & Alarms',
    icon: Activity,
    description: 'System events and alarms',
    endpoints: [
      { method: 'GET', path: '/v1/events', description: 'Get system events with filtering by type, severity, and time range.' },
      { method: 'GET', path: '/v1/alarms', description: 'List all alarms including historical and acknowledged alarms.' },
      { method: 'GET', path: '/v1/alarms/active', description: 'Get only active (unacknowledged) alarms requiring attention.' },
      { method: 'POST', path: '/v1/alarms/{id}/acknowledge', description: 'Acknowledge an alarm. The alarm remains visible but marked as seen.', parameters: ['id'] },
      { method: 'POST', path: '/v1/alarms/{id}/clear', description: 'Clear an alarm, removing it from the active alarm list.', parameters: ['id'] },
      { method: 'GET', path: '/v1/auditlogs', description: 'Get audit logs showing administrative actions and configuration changes.' },
    ]
  },
  {
    name: 'Platform Manager',
    icon: Cpu,
    description: 'OS ONE system management',
    endpoints: [
      { method: 'GET', path: '/platformmanager/v1/reports/systeminformation', description: 'Get system information including CPU, memory, and uptime statistics.' },
      { method: 'GET', path: '/platformmanager/v1/reports/manufacturinginformation', description: 'Get hardware manufacturing details including model and serial numbers.' },
      { method: 'GET', path: '/platformmanager/v1/configuration/backups', description: 'List available configuration backup files with timestamps.' },
      { method: 'POST', path: '/platformmanager/v1/configuration/backup', description: 'Create a new configuration backup. Optionally include a description.' },
      { method: 'POST', path: '/platformmanager/v1/configuration/restore', description: 'Restore configuration from a backup file. System may restart.' },
      { method: 'GET', path: '/platformmanager/v1/configuration/download/{filename}', description: 'Download a configuration backup file for offline storage.', parameters: ['filename'] },
      { method: 'GET', path: '/platformmanager/v1/license/info', description: 'Get license information including features, capacity, and expiration.' },
      { method: 'GET', path: '/platformmanager/v1/license/usage', description: 'Get license usage showing consumed vs available capacity.' },
      { method: 'POST', path: '/platformmanager/v1/license/install', description: 'Install a new license file to enable features or add capacity.' },
      { method: 'GET', path: '/platformmanager/v1/flash/files', description: 'List files stored in flash memory including firmware images.' },
      { method: 'GET', path: '/platformmanager/v1/flash/usage', description: 'Get flash storage usage and available space.' },
      { method: 'DELETE', path: '/platformmanager/v1/flash/files/{filename}', description: 'Delete a file from flash storage to free up space.', parameters: ['filename'] },
      { method: 'POST', path: '/platformmanager/v1/network/ping', description: 'Execute a ping test from Extreme Platform ONE to a specified host.' },
      { method: 'POST', path: '/platformmanager/v1/network/traceroute', description: 'Execute a traceroute from Extreme Platform ONE to diagnose routing.' },
      { method: 'POST', path: '/platformmanager/v1/network/dns', description: 'Perform DNS lookup from Extreme Platform ONE to verify name resolution.' },
    ]
  },
  {
    name: 'Packet Capture',
    icon: Database,
    description: 'Network packet capture',
    endpoints: [
      { method: 'POST', path: '/platformmanager/v1/startappacketcapture', description: 'Start packet capture on an AP. Specify interface, filter, and duration.' },
      { method: 'PUT', path: '/platformmanager/v1/stopappacketcapture', description: 'Stop an active packet capture and finalize the capture file.' },
      { method: 'GET', path: '/v1/packetcapture/active', description: 'List currently active packet capture sessions.' },
      { method: 'GET', path: '/v1/packetcapture/files', description: 'List completed capture files available for download.' },
      { method: 'GET', path: '/v1/packetcapture/download/{id}', description: 'Download a packet capture file in PCAP format.', parameters: ['id'] },
      { method: 'DELETE', path: '/v1/packetcapture/delete/{id}', description: 'Delete a packet capture file to free storage space.', parameters: ['id'] },
      { method: 'GET', path: '/v1/packetcapture/status/{id}', description: 'Get status of a packet capture including size and duration.', parameters: ['id'] },
    ]
  },
  {
    name: 'Applications',
    icon: Package,
    description: 'Container and application management',
    endpoints: [
      { method: 'GET', path: '/appsmanager/v1/applications', description: 'List installed applications with version and status information.' },
      { method: 'POST', path: '/appsmanager/v1/applications/install', description: 'Install a new application from the app catalog or local file.' },
      { method: 'GET', path: '/appsmanager/v1/containers', description: 'List running containers with resource usage statistics.' },
      { method: 'POST', path: '/appsmanager/v1/containers/create', description: 'Create and start a new container from an image.' },
      { method: 'GET', path: '/appsmanager/v1/storage', description: 'Get storage allocation and usage for applications.' },
      { method: 'GET', path: '/appsmanager/v1/images', description: 'List available container images for deployment.' },
    ]
  },
  {
    name: 'AFC (6 GHz)',
    icon: Globe,
    description: 'Automated Frequency Coordination for 6 GHz operation',
    endpoints: [
      { method: 'GET', path: '/v1/afc/plans', description: 'List AFC plans with registration status and channel assignments.' },
      { method: 'POST', path: '/v1/afc/plans', description: 'Create an AFC plan for 6 GHz standard power operation.' },
      { method: 'POST', path: '/v1/afc/plans/{id}/analyze', description: 'Analyze an AFC plan to determine available channels and power levels.', parameters: ['id'] },
      { method: 'DELETE', path: '/v1/afc/plans/{id}', description: 'Delete an AFC plan and associated frequency authorizations.', parameters: ['id'] },
    ]
  },
  {
    name: 'System',
    icon: Settings,
    description: 'System configuration',
    endpoints: [
      { method: 'GET', path: '/v1/system/config', description: 'Get system configuration including network settings and features.' },
      { method: 'GET', path: '/v1/version', description: 'Get API and system version information.' },
      { method: 'GET', path: '/v1/cluster/status', description: 'Get cluster status for high-availability deployments.' },
      { method: 'GET', path: '/v1/globalsettings', description: 'Get global settings that apply across all sites.' },
      { method: 'GET', path: '/v1/snmp', description: 'Get SNMP configuration for network monitoring integration.' },
      { method: 'GET', path: '/v1/nsightconfig', description: 'Get NSight analytics configuration for cloud integration.' },
      { method: 'GET', path: '/v1/bestpractices/evaluate', description: 'Evaluate configuration against best practices and get recommendations.' },
      { method: 'GET', path: '/v1/workflow', description: 'Get workflow configuration for automated operations.' },
      { method: 'GET', path: '/v1/administrators', description: 'List administrator accounts and their permission levels.' },
      { method: 'GET', path: '/v1/appkeys', description: 'List API keys for programmatic access.' },
      { method: 'GET', path: '/v1/devices/types', description: 'Get supported device types and their capabilities.' },
      { method: 'GET', path: '/v1/deviceimages/{hwType}', description: 'Get available firmware images for a specific hardware type.', parameters: ['hwType'] },
    ]
  },
];

const methodColors: Record<string, string> = {
  GET: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  POST: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  PUT: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  DELETE: 'bg-red-500/20 text-red-400 border-red-500/30',
  PATCH: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

interface ApiDocumentationProps {
  onNavigateBack?: () => void;
  onClose?: () => void;
}

export function ApiDocumentation({ onNavigateBack, onClose }: ApiDocumentationProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(apiCategories.map(c => c.name)) // All expanded by default
  );
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return apiCategories;

    const query = searchQuery.toLowerCase();
    return apiCategories
      .map(category => ({
        ...category,
        endpoints: category.endpoints.filter(
          endpoint =>
            endpoint.path.toLowerCase().includes(query) ||
            endpoint.description.toLowerCase().includes(query) ||
            endpoint.method.toLowerCase().includes(query)
        )
      }))
      .filter(category =>
        category.endpoints.length > 0 ||
        category.name.toLowerCase().includes(query) ||
        category.description.toLowerCase().includes(query)
      );
  }, [searchQuery]);

  const totalEndpoints = useMemo(() =>
    apiCategories.reduce((sum, cat) => sum + cat.endpoints.length, 0),
    []
  );

  const toggleCategory = (name: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(name)) {
      newExpanded.delete(name);
    } else {
      newExpanded.add(name);
    }
    setExpandedCategories(newExpanded);
  };

  const expandAll = () => {
    setExpandedCategories(new Set(apiCategories.map(c => c.name)));
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  const copyToClipboard = async (path: string) => {
    try {
      await navigator.clipboard.writeText(path);
      setCopiedPath(path);
      setTimeout(() => setCopiedPath(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleBack = () => {
    if (onNavigateBack) {
      onNavigateBack();
    } else if (onClose) {
      onClose();
    }
  };

  const handleDownloadSwagger = () => {
    // Create a link to download the swagger.json file
    const link = document.createElement('a');
    link.href = '/swagger.json';
    link.download = 'edge-platform-api-swagger.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">API Documentation</h1>
            <p className="text-sm text-muted-foreground">
              EDGE Platform REST API Reference • {apiCategories.length} categories • {totalEndpoints} endpoints
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={handleDownloadSwagger} className="gap-2">
          <FileJson className="h-4 w-4" />
          Download OpenAPI Spec
        </Button>
      </div>

      {/* Search and controls */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search endpoints, methods, or descriptions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={expandAll}>
          Expand All
        </Button>
        <Button variant="outline" size="sm" onClick={collapseAll}>
          Collapse All
        </Button>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {filteredCategories.map((category) => {
          const IconComponent = category.icon;
          const isExpanded = expandedCategories.has(category.name);

          return (
            <Card key={category.name} className="overflow-hidden">
              <Collapsible open={isExpanded} onOpenChange={() => toggleCategory(category.name)}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <IconComponent className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            {category.name}
                            <Badge variant="secondary" className="font-normal">
                              {category.endpoints.length}
                            </Badge>
                          </CardTitle>
                          <CardDescription>{category.description}</CardDescription>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <Separator />
                  <CardContent className="p-0">
                    <div className="divide-y divide-border/50">
                      {category.endpoints.map((endpoint, idx) => (
                        <div
                          key={idx}
                          className="px-4 py-3 hover:bg-accent/30 transition-colors group"
                        >
                          <div className="flex items-start gap-4">
                            <Badge
                              variant="outline"
                              className={`w-16 justify-center font-mono text-xs flex-shrink-0 mt-0.5 ${methodColors[endpoint.method]}`}
                            >
                              {endpoint.method}
                            </Badge>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <code className="text-sm font-mono text-foreground/90 break-all">
                                  {endpoint.path}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                  onClick={() => copyToClipboard(endpoint.path)}
                                >
                                  {copiedPath === endpoint.path ? (
                                    <Check className="h-3 w-3 text-green-500" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {endpoint.description}
                              </p>
                              {endpoint.parameters && endpoint.parameters.length > 0 && (
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="text-xs text-muted-foreground">Parameters:</span>
                                  {endpoint.parameters.map((param) => (
                                    <Badge key={param} variant="outline" className="text-xs font-mono">
                                      {param}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}

        {filteredCategories.length === 0 && (
          <div className="text-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No endpoints found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search query
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ApiDocumentation;
