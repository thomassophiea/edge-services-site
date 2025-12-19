import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Checkbox } from './ui/checkbox';
import { AlertCircle, Users, Search, RefreshCw, Filter, Wifi, Activity, Timer, Signal, Download, Upload, Shield, Router, MapPin, User, Clock, Star, Trash2, UserX, RotateCcw, UserPlus, UserMinus, ShieldCheck, ShieldX, Info, Radio, WifiOff, SignalHigh, SignalMedium, SignalLow, SignalZero, Cable, Shuffle, Columns } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { Alert, AlertDescription } from './ui/alert';
import { Skeleton } from './ui/skeleton';
import { apiService, Station } from '../services/api';
import { identifyClient, lookupVendor, suggestDeviceType } from '../services/ouiLookup';
import { toast } from 'sonner';

// Define available columns with friendly labels
interface ColumnConfig {
  key: string;
  label: string;
  defaultVisible: boolean;
  category: 'basic' | 'network' | 'connection' | 'performance' | 'advanced';
}

const AVAILABLE_COLUMNS: ColumnConfig[] = [
  // Basic columns (default visible)
  { key: 'status', label: 'Status / Last Seen', defaultVisible: true, category: 'basic' },
  { key: 'clientInfo', label: 'Client Info', defaultVisible: true, category: 'basic' },
  { key: 'deviceInfo', label: 'Device Info', defaultVisible: true, category: 'basic' },

  // Network columns
  { key: 'userNetwork', label: 'User & Network', defaultVisible: true, category: 'network' },
  { key: 'accessPoint', label: 'Access Point', defaultVisible: true, category: 'network' },
  { key: 'siteName', label: 'Site Name', defaultVisible: false, category: 'network' },
  { key: 'network', label: 'Network', defaultVisible: false, category: 'network' },
  { key: 'role', label: 'Role', defaultVisible: false, category: 'network' },
  { key: 'username', label: 'Username', defaultVisible: false, category: 'network' },

  // Connection columns
  { key: 'band', label: 'Band', defaultVisible: true, category: 'connection' },
  { key: 'signal', label: 'Signal', defaultVisible: true, category: 'connection' },
  { key: 'rssi', label: 'RSS (dBm)', defaultVisible: false, category: 'connection' },
  { key: 'channel', label: 'Channel', defaultVisible: false, category: 'connection' },
  { key: 'protocol', label: 'Protocol', defaultVisible: false, category: 'connection' },
  { key: 'rxRate', label: 'Rx Rate', defaultVisible: false, category: 'connection' },
  { key: 'txRate', label: 'Tx Rate', defaultVisible: false, category: 'connection' },
  { key: 'spatialStreams', label: 'Spatial Streams', defaultVisible: false, category: 'connection' },
  { key: 'capabilities', label: 'Capabilities', defaultVisible: false, category: 'connection' },

  // Performance columns
  { key: 'traffic', label: 'Traffic', defaultVisible: true, category: 'performance' },
  { key: 'inBytes', label: 'In Bytes', defaultVisible: false, category: 'performance' },
  { key: 'outBytes', label: 'Out Bytes', defaultVisible: false, category: 'performance' },
  { key: 'inPackets', label: 'In Packets', defaultVisible: false, category: 'performance' },
  { key: 'outPackets', label: 'Out Packets', defaultVisible: false, category: 'performance' },
  { key: 'dlLostRetriesPackets', label: 'Dl Lost Retries Packets', defaultVisible: false, category: 'performance' },

  // Advanced columns
  { key: 'macAddress', label: 'MAC Address', defaultVisible: false, category: 'advanced' },
  { key: 'ipAddress', label: 'IP Address', defaultVisible: false, category: 'advanced' },
  { key: 'ipv6Address', label: 'IPv6 Address', defaultVisible: false, category: 'advanced' },
  { key: 'hostname', label: 'Hostname', defaultVisible: false, category: 'advanced' },
  { key: 'deviceType', label: 'Device Type', defaultVisible: false, category: 'advanced' },
  { key: 'manufacturer', label: 'Manufacturer', defaultVisible: false, category: 'advanced' },
  { key: 'apName', label: 'AP Name', defaultVisible: false, category: 'advanced' },
  { key: 'apSerial', label: 'AP Serial', defaultVisible: false, category: 'advanced' },
  { key: 'lastSeen', label: 'Last Seen', defaultVisible: false, category: 'advanced' },
];

interface ConnectedClientsProps {
  onShowDetail?: (macAddress: string, hostName?: string) => void;
}

export function ConnectedClients({ onShowDetail }: ConnectedClientsProps) {
  const [stations, setStations] = useState<Station[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [apFilter, setApFilter] = useState<string>('all');
  const [siteFilter, setSiteFilter] = useState<string>('all');
  const [deviceTypeFilter, setDeviceTypeFilter] = useState<string>('all');
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStations, setSelectedStations] = useState<Set<string>>(new Set());
  const [isActionsModalOpen, setIsActionsModalOpen] = useState(false);
  const [isPerformingAction, setIsPerformingAction] = useState(false);
  const [actionType, setActionType] = useState<string>('');
  const [groupId, setGroupId] = useState<string>('');
  const [siteId, setSiteId] = useState<string>('');
  const [stationEvents, setStationEvents] = useState<any[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [stationTrafficData, setStationTrafficData] = useState<Map<string, any>>(new Map());
  const [isLoadingTraffic, setIsLoadingTraffic] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    // Load from localStorage or use defaults
    const saved = localStorage.getItem('clientVisibleColumns');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved columns:', e);
      }
    }
    return AVAILABLE_COLUMNS.filter(col => col.defaultVisible).map(col => col.key);
  });
  const [isColumnDialogOpen, setIsColumnDialogOpen] = useState(false);

  useEffect(() => {
    loadStations();
  }, []);

  // Save visible columns to localStorage when they change
  useEffect(() => {
    localStorage.setItem('clientVisibleColumns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const toggleColumn = (columnKey: string) => {
    setVisibleColumns(prev => {
      if (prev.includes(columnKey)) {
        return prev.filter(k => k !== columnKey);
      } else {
        return [...prev, columnKey];
      }
    });
  };

  const resetColumns = () => {
    const defaults = AVAILABLE_COLUMNS.filter(col => col.defaultVisible).map(col => col.key);
    setVisibleColumns(defaults);
  };

  const loadStations = async () => {
    // Check authentication before loading
    if (!apiService.isAuthenticated()) {
      console.warn('[ConnectedClients] User not authenticated, skipping data load');
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // Use the new correlation method to get stations with proper site information
      const stationsData = await apiService.getStationsWithSiteCorrelation();
      setStations(Array.isArray(stationsData) ? stationsData : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load connected clients');
      console.error('Error loading stations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'connected':
      case 'associated':
      case 'active':
        return 'default';
      case 'disconnected':
      case 'inactive':
        return 'destructive';
      case 'idle':
      case 'low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (duration: string | number) => {
    if (!duration) return 'N/A';
    if (typeof duration === 'string') return duration;
    
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getBandFromRadioId = (radioId: number | undefined) => {
    switch (radioId) {
      case 1:
        return { band: '2.4 GHz', color: 'text-blue-500', bgColor: 'bg-blue-500/10' };
      case 2:
        return { band: '5 GHz', color: 'text-green-500', bgColor: 'bg-green-500/10' };
      case 3:
        return { band: '6 GHz', color: 'text-purple-500', bgColor: 'bg-purple-500/10' };
      case 20:
        return { band: 'Eth1 Wired', color: 'text-orange-500', bgColor: 'bg-orange-500/10' };
      default:
        return { band: 'Unknown', color: 'text-muted-foreground', bgColor: 'bg-muted/10' };
    }
  };

  const filteredStations = stations.filter((station) => {
    const matchesSearch = !searchTerm || 
      station.macAddress?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      station.ipAddress?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      station.hostName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      station.apName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      station.apSerial?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      station.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      station.siteName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      station.network?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      station.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || station.status?.toLowerCase() === statusFilter.toLowerCase();
    const matchesAP = apFilter === 'all' || station.apSerial === apFilter || station.apName === apFilter;
    const matchesSite = siteFilter === 'all' || station.siteName === siteFilter;
    const matchesDeviceType = deviceTypeFilter === 'all' || station.deviceType === deviceTypeFilter;
    
    return matchesSearch && matchesStatus && matchesAP && matchesSite && matchesDeviceType;
  });

  const getUniqueStatuses = () => {
    const statuses = new Set(stations.map(station => station.status).filter(Boolean));
    return Array.from(statuses);
  };

  const getUniqueAPs = () => {
    const aps = new Set(stations.map(station => station.apName || station.apSerial).filter(Boolean));
    return Array.from(aps);
  };

  const getUniqueSites = () => {
    const sites = new Set(stations.map(station => station.siteName).filter(Boolean));
    return Array.from(sites);
  };

  const getUniqueDeviceTypes = () => {
    const deviceTypes = new Set(stations.map(station => station.deviceType).filter(Boolean));
    return Array.from(deviceTypes);
  };

  const getUniqueNetworks = () => {
    const networks = new Set(stations.map(station => station.network).filter(Boolean));
    return Array.from(networks);
  };

  const getTotalTraffic = () => {
    return stations.reduce((total, station) => {
      const rx = station.rxBytes || station.clientBandwidthBytes || 0;
      const tx = station.txBytes || station.outBytes || 0;
      return total + rx + tx;
    }, 0);
  };

  const getActiveClientsCount = () => {
    return stations.filter(station => 
      station.status?.toLowerCase() === 'connected' || 
      station.status?.toLowerCase() === 'associated' ||
      station.status?.toLowerCase() === 'active'
    ).length;
  };

  const getUniqueNetworkCount = () => {
    return getUniqueNetworks().length;
  };

  const getUniqueSiteCount = () => {
    return getUniqueSites().length;
  };

  const handleStationSelect = (macAddress: string, checked: boolean) => {
    const newSelection = new Set(selectedStations);
    if (checked) {
      newSelection.add(macAddress);
    } else {
      newSelection.delete(macAddress);
    }
    setSelectedStations(newSelection);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allMacAddresses = new Set(filteredStations.map(station => station.macAddress));
      setSelectedStations(allMacAddresses);
    } else {
      setSelectedStations(new Set());
    }
  };

  const loadStationEvents = async (macAddress: string) => {
    if (!macAddress) return;
    
    setIsLoadingEvents(true);
    try {
      const events = await apiService.getStationEvents(macAddress);
      setStationEvents(Array.isArray(events) ? events : []);
    } catch (err) {
      // API service now handles 422 gracefully, but catch any other errors
      console.warn('Error loading station events:', err);
      setStationEvents([]);
      // Only show toast for unexpected errors, not 422 which is handled gracefully
      if (err instanceof Error && !err.message.includes('422')) {
        toast.error('Failed to load station events');
      }
    } finally {
      setIsLoadingEvents(false);
    }
  };

  const performBulkAction = async (action: string) => {
    if (selectedStations.size === 0) {
      toast.error('No stations selected');
      return;
    }

    setIsPerformingAction(true);
    const macAddresses = Array.from(selectedStations);

    try {
      let result;
      switch (action) {
        case 'delete':
          result = await apiService.bulkDeleteStations(macAddresses);
          toast.success(`Deleted ${result.successes}/${result.total} stations`);
          break;
        
        case 'disassociate':
          result = await apiService.bulkDisassociateStations(macAddresses);
          toast.success(`Disassociated ${macAddresses.length} stations`);
          break;
        
        case 'reauthenticate':
          result = await apiService.bulkReauthenticateStations(macAddresses);
          toast.success(`Reauthenticated ${result.successes}/${result.total} stations`);
          break;
        
        case 'addToGroup':
          if (!groupId) {
            toast.error('Please specify a Group ID');
            return;
          }
          const addResults = await Promise.allSettled(
            macAddresses.map(mac => apiService.addStationToGroup(mac, groupId))
          );
          const addSuccesses = addResults.filter(r => r.status === 'fulfilled').length;
          toast.success(`Added ${addSuccesses}/${macAddresses.length} stations to group`);
          break;
        
        case 'removeFromGroup':
          if (!groupId) {
            toast.error('Please specify a Group ID');
            return;
          }
          const removeResults = await Promise.allSettled(
            macAddresses.map(mac => apiService.removeStationFromGroup(mac, groupId))
          );
          const removeSuccesses = removeResults.filter(r => r.status === 'fulfilled').length;
          toast.success(`Removed ${removeSuccesses}/${macAddresses.length} stations from group`);
          break;
        
        case 'addToAllowList':
          if (!siteId) {
            toast.error('Please specify a Site ID');
            return;
          }
          const allowResults = await Promise.allSettled(
            macAddresses.map(mac => apiService.addStationToAllowList(mac, siteId))
          );
          const allowSuccesses = allowResults.filter(r => r.status === 'fulfilled').length;
          toast.success(`Added ${allowSuccesses}/${macAddresses.length} stations to allow list`);
          break;
        
        case 'addToDenyList':
          if (!siteId) {
            toast.error('Please specify a Site ID');
            return;
          }
          const denyResults = await Promise.allSettled(
            macAddresses.map(mac => apiService.addStationToDenyList(mac, siteId))
          );
          const denySuccesses = denyResults.filter(r => r.status === 'fulfilled').length;
          toast.success(`Added ${denySuccesses}/${macAddresses.length} stations to deny list`);
          break;
        
        default:
          toast.error('Unknown action');
          return;
      }

      // Clear selection and refresh data
      setSelectedStations(new Set());
      setIsActionsModalOpen(false);
      await loadStations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setIsPerformingAction(false);
    }
  };

  // Helper function to render column content based on column key
  const renderColumnContent = (columnKey: string, station: Station) => {
    switch (columnKey) {
      case 'status':
        return (
          <div className="p-1">
            {station.status ? (
              <Badge variant={getStatusBadgeVariant(station.status)} className="text-[9px] px-1 py-0 h-3 min-h-0">
                {station.status}
              </Badge>
            ) : (
              '-'
            )}
            <div className="text-[8px] text-muted-foreground leading-none truncate max-w-14">
              {station.lastSeen || 'N/A'}
            </div>
          </div>
        );

      case 'clientInfo':
        return (
          <div className="p-1">
            <div className="font-mono text-[12px] leading-none mb-0.5">{station.macAddress}</div>
            <div className="font-mono text-[12px] text-muted-foreground leading-none mb-0.5">
              {station.ipAddress || 'No IP'}
            </div>
            {station.hostName && (
              <div className="text-[8px] text-muted-foreground truncate leading-none">
                {station.hostName}
              </div>
            )}
          </div>
        );

      case 'deviceInfo':
        return (
          <div className="p-0.5 w-16">
            <div className="space-y-0.5 max-w-16">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-0.5">
                    <MapPin className="h-2 w-2 text-muted-foreground flex-shrink-0" />
                    <span className="text-[9px] truncate leading-none">{station.siteName || '-'}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{station.siteName || '-'}</p>
                </TooltipContent>
              </Tooltip>
              {station.deviceType && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-[8px] h-2.5 px-1 py-0 max-w-14">
                      <span className="truncate">{station.deviceType}</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{station.deviceType}</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {station.manufacturer && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-[10px] text-muted-foreground leading-none truncate max-w-14">
                      {station.manufacturer}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{station.manufacturer}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        );

      case 'userNetwork':
        return (
          <div className="p-1">
            {station.role && (
              <div className="text-[13px] text-muted-foreground leading-none mb-0.5">{station.role}</div>
            )}
          </div>
        );

      case 'accessPoint':
        return (
          <div className="p-1">
            {station.apSerial && (
              <div className="font-mono text-[8px] text-muted-foreground truncate leading-none mb-0.5">
                {station.apSerial}
              </div>
            )}
            <div className="flex items-center gap-0.5">
              <Clock className="h-2 w-2 text-muted-foreground flex-shrink-0" />
              <span className="text-[12px] leading-none">{station.lastSeen || '-'}</span>
            </div>
          </div>
        );

      case 'band':
        const bandInfo = getBandFromRadioId(station.radioId);
        return (
          <div className="p-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all duration-200 hover:scale-105 ${bandInfo.bgColor}`}>
                  {station.radioId === 20 ? (
                    <Router className={`h-3 w-3 ${bandInfo.color} flex-shrink-0`} />
                  ) : (
                    <Radio className={`h-3 w-3 ${bandInfo.color} flex-shrink-0`} />
                  )}
                  <span className={`text-[10px] leading-none font-medium ${bandInfo.color}`}>
                    {bandInfo.band}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div>Band: {bandInfo.band}</div>
              </TooltipContent>
            </Tooltip>
          </div>
        );

      case 'signal':
        return (
          <div className="p-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 mb-1 transition-all duration-200 hover:gap-2">
                  <Signal className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <span className="text-[12px] leading-none">{station.signalStrength || 'N/A'}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div>Signal Strength: {station.signalStrength || 'N/A'}</div>
              </TooltipContent>
            </Tooltip>
          </div>
        );

      case 'traffic':
        return (
          <div className="p-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-pointer transition-all duration-200 hover:scale-110 hover:bg-muted/20 rounded p-1 -m-1">
                  <div className="flex items-center gap-1 mb-1">
                    <Download className="h-3 w-3 text-green-600 flex-shrink-0" />
                    <span className="text-[12px] leading-none">{formatBytes(station.txBytes || station.outBytes || 0)}</span>
                  </div>
                  <div className="flex items-center gap-1 mb-1">
                    <Upload className="h-3 w-3 text-blue-600 flex-shrink-0" />
                    <span className="text-[12px] leading-none">{formatBytes(station.rxBytes || station.inBytes || 0)}</span>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div>Traffic: Down {formatBytes(station.txBytes || 0)} / Up {formatBytes(station.rxBytes || 0)}</div>
              </TooltipContent>
            </Tooltip>
          </div>
        );

      // Individual field columns
      case 'macAddress':
        return <span className="font-mono text-sm">{station.macAddress}</span>;
      case 'ipAddress':
        return <span className="font-mono text-sm">{station.ipAddress || 'N/A'}</span>;
      case 'ipv6Address':
        return <span className="font-mono text-xs">{station.ipv6Address || 'N/A'}</span>;
      case 'hostname':
        return <span className="text-sm">{station.hostName || 'N/A'}</span>;
      case 'siteName':
        return <span className="text-sm">{station.siteName || 'N/A'}</span>;
      case 'lastSeen':
        return <span className="text-sm">{station.lastSeen || 'N/A'}</span>;
      case 'deviceType':
        return <Badge variant="outline" className="text-xs">{station.deviceType || 'Unknown'}</Badge>;
      case 'rssi':
        return <span className="text-sm">{station.signalStrength || 'N/A'}</span>;
      case 'username':
        return <span className="text-sm">{station.username || 'N/A'}</span>;
      case 'role':
        return <span className="text-sm">{station.role || 'N/A'}</span>;
      case 'network':
        return <span className="text-sm">{station.network || 'N/A'}</span>;
      case 'apName':
        return <span className="text-sm">{station.apName || 'N/A'}</span>;
      case 'apSerial':
        return <span className="font-mono text-xs">{station.apSerial || 'N/A'}</span>;
      case 'capabilities':
        return <span className="text-xs">{(station as any).capabilities || 'N/A'}</span>;
      case 'channel':
        return <span className="text-sm">{(station as any).channel || 'N/A'}</span>;
      case 'protocol':
        return <span className="text-sm">{(station as any).protocol || 'N/A'}</span>;
      case 'rxRate':
        return <span className="text-sm">{(station as any).rxRate || 'N/A'}</span>;
      case 'txRate':
        return <span className="text-sm">{(station as any).txRate || 'N/A'}</span>;
      case 'spatialStreams':
        return <span className="text-sm">{(station as any).spatialStreams || 'N/A'}</span>;
      case 'inBytes':
        return <span className="text-sm">{formatBytes(station.rxBytes || station.inBytes || 0)}</span>;
      case 'outBytes':
        return <span className="text-sm">{formatBytes(station.txBytes || station.outBytes || 0)}</span>;
      case 'inPackets':
        return <span className="text-sm">{(station as any).inPackets || '0'}</span>;
      case 'outPackets':
        return <span className="text-sm">{(station as any).outPackets || '0'}</span>;
      case 'dlLostRetriesPackets':
        return <span className="text-sm">{(station as any).dlLostRetriesPackets || '0'}</span>;
      case 'manufacturer':
        return <span className="text-sm">{station.manufacturer || 'Unknown'}</span>;

      default:
        return <span className="text-sm">-</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <p className="text-muted-foreground">
            Monitor and manage connected wireless client devices across your network
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={loadStations} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button
            onClick={() => setIsColumnDialogOpen(true)}
            variant="outline"
            size="sm"
          >
            <Columns className="mr-2 h-4 w-4" />
            Customize Columns
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Column Customization Dialog */}
      <Dialog open={isColumnDialogOpen} onOpenChange={setIsColumnDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[65vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Customize Table Columns</DialogTitle>
            <DialogDescription>
              Select which columns you want to display in the Connected Clients table
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4" style={{ maxHeight: 'calc(65vh - 180px)' }}>
            <div className="space-y-6">
              {/* Basic Columns */}
              <div>
                <h3 className="font-semibold mb-3 text-sm uppercase text-muted-foreground">Basic Information</h3>
                <div className="grid grid-cols-2 gap-3">
                  {AVAILABLE_COLUMNS.filter(col => col.category === 'basic').map(column => (
                    <div key={column.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={column.key}
                        checked={visibleColumns.includes(column.key)}
                        onCheckedChange={() => toggleColumn(column.key)}
                      />
                      <label
                        htmlFor={column.key}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {column.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Network Columns */}
              <div>
                <h3 className="font-semibold mb-3 text-sm uppercase text-muted-foreground">Network</h3>
                <div className="grid grid-cols-2 gap-3">
                  {AVAILABLE_COLUMNS.filter(col => col.category === 'network').map(column => (
                    <div key={column.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={column.key}
                        checked={visibleColumns.includes(column.key)}
                        onCheckedChange={() => toggleColumn(column.key)}
                      />
                      <label
                        htmlFor={column.key}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {column.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Connection Columns */}
              <div>
                <h3 className="font-semibold mb-3 text-sm uppercase text-muted-foreground">Connection</h3>
                <div className="grid grid-cols-2 gap-3">
                  {AVAILABLE_COLUMNS.filter(col => col.category === 'connection').map(column => (
                    <div key={column.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={column.key}
                        checked={visibleColumns.includes(column.key)}
                        onCheckedChange={() => toggleColumn(column.key)}
                      />
                      <label
                        htmlFor={column.key}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {column.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Performance Columns */}
              <div>
                <h3 className="font-semibold mb-3 text-sm uppercase text-muted-foreground">Performance</h3>
                <div className="grid grid-cols-2 gap-3">
                  {AVAILABLE_COLUMNS.filter(col => col.category === 'performance').map(column => (
                    <div key={column.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={column.key}
                        checked={visibleColumns.includes(column.key)}
                        onCheckedChange={() => toggleColumn(column.key)}
                      />
                      <label
                        htmlFor={column.key}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {column.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Advanced Columns */}
              <div>
                <h3 className="font-semibold mb-3 text-sm uppercase text-muted-foreground">Advanced</h3>
                <div className="grid grid-cols-2 gap-3">
                  {AVAILABLE_COLUMNS.filter(col => col.category === 'advanced').map(column => (
                    <div key={column.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={column.key}
                        checked={visibleColumns.includes(column.key)}
                        onCheckedChange={() => toggleColumn(column.key)}
                      />
                      <label
                        htmlFor={column.key}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {column.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
          <div className="flex justify-between items-center pt-4 border-t">
            <Button variant="outline" onClick={resetColumns}>
              Reset to Default
            </Button>
            <div className="text-sm text-muted-foreground">
              {visibleColumns.length} of {AVAILABLE_COLUMNS.length} columns selected
            </div>
            <Button onClick={() => setIsColumnDialogOpen(false)}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="surface-1dp">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stations.length}</div>
            <p className="text-xs text-muted-foreground">
              Connected devices
            </p>
          </CardContent>
        </Card>

        <Card className="surface-1dp">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Connections</CardTitle>
            <Wifi className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getActiveClientsCount()}</div>
            <p className="text-xs text-muted-foreground">
              Currently active
            </p>
          </CardContent>
        </Card>

        <Card className="surface-1dp">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sites</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getUniqueSiteCount()}</div>
            <p className="text-xs text-muted-foreground">
              Active sites
            </p>
          </CardContent>
        </Card>

        <Card className="surface-1dp">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Traffic</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBytes(getTotalTraffic())}</div>
            <p className="text-xs text-muted-foreground">
              Data transferred
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="surface-2dp">
        <CardHeader>
          <CardTitle>Connected Clients</CardTitle>
          <CardDescription>
            Click any client to view detailed connection information
          </CardDescription>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-[2] min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search clients by name, MAC, or site..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>
            </div>
            
            <Select value={siteFilter} onValueChange={setSiteFilter}>
              <SelectTrigger className="w-40 h-10">
                <MapPin className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Select Site" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {getUniqueSites().map((site) => (
                  <SelectItem key={site} value={site}>{site}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-28 h-10">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {getUniqueStatuses().map((status) => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={deviceTypeFilter} onValueChange={setDeviceTypeFilter}>
              <SelectTrigger className="w-32 h-10">
                <SelectValue placeholder="Device Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {getUniqueDeviceTypes().map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={apFilter} onValueChange={setApFilter}>
              <SelectTrigger className="w-36 h-10">
                <Wifi className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Access Point" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {getUniqueAPs().map((ap) => (
                  <SelectItem key={ap} value={ap}>{ap}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredStations.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Connected Clients Found</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all' || apFilter !== 'all' || siteFilter !== 'all' || deviceTypeFilter !== 'all'
                  ? 'No clients match your current filters.' 
                  : 'No clients are currently connected to the network.'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table className="text-[11px]">
                <TableHeader>
                  <TableRow className="h-8">
                    <TableHead className="w-10 p-1 text-[10px]">
                      <Checkbox
                        checked={selectedStations.size === filteredStations.length && filteredStations.length > 0}
                        onCheckedChange={handleSelectAll}
                        className="h-3 w-3"
                      />
                    </TableHead>
                    {visibleColumns.map(columnKey => {
                      const column = AVAILABLE_COLUMNS.find(c => c.key === columnKey);
                      return <TableHead key={columnKey} className="p-1 text-[10px]">{column?.label || columnKey}</TableHead>;
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStations.map((station, index) => (
                    <TableRow 
                      key={station.macAddress || index}
                      className="cursor-pointer hover:bg-muted/50 h-10"
                      onClick={(e) => {
                        // Don't trigger row click if clicking on checkbox
                        if ((e.target as HTMLElement).closest('[data-checkbox]')) {
                          return;
                        }
                        if (onShowDetail) {
                          onShowDetail(station.macAddress, station.hostName);
                        } else {
                          setSelectedStation(station);
                          setIsModalOpen(true);
                        }
                      }}
                    >
                      <TableCell className="p-1" data-checkbox>
                        <Checkbox
                          checked={selectedStations.has(station.macAddress)}
                          onCheckedChange={(checked) => handleStationSelect(station.macAddress, checked as boolean)}
                          className="h-3 w-3"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>

                      {visibleColumns.map(columnKey => (
                        <TableCell key={columnKey}>
                          {renderColumnContent(columnKey, station)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Actions Modal */}
      <Dialog open={isActionsModalOpen} onOpenChange={setIsActionsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Actions</DialogTitle>
            <DialogDescription>
              Perform actions on {selectedStations.size} selected clients
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Station Management</h4>
              <div className="space-y-2">
                <Button
                  onClick={() => performBulkAction('disassociate')}
                  disabled={isPerformingAction}
                  variant="outline"
                  className="w-full justify-start"
                >
                  <UserX className="mr-2 h-4 w-4" />
                  Disassociate Stations
                </Button>
                
                <Button
                  onClick={() => performBulkAction('reauthenticate')}
                  disabled={isPerformingAction}
                  variant="outline"
                  className="w-full justify-start"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reauthenticate Stations
                </Button>
                
                <Button
                  onClick={() => performBulkAction('delete')}
                  disabled={isPerformingAction}
                  variant="destructive"
                  className="w-full justify-start"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Stations
                </Button>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Group Management</h4>
              <div className="space-y-2">
                <div>
                  <Input
                    placeholder="Group ID"
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value)}
                    className="mb-2"
                  />
                  <div className="space-y-2">
                    <Button
                      onClick={() => performBulkAction('addToGroup')}
                      disabled={isPerformingAction || !groupId}
                      variant="outline"
                      className="w-full justify-start"
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add to Group
                    </Button>
                    
                    <Button
                      onClick={() => performBulkAction('removeFromGroup')}
                      disabled={isPerformingAction || !groupId}
                      variant="outline"
                      className="w-full justify-start"
                    >
                      <UserMinus className="mr-2 h-4 w-4" />
                      Remove from Group
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Access Control</h4>
              <div className="space-y-2">
                <div>
                  <Input
                    placeholder="Site ID"
                    value={siteId}
                    onChange={(e) => setSiteId(e.target.value)}
                    className="mb-2"
                  />
                  <div className="space-y-2">
                    <Button
                      onClick={() => performBulkAction('addToAllowList')}
                      disabled={isPerformingAction || !siteId}
                      variant="outline"
                      className="w-full justify-start"
                    >
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Add to Allow List
                    </Button>
                    
                    <Button
                      onClick={() => performBulkAction('addToDenyList')}
                      disabled={isPerformingAction || !siteId}
                      variant="outline"
                      className="w-full justify-start"
                    >
                      <ShieldX className="mr-2 h-4 w-4" />
                      Add to Deny List
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Station Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Client Details - {selectedStation?.hostName || selectedStation?.macAddress}
            </DialogTitle>
            <DialogDescription>
              Detailed information and events for this connected client
            </DialogDescription>
          </DialogHeader>
          
          {selectedStation && (
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Client Information</TabsTrigger>
                <TabsTrigger value="events" onClick={() => loadStationEvents(selectedStation.macAddress)}>
                  Recent Events
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Basic Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium">MAC Address:</span>
                        <span className="font-mono">{selectedStation.macAddress}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">IP Address:</span>
                        <span className="font-mono">{selectedStation.ipAddress || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Hostname:</span>
                        <span>{selectedStation.hostName || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Status:</span>
                        <Badge variant={getStatusBadgeVariant(selectedStation.status || '')}>
                          {selectedStation.status || 'Unknown'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Device Type:</span>
                        <span>{selectedStation.deviceType || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Manufacturer:</span>
                        <span>{selectedStation.manufacturer || 'Unknown'}</span>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Network Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium">Site:</span>
                        <span>{selectedStation.siteName || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Access Point:</span>
                        <span className="font-mono text-sm">{selectedStation.apSerial || selectedStation.apName || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Network:</span>
                        <span>{selectedStation.network || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Role:</span>
                        <span>{selectedStation.role || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Username:</span>
                        <span>{selectedStation.username || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Last Seen:</span>
                        <span>{selectedStation.lastSeen || 'N/A'}</span>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Traffic Statistics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium flex items-center gap-1">
                          <Download className="h-4 w-4 text-green-600" />
                          Downloaded:
                        </span>
                        <span>{formatBytes(selectedStation.txBytes || selectedStation.outBytes || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium flex items-center gap-1">
                          <Upload className="h-4 w-4 text-blue-600" />
                          Uploaded:
                        </span>
                        <span>{formatBytes(selectedStation.rxBytes || selectedStation.inBytes || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Total Traffic:</span>
                        <span>{formatBytes((selectedStation.rxBytes || selectedStation.inBytes || 0) + (selectedStation.txBytes || selectedStation.outBytes || 0))}</span>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Additional Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium">Site Rating:</span>
                        <div className="flex items-center gap-1">
                          {selectedStation.siteRating !== undefined && (
                            <>
                              <Star className="h-4 w-4 text-yellow-500" />
                              <span>{selectedStation.siteRating}</span>
                            </>
                          ) || <span>N/A</span>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="events" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Events</CardTitle>
                    <CardDescription>
                      Latest activity and events for this client
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingEvents ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                          <Skeleton key={i} className="h-12 w-full" />
                        ))}
                      </div>
                    ) : stationEvents.length === 0 ? (
                      <div className="text-center py-8">
                        <Activity className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Events Found</h3>
                        <p className="text-muted-foreground">
                          No recent events available for this client.
                        </p>
                      </div>
                    ) : (
                      <ScrollArea className="h-96">
                        <div className="space-y-2">
                          {stationEvents.map((event, index) => (
                            <div key={index} className="border rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <Badge variant="outline">
                                  {event.type || 'Event'}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {event.timestamp || 'Unknown time'}
                                </span>
                              </div>
                              <p className="text-sm">{event.description || 'No description available'}</p>
                              {event.details && (
                                <div className="mt-2 text-xs text-muted-foreground">
                                  <pre className="whitespace-pre-wrap">{JSON.stringify(event.details, null, 2)}</pre>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}