import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { AlertCircle, Save, RefreshCw, Plus, Trash2, Network, Shield, Wifi, Settings, Radio, Users, Globe, Lock, Unlock, Eye, EyeOff } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { Skeleton } from './ui/skeleton';
import { ScrollArea } from './ui/scroll-area';
import { apiService, Service, Role, Topology, AaaPolicy, ClassOfService } from '../services/api';
import { generateDefaultService, generatePrivacyConfig, validateServiceData } from '../utils/serviceDefaults';
import { toast } from 'sonner';

interface NetworkEditDetailProps {
  serviceId: string;
  onSave?: () => void;
  isInline?: boolean;
}

interface NetworkFormData {
  // Basic Settings
  name: string;
  ssid: string;
  description: string;
  enabled: boolean;

  // Security Configuration
  securityType: string; // open, wpa-personal, wpa2-personal, wpa3-personal, wpa-enterprise, etc.
  privacyType: string;
  authType: string;
  authMethod: string;
  encryption: string; // none, tkip, aes, tkip-aes
  passphrase: string;

  // WPA3-SAE Configuration
  pmfMode: string; // required, capable, disabled
  saeMethod: string; // SaeH2e, SaeLoop
  beaconProtection: boolean;

  // OWE (Enhanced Open)
  oweAutogen: boolean;
  oweCompanion: string;

  // Network Settings
  vlan: string;
  defaultTopology: string; // Topology UUID
  proxied: string; // Local, Centralized
  band: string;
  channel: string;
  broadcastSSID: boolean;
  hidden: boolean;

  // AAA/RADIUS
  aaaPolicyId: string;
  accountingEnabled: boolean;

  // Fast Transition (802.11r)
  fastTransitionEnabled: boolean;
  fastTransitionMdId: number;

  // Role Assignment
  authenticatedUserDefaultRoleID: string;
  unAuthenticatedUserDefaultRoleID: string;
  mbatimeoutRoleId: string;

  // 802.11k/v/r Support
  enabled11kSupport: boolean;
  rm11kBeaconReport: boolean;
  rm11kQuietIe: boolean;
  enable11mcSupport: boolean; // 802.11v

  // Band Steering
  bandSteering: boolean;
  mbo: boolean;

  // Access Control
  captivePortal: boolean;
  captivePortalType: string;
  eGuestPortalId: string;
  guestAccess: boolean;
  macBasedAuth: boolean;
  mbaAuthorization: boolean;
  macWhitelistEnabled: boolean;
  macBlacklistEnabled: boolean;

  // Client Management
  maxClients: number;
  maxClientsPer24: number;
  maxClientsPer5: number;
  sessionTimeout: number;
  preAuthenticatedIdleTimeout: number;
  postAuthenticatedIdleTimeout: number;
  idleTimeout: number; // For UI simplification
  clientToClientCommunication: boolean;
  flexibleClientAccess: boolean;
  purgeOnDisconnect: boolean;
  includeHostname: boolean;

  // Quality of Service
  defaultCoS: string; // CoS UUID
  bandwidthLimitEnabled: boolean;
  downloadLimit: number;
  uploadLimit: number;
  priorityLevel: string;
  uapsdEnabled: boolean;
  admissionControlVideo: boolean;
  admissionControlVoice: boolean;
  admissionControlBestEffort: boolean;
  admissionControlBackgroundTraffic: boolean;

  // Hotspot 2.0
  hotspotType: string; // Disabled, Hotspot20
  hotspot: boolean; // For UI toggle

  // Roaming
  roamingAssistPolicy: string;

  // Vendor Attributes
  vendorSpecificAttributes: string[]; // ["apName", "vnsName", "ssid"]

  // Mesh
  shutdownOnMeshpointLoss: boolean;

  // Advanced Settings
  defaultAuthRole: string; // Legacy field
  isolateClients: boolean; // Maps to !clientToClientCommunication
  fastRoaming: boolean; // Legacy field
  loadBalancing: boolean; // Legacy field
  radiusAccounting: boolean; // Maps to accountingEnabled
  customProperties: Record<string, string>;
}

export function NetworkEditDetail({ serviceId, onSave, isInline = false }: NetworkEditDetailProps) {
  const [service, setService] = useState<Service | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [topologies, setTopologies] = useState<Topology[]>([]);
  const [aaaPolicies, setAaaPolicies] = useState<AaaPolicy[]>([]);
  const [cosOptions, setCosOptions] = useState<ClassOfService[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState<NetworkFormData>({
    // Basic Settings
    name: '',
    ssid: '',
    description: '',
    enabled: true,

    // Security Configuration
    securityType: 'open',
    privacyType: '',
    authType: '',
    authMethod: '',
    encryption: 'none',
    passphrase: '',

    // WPA3-SAE Configuration
    pmfMode: 'disabled',
    saeMethod: 'SaeH2e',
    beaconProtection: false,

    // OWE (Enhanced Open)
    oweAutogen: false,
    oweCompanion: '',

    // Network Settings
    vlan: '',
    defaultTopology: '',
    proxied: 'Local',
    band: 'both',
    channel: 'auto',
    broadcastSSID: true,
    hidden: false,

    // AAA/RADIUS
    aaaPolicyId: '',
    accountingEnabled: false,

    // Fast Transition (802.11r)
    fastTransitionEnabled: false,
    fastTransitionMdId: 0,

    // Role Assignment
    authenticatedUserDefaultRoleID: '',
    unAuthenticatedUserDefaultRoleID: '',
    mbatimeoutRoleId: '',

    // 802.11k/v/r Support
    enabled11kSupport: false,
    rm11kBeaconReport: false,
    rm11kQuietIe: false,
    enable11mcSupport: false,

    // Band Steering
    bandSteering: false,
    mbo: false,

    // Access Control
    captivePortal: false,
    captivePortalType: '',
    eGuestPortalId: '',
    guestAccess: false,
    macBasedAuth: false,
    mbaAuthorization: false,
    macWhitelistEnabled: false,
    macBlacklistEnabled: false,

    // Client Management
    maxClients: 100,
    maxClientsPer24: 50,
    maxClientsPer5: 50,
    sessionTimeout: 0,
    preAuthenticatedIdleTimeout: 300,
    postAuthenticatedIdleTimeout: 1800,
    idleTimeout: 0,
    clientToClientCommunication: true,
    flexibleClientAccess: false,
    purgeOnDisconnect: false,
    includeHostname: false,

    // Quality of Service
    defaultCoS: '',
    bandwidthLimitEnabled: false,
    downloadLimit: 0,
    uploadLimit: 0,
    priorityLevel: 'normal',
    uapsdEnabled: true,
    admissionControlVideo: false,
    admissionControlVoice: false,
    admissionControlBestEffort: false,
    admissionControlBackgroundTraffic: false,

    // Hotspot 2.0
    hotspotType: 'Disabled',
    hotspot: false,

    // Roaming
    roamingAssistPolicy: '',

    // Vendor Attributes
    vendorSpecificAttributes: ['apName', 'vnsName', 'ssid'],

    // Mesh
    shutdownOnMeshpointLoss: false,

    // Advanced Settings (Legacy)
    defaultAuthRole: 'none',
    isolateClients: false,
    fastRoaming: false,
    loadBalancing: false,
    radiusAccounting: false,
    customProperties: {}
  });

  useEffect(() => {
    loadNetworkData();
  }, [serviceId]);

  const loadNetworkData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load all data sources in parallel
      const [serviceResponse, rolesResponse, topologiesResponse, aaaPoliciesResponse, cosResponse] = await Promise.allSettled([
        apiService.getServiceById(serviceId),
        apiService.getRoles(),
        apiService.getTopologies(),
        apiService.getAaaPolicies(),
        apiService.getClassOfService()
      ]);

      if (serviceResponse.status === 'fulfilled') {
        const serviceData = serviceResponse.value;
        setService(serviceData);

        console.log('Loading service data:', serviceData);

        // Get WPA3-SAE configuration
        const saeElement = serviceData.privacy?.WpaSaeElement || serviceData.WpaSaeElement;
        const pskElement = serviceData.privacy?.WpaPskElement || serviceData.WpaPskElement;
        const enterpriseElement = serviceData.privacy?.WpaEnterpriseElement || serviceData.WpaEnterpriseElement;

        // Map service data to comprehensive form data with ALL Campus Controller fields
        const mappedFormData = {
          // Basic Settings
          name: serviceData.serviceName || serviceData.name || serviceData.ssid || 'Unnamed Network',
          ssid: serviceData.ssid || serviceData.name || '',
          description: serviceData.description || '',
          enabled: serviceData.enabled !== false && serviceData.status !== 'disabled',

          // Security Configuration
          securityType: serviceData.security?.type || serviceData.securityType || 'open',
          privacyType: serviceData.security?.privacyType || serviceData.privacyType || '',
          authType: serviceData.security?.authType || serviceData.authType || '',
          authMethod: serviceData.security?.authMethod || serviceData.authMethod || '',
          encryption: serviceData.security?.encryption || serviceData.encryption || 'none',
          passphrase: pskElement?.presharedKey || saeElement?.presharedKey || serviceData.security?.passphrase || serviceData.passphrase || '',

          // WPA3-SAE Configuration
          pmfMode: saeElement?.pmfMode || pskElement?.pmfMode || enterpriseElement?.pmfMode || 'disabled',
          saeMethod: saeElement?.saeMethod || 'SaeH2e',
          beaconProtection: serviceData.beaconProtection || false,

          // OWE (Enhanced Open)
          oweAutogen: serviceData.oweAutogen || false,
          oweCompanion: serviceData.oweCompanion || '',

          // Network Settings
          vlan: (serviceData.vlan || serviceData.dot1dPortNumber || '').toString(),
          defaultTopology: serviceData.defaultTopology || '',
          proxied: serviceData.proxied || 'Local',
          band: serviceData.band || 'both',
          channel: serviceData.channel?.toString() || 'auto',
          broadcastSSID: !serviceData.suppressSsid && serviceData.broadcastSSID !== false,
          hidden: serviceData.suppressSsid || serviceData.hidden || false,

          // AAA/RADIUS
          aaaPolicyId: serviceData.aaaPolicyId || '',
          accountingEnabled: serviceData.accountingEnabled || false,

          // Fast Transition (802.11r)
          fastTransitionEnabled: enterpriseElement?.fastTransitionEnabled || false,
          fastTransitionMdId: enterpriseElement?.fastTransitionMdId || 0,

          // Role Assignment
          authenticatedUserDefaultRoleID: serviceData.authenticatedUserDefaultRoleID || '',
          unAuthenticatedUserDefaultRoleID: serviceData.unAuthenticatedUserDefaultRoleID || '',
          mbatimeoutRoleId: serviceData.mbatimeoutRoleId || '',

          // 802.11k/v/r Support
          enabled11kSupport: serviceData.enabled11kSupport || false,
          rm11kBeaconReport: serviceData.rm11kBeaconReport || false,
          rm11kQuietIe: serviceData.rm11kQuietIe || false,
          enable11mcSupport: serviceData.enable11mcSupport || false,

          // Band Steering
          bandSteering: serviceData.bandSteering || false,
          mbo: serviceData.mbo || false,

          // Access Control
          captivePortal: serviceData.captivePortal || serviceData.enableCaptivePortal || false,
          captivePortalType: serviceData.captivePortalType || '',
          eGuestPortalId: serviceData.eGuestPortalId || '',
          guestAccess: serviceData.guestAccess || false,
          macBasedAuth: serviceData.macBasedAuth || false,
          mbaAuthorization: serviceData.mbaAuthorization || false,
          macWhitelistEnabled: serviceData.macWhitelistEnabled || false,
          macBlacklistEnabled: serviceData.macBlacklistEnabled || false,

          // Client Management
          maxClients: serviceData.maxClients || 100,
          maxClientsPer24: serviceData.maxClientsPer24 || 50,
          maxClientsPer5: serviceData.maxClientsPer5 || 50,
          sessionTimeout: serviceData.sessionTimeout || 0,
          preAuthenticatedIdleTimeout: serviceData.preAuthenticatedIdleTimeout || 300,
          postAuthenticatedIdleTimeout: serviceData.postAuthenticatedIdleTimeout || 1800,
          idleTimeout: serviceData.idleTimeout || 0,
          clientToClientCommunication: serviceData.clientToClientCommunication !== false,
          flexibleClientAccess: serviceData.flexibleClientAccess || false,
          purgeOnDisconnect: serviceData.purgeOnDisconnect || false,
          includeHostname: serviceData.includeHostname || false,

          // Quality of Service
          defaultCoS: serviceData.defaultCoS || '',
          bandwidthLimitEnabled: serviceData.bandwidthLimitEnabled || false,
          downloadLimit: serviceData.downloadLimit || 0,
          uploadLimit: serviceData.uploadLimit || 0,
          priorityLevel: serviceData.priorityLevel || 'normal',
          uapsdEnabled: serviceData.uapsdEnabled !== false,
          admissionControlVideo: serviceData.admissionControlVideo || false,
          admissionControlVoice: serviceData.admissionControlVoice || false,
          admissionControlBestEffort: serviceData.admissionControlBestEffort || false,
          admissionControlBackgroundTraffic: serviceData.admissionControlBackgroundTraffic || false,

          // Hotspot 2.0
          hotspotType: serviceData.hotspotType || 'Disabled',
          hotspot: serviceData.hotspotType !== 'Disabled' && serviceData.hotspotType !== undefined,

          // Roaming
          roamingAssistPolicy: serviceData.roamingAssistPolicy || '',

          // Vendor Attributes
          vendorSpecificAttributes: serviceData.vendorSpecificAttributes || ['apName', 'vnsName', 'ssid'],

          // Mesh
          shutdownOnMeshpointLoss: serviceData.shutdownOnMeshpointLoss || false,

          // Advanced Settings (Legacy fields for backward compatibility)
          defaultAuthRole: serviceData.defaultAuthRole || 'none',
          isolateClients: !serviceData.clientToClientCommunication,
          fastRoaming: enterpriseElement?.fastTransitionEnabled || false,
          loadBalancing: serviceData.loadBalancing || false,
          radiusAccounting: serviceData.accountingEnabled || false,
          customProperties: serviceData.customProperties || {}
        };

        console.log('Mapped form data:', mappedFormData);
        setFormData(mappedFormData);
      } else {
        throw new Error('Failed to load service details');
      }

      // Set all optional data sources
      if (rolesResponse.status === 'fulfilled') {
        setRoles(rolesResponse.value);
      } else {
        setRoles([]);
      }

      if (topologiesResponse.status === 'fulfilled') {
        setTopologies(topologiesResponse.value);
      } else {
        setTopologies([]);
      }

      if (aaaPoliciesResponse.status === 'fulfilled') {
        setAaaPolicies(aaaPoliciesResponse.value);
      } else {
        setAaaPolicies([]);
      }

      if (cosResponse.status === 'fulfilled') {
        setCosOptions(cosResponse.value);
      } else {
        setCosOptions([]);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load network data';
      setError(errorMessage);
      toast.error('Failed to load network data', {
        description: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      if (!service) {
        throw new Error('Service data not loaded');
      }

      // Validate required fields
      if (!formData.name || !formData.name.trim()) {
        throw new Error('Network name is required');
      }
      if (!formData.ssid || !formData.ssid.trim()) {
        throw new Error('SSID is required');
      }

      console.log('=== SERVICE UPDATE DEBUG INFO ===');
      console.log('Service ID:', serviceId);
      console.log('Original service data:', JSON.stringify(service, null, 2));
      console.log('Form data changes:', {
        name: formData.name,
        ssid: formData.ssid,
        enabled: formData.enabled,
        securityType: formData.securityType,
        suppressSsid: formData.hidden,
        description: formData.description
      });
      
      // Generate privacy configuration if security type changed
      let privacyConfig = service.privacy;
      if (formData.passphrase && formData.passphrase.trim()) {
        privacyConfig = generatePrivacyConfig(formData.securityType, formData.passphrase);
        console.log('Generated new privacy config:', privacyConfig);
      }

      // Build complete service payload with ALL required fields
      // Start with defaults, then overlay existing service, then apply form changes
      const completeServiceData: Partial<Service> = {
        ...generateDefaultService(), // Start with all defaults
        ...service, // Overlay existing service data to preserve everything
        
        // Apply user's changes
        id: serviceId,
        serviceName: formData.name.trim(),
        ssid: formData.ssid.trim(),
        status: formData.enabled ? 'enabled' : 'disabled',
        suppressSsid: formData.hidden,
        privacy: privacyConfig,
        
        // Clean up any undefined or null values that might cause issues
        description: formData.description?.trim() || service.description || '',
      };
      
      console.log('=== COMPLETE SERVICE PAYLOAD ===');
      console.log(JSON.stringify(completeServiceData, null, 2));
      
      // Validate the complete payload
      const validation = validateServiceData(completeServiceData);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Send the complete service update
      const updatedService = await apiService.updateService(serviceId, completeServiceData);
      console.log('Service update successful!');
      
      // Update local service state with response
      setService(updatedService);
      
      toast.success('Network configuration saved successfully', {
        description: `Settings for ${formData.name} have been updated.`
      });

      // Call onSave callback to refresh parent component
      if (onSave) {
        onSave();
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save network configuration';
      setError(errorMessage);
      
      // Enhanced error logging for debugging
      console.error('=== COMPREHENSIVE ERROR ANALYSIS ===');
      console.error('Error message:', errorMessage);
      console.error('Error type:', typeof err);
      console.error('Error constructor:', err?.constructor?.name);
      console.error('Service ID:', serviceId);
      console.error('Original service structure:', Object.keys(service || {}));
      console.error('Form data structure:', {
        name: formData.name,
        ssid: formData.ssid,
        enabled: formData.enabled,
        securityType: formData.securityType,
        vlan: formData.vlan,
        description: formData.description
      });
      
      // Log specific Campus Controller API expectations
      console.error('Campus Controller API debugging hints:');
      console.error('- Check if service ID exists:', serviceId);
      console.error('- Verify field names match API expectations');
      console.error('- Check for required fields that might be missing');
      console.error('- VLAN field might need to be "vlan" instead of "dot1dPortNumber"');
      console.error('- Security settings might need to be nested in "security" object');
      
      if (err && typeof err === 'object') {
        console.error('Error object properties:', Object.getOwnPropertyNames(err));
        console.error('Error object values:', Object.fromEntries(
          Object.getOwnPropertyNames(err).map(prop => [prop, (err as any)[prop]])
        ));
      }
      
      // Provide actionable error message to user
      let userFriendlyError = errorMessage;
      if (errorMessage.includes('422')) {
        userFriendlyError = 'Validation failed. The Campus Controller rejected the update. Check that all field values are valid and try updating fewer fields at once.';
      } else if (errorMessage.includes('404')) {
        userFriendlyError = 'Service not found. The network configuration may have been deleted by another user.';
      } else if (errorMessage.includes('403')) {
        userFriendlyError = 'Access denied. You may not have permission to modify this network configuration.';
      }
      
      toast.error('Failed to save network configuration', {
        description: userFriendlyError,
        duration: 10000 // Longer duration for error messages
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof NetworkFormData, value: string | boolean | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="space-y-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={isInline ? "space-y-6 p-6" : "space-y-6 p-6"}>
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="basic">Basic</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="network">Network</TabsTrigger>
          <TabsTrigger value="access">Access</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        {/* Basic Settings Tab */}
        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Network className="h-5 w-5" />
                <span>Basic Configuration</span>
              </CardTitle>
              <CardDescription>
                Fundamental network settings and identification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="network-name">Network Name</Label>
                  <Input
                    id="network-name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter network name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="ssid">SSID</Label>
                  <Input
                    id="ssid"
                    value={formData.ssid}
                    onChange={(e) => handleInputChange('ssid', e.target.value)}
                    placeholder="Enter SSID"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Optional network description"
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Network Status</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable or disable this network
                  </p>
                </div>
                <Switch
                  checked={formData.enabled}
                  onCheckedChange={(checked) => handleInputChange('enabled', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings Tab */}
        <TabsContent value="security" className="space-y-6">
          {/* Basic Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Security Configuration</span>
              </CardTitle>
              <CardDescription>
                Configure authentication and encryption settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="security-type">Security Type</Label>
                  <Select value={formData.securityType} onValueChange={(value) => handleInputChange('securityType', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select security type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="owe">OWE (Enhanced Open)</SelectItem>
                      <SelectItem value="wep">WEP</SelectItem>
                      <SelectItem value="wpa-personal">WPA-Personal</SelectItem>
                      <SelectItem value="wpa2-personal">WPA2-Personal</SelectItem>
                      <SelectItem value="wpa3-personal">WPA3-Personal (SAE)</SelectItem>
                      <SelectItem value="wpa23-personal">WPA2/WPA3-Personal (Transition)</SelectItem>
                      <SelectItem value="wpa-enterprise">WPA-Enterprise</SelectItem>
                      <SelectItem value="wpa2-enterprise">WPA2-Enterprise</SelectItem>
                      <SelectItem value="wpa3-enterprise">WPA3-Enterprise</SelectItem>
                      <SelectItem value="wpa23-enterprise">WPA2/WPA3-Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="encryption">Encryption</Label>
                  <Select value={formData.encryption} onValueChange={(value) => handleInputChange('encryption', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select encryption" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="tkip">TKIP</SelectItem>
                      <SelectItem value="aes">AES</SelectItem>
                      <SelectItem value="tkip-aes">TKIP + AES</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.securityType !== 'open' && formData.securityType !== 'owe' && (
                <div className="space-y-2">
                  <Label htmlFor="passphrase">Passphrase</Label>
                  <Input
                    id="passphrase"
                    type="password"
                    value={formData.passphrase}
                    onChange={(e) => handleInputChange('passphrase', e.target.value)}
                    placeholder="Enter network passphrase (8-63 characters)"
                    minLength={8}
                    maxLength={63}
                  />
                  <p className="text-xs text-muted-foreground">8-63 characters for WPA/WPA2/WPA3</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* WPA3-SAE Configuration */}
          {(formData.securityType === 'wpa3-personal' || formData.securityType === 'wpa23-personal') && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">WPA3-SAE Configuration</CardTitle>
                <CardDescription>WPA3 Simultaneous Authentication of Equals settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pmf-mode">Protected Management Frames (PMF)</Label>
                    <Select value={formData.pmfMode} onValueChange={(value) => handleInputChange('pmfMode', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="required">Required (WPA3 only)</SelectItem>
                        <SelectItem value="capable">Capable (WPA2/WPA3 transition)</SelectItem>
                        <SelectItem value="disabled">Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Required for WPA3, prevents deauth attacks</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sae-method">SAE Method</Label>
                    <Select value={formData.saeMethod} onValueChange={(value) => handleInputChange('saeMethod', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SaeH2e">Hash-to-Element (Recommended)</SelectItem>
                        <SelectItem value="SaeLoop">Hunting-and-Pecking (Legacy)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">H2E provides better security</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Beacon Protection</Label>
                    <p className="text-sm text-muted-foreground">Enhanced WPA3 security feature</p>
                  </div>
                  <Switch
                    checked={formData.beaconProtection}
                    onCheckedChange={(checked) => handleInputChange('beaconProtection', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* OWE Configuration */}
          {formData.securityType === 'owe' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">OWE (Opportunistic Wireless Encryption)</CardTitle>
                <CardDescription>Enhanced Open - encryption without password</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Auto-generate OWE Transition SSID</Label>
                    <p className="text-sm text-muted-foreground">Create hidden SSID for legacy device compatibility</p>
                  </div>
                  <Switch
                    checked={formData.oweAutogen}
                    onCheckedChange={(checked) => handleInputChange('oweAutogen', checked)}
                  />
                </div>

                {formData.oweAutogen && (
                  <div className="space-y-2">
                    <Label htmlFor="owe-companion">OWE Companion SSID (Optional)</Label>
                    <Input
                      id="owe-companion"
                      value={formData.oweCompanion}
                      onChange={(e) => handleInputChange('oweCompanion', e.target.value)}
                      placeholder="Leave empty for auto-generated name"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* AAA/RADIUS Configuration */}
          {(formData.securityType.includes('enterprise')) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">AAA/RADIUS Configuration</CardTitle>
                <CardDescription>Enterprise authentication settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="aaa-policy">AAA Policy</Label>
                  <Select value={formData.aaaPolicyId} onValueChange={(value) => handleInputChange('aaaPolicyId', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select AAA policy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {aaaPolicies.map(policy => (
                        <SelectItem key={policy.id} value={policy.id}>
                          {policy.name || policy.policyName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {aaaPolicies.length === 0 && (
                    <p className="text-xs text-muted-foreground">No AAA policies configured</p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>RADIUS Accounting</Label>
                    <p className="text-sm text-muted-foreground">Track user session and usage data</p>
                  </div>
                  <Switch
                    checked={formData.accountingEnabled}
                    onCheckedChange={(checked) => handleInputChange('accountingEnabled', checked)}
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="text-sm font-medium">802.11r Fast Transition</h4>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Enable Fast Roaming (802.11r)</Label>
                      <p className="text-sm text-muted-foreground">Faster handoff between APs</p>
                    </div>
                    <Switch
                      checked={formData.fastTransitionEnabled}
                      onCheckedChange={(checked) => handleInputChange('fastTransitionEnabled', checked)}
                    />
                  </div>

                  {formData.fastTransitionEnabled && (
                    <div className="space-y-2">
                      <Label htmlFor="ft-mdid">Mobility Domain ID</Label>
                      <Input
                        id="ft-mdid"
                        type="number"
                        value={formData.fastTransitionMdId}
                        onChange={(e) => handleInputChange('fastTransitionMdId', parseInt(e.target.value) || 0)}
                        placeholder="0-65535"
                        min="0"
                        max="65535"
                      />
                      <p className="text-xs text-muted-foreground">Unique ID for this mobility domain</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Role Assignment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Role Assignment</CardTitle>
              <CardDescription>Default user roles for authentication states</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="unauth-role">Unauthenticated User Role</Label>
                <Select value={formData.unAuthenticatedUserDefaultRoleID} onValueChange={(value) => handleInputChange('unAuthenticatedUserDefaultRoleID', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select default role before authentication" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {roles.map(role => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Applied before user authenticates</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="auth-role">Authenticated User Role</Label>
                <Select value={formData.authenticatedUserDefaultRoleID} onValueChange={(value) => handleInputChange('authenticatedUserDefaultRoleID', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select default role after authentication" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {roles.map(role => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Applied after successful authentication</p>
              </div>

              {formData.macBasedAuth && (
                <div className="space-y-2">
                  <Label htmlFor="mba-timeout-role">MAC-Based Auth Timeout Role</Label>
                  <Select value={formData.mbatimeoutRoleId} onValueChange={(value) => handleInputChange('mbatimeoutRoleId', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role after MBA timeout" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {roles.map(role => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {roles.length === 0 && (
                <p className="text-xs text-muted-foreground">No roles configured</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Network Settings Tab */}
        <TabsContent value="network" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Wifi className="h-5 w-5" />
                <span>Network Settings</span>
              </CardTitle>
              <CardDescription>
                Configure VLAN, band, and broadcast settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vlan">VLAN ID</Label>
                  <Input
                    id="vlan"
                    type="number"
                    value={formData.vlan}
                    onChange={(e) => handleInputChange('vlan', e.target.value)}
                    placeholder="VLAN ID"
                    min="1"
                    max="4094"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="band">Frequency Band</Label>
                  <Select value={formData.band} onValueChange={(value) => handleInputChange('band', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select band" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2.4GHz">2.4GHz only</SelectItem>
                      <SelectItem value="5GHz">5GHz only</SelectItem>
                      <SelectItem value="both">Both 2.4GHz + 5GHz</SelectItem>
                      <SelectItem value="6GHz">6GHz only</SelectItem>
                      <SelectItem value="all">All bands</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="channel">Channel</Label>
                  <Select value={formData.channel} onValueChange={(value) => handleInputChange('channel', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select channel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto</SelectItem>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="6">6</SelectItem>
                      <SelectItem value="11">11</SelectItem>
                      <SelectItem value="36">36</SelectItem>
                      <SelectItem value="40">40</SelectItem>
                      <SelectItem value="44">44</SelectItem>
                      <SelectItem value="48">48</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Broadcast SSID</Label>
                    <p className="text-sm text-muted-foreground">
                      Make network visible to clients
                    </p>
                  </div>
                  <Switch
                    checked={formData.broadcastSSID}
                    onCheckedChange={(checked) => {
                      handleInputChange('broadcastSSID', checked);
                      handleInputChange('hidden', !checked);
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Hidden Network</Label>
                    <p className="text-sm text-muted-foreground">
                      Don't broadcast SSID (clients must know network name)
                    </p>
                  </div>
                  <Switch
                    checked={formData.hidden}
                    onCheckedChange={(checked) => {
                      handleInputChange('hidden', checked);
                      handleInputChange('broadcastSSID', !checked);
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Access Control Tab */}
        <TabsContent value="access" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lock className="h-5 w-5" />
                <span>Access Control</span>
              </CardTitle>
              <CardDescription>
                Configure client access and authentication policies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Captive Portal</Label>
                    <p className="text-sm text-muted-foreground">
                      Require web authentication before network access
                    </p>
                  </div>
                  <Switch
                    checked={formData.captivePortal}
                    onCheckedChange={(checked) => handleInputChange('captivePortal', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Guest Access</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow guest users with limited access
                    </p>
                  </div>
                  <Switch
                    checked={formData.guestAccess}
                    onCheckedChange={(checked) => handleInputChange('guestAccess', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>MAC-based Authentication</Label>
                    <p className="text-sm text-muted-foreground">
                      Authenticate devices based on MAC address
                    </p>
                  </div>
                  <Switch
                    checked={formData.macBasedAuth}
                    onCheckedChange={(checked) => handleInputChange('macBasedAuth', checked)}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Client Limits</h4>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="max-clients">Max Clients (Total)</Label>
                    <Input
                      id="max-clients"
                      type="number"
                      value={formData.maxClients}
                      onChange={(e) => handleInputChange('maxClients', parseInt(e.target.value) || 0)}
                      min="1"
                      max="1000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max-clients-24">Max Clients (2.4GHz)</Label>
                    <Input
                      id="max-clients-24"
                      type="number"
                      value={formData.maxClientsPer24}
                      onChange={(e) => handleInputChange('maxClientsPer24', parseInt(e.target.value) || 0)}
                      min="1"
                      max="500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max-clients-5">Max Clients (5GHz)</Label>
                    <Input
                      id="max-clients-5"
                      type="number"
                      value={formData.maxClientsPer5}
                      onChange={(e) => handleInputChange('maxClientsPer5', parseInt(e.target.value) || 0)}
                      min="1"
                      max="500"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Settings Tab */}
        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Advanced Configuration</span>
              </CardTitle>
              <CardDescription>
                Advanced network features and quality of service settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Hotspot Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable hotspot functionality
                    </p>
                  </div>
                  <Switch
                    checked={formData.hotspot}
                    onCheckedChange={(checked) => handleInputChange('hotspot', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Client Isolation</Label>
                    <p className="text-sm text-muted-foreground">
                      Prevent clients from communicating with each other
                    </p>
                  </div>
                  <Switch
                    checked={formData.isolateClients}
                    onCheckedChange={(checked) => handleInputChange('isolateClients', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Fast Roaming</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable fast roaming between access points
                    </p>
                  </div>
                  <Switch
                    checked={formData.fastRoaming}
                    onCheckedChange={(checked) => handleInputChange('fastRoaming', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Load Balancing</Label>
                    <p className="text-sm text-muted-foreground">
                      Distribute clients across access points
                    </p>
                  </div>
                  <Switch
                    checked={formData.loadBalancing}
                    onCheckedChange={(checked) => handleInputChange('loadBalancing', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center space-x-2"
        >
          <Save className={`h-4 w-4 ${saving ? 'animate-spin' : ''}`} />
          <span>{saving ? 'Saving...' : 'Save Changes'}</span>
        </Button>
      </div>
    </div>
  );
}