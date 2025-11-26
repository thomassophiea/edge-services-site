import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Skeleton } from './ui/skeleton';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Wifi, 
  Users, 
  MapPin, 
  AlertTriangle, 
  Activity, 
  Server,
  Network,
  Shield,
  Zap,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp
} from 'lucide-react';
import { apiService } from '../services/api';
import { toast } from 'sonner';

interface EntityDistribution {
  aps?: number;
  switches?: number;
  sites?: number;
  clients?: number;
  [key: string]: any;
}

interface APState {
  serial?: string;
  name?: string;
  status?: string;
  uptime?: number;
  clients?: number;
  site?: string;
  model?: string;
  ip?: string;
  lastSeen?: string;
  health?: string;
  [key: string]: any;
}

interface SiteState {
  id?: string;
  name?: string;
  status?: string;
  aps?: number;
  clients?: number;
  switches?: number;
  health?: string;
  [key: string]: any;
}

interface SwitchState {
  serial?: string;
  name?: string;
  status?: string;
  uptime?: number;
  site?: string;
  model?: string;
  ip?: string;
  ports?: number;
  health?: string;
  [key: string]: any;
}

interface DashboardData {
  entityDistribution: EntityDistribution | null;
  aps: APState[];
  sites: SiteState[];
  switches: SwitchState[];
}

export function Dashboard() {
  const [data, setData] = useState<DashboardData>({
    entityDistribution: null,
    aps: [],
    sites: [],
    switches: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchDashboardData = async () => {
    try {
      setError(null);
      
      // Fetch all data in parallel
      const [entityDistResponse, apsResponse, sitesResponse, switchesResponse] = await Promise.allSettled([
        apiService.makeAuthenticatedRequest('/v1/state/entityDistribution'),
        apiService.makeAuthenticatedRequest('/v1/state/aps'),
        apiService.makeAuthenticatedRequest('/v1/state/sites'),
        apiService.makeAuthenticatedRequest('/v1/state/switches')
      ]);

      const newData: DashboardData = {
        entityDistribution: null,
        aps: [],
        sites: [],
        switches: []
      };

      // Process entity distribution
      if (entityDistResponse.status === 'fulfilled' && entityDistResponse.value.ok) {
        newData.entityDistribution = await entityDistResponse.value.json();
      }

      // Process APs
      if (apsResponse.status === 'fulfilled' && apsResponse.value.ok) {
        const apsData = await apsResponse.value.json();
        newData.aps = Array.isArray(apsData) ? apsData : apsData.aps || [];
      }

      // Process Sites
      if (sitesResponse.status === 'fulfilled' && sitesResponse.value.ok) {
        const sitesData = await sitesResponse.value.json();
        newData.sites = Array.isArray(sitesData) ? sitesData : sitesData.sites || [];
      }

      // Process Switches
      if (switchesResponse.status === 'fulfilled' && switchesResponse.value.ok) {
        const switchesData = await switchesResponse.value.json();
        newData.switches = Array.isArray(switchesData) ? switchesData : switchesData.switches || [];
      }

      setData(newData);
      setLastUpdated(new Date());

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch dashboard data';
      setError(errorMessage);
      toast.error('Dashboard Error', {
        description: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    fetchDashboardData();
  };

  // Calculate summary statistics
  const getOnlineAPs = () => data.aps.filter(ap => ap.status === 'online' || ap.status === 'up').length;
  const getOnlineSites = () => data.sites.filter(site => site.status === 'online' || site.status === 'up').length;
  const getOnlineSwitches = () => data.switches.filter(sw => sw.status === 'online' || sw.status === 'up').length;
  const getTotalClients = () => data.aps.reduce((total, ap) => total + (ap.clients || 0), 0);

  // Calculate health percentages
  const getAPHealthPercentage = () => {
    if (data.aps.length === 0) return 0;
    return Math.round((getOnlineAPs() / data.aps.length) * 100);
  };

  const getSiteHealthPercentage = () => {
    if (data.sites.length === 0) return 0;
    return Math.round((getOnlineSites() / data.sites.length) * 100);
  };

  const getSwitchHealthPercentage = () => {
    if (data.switches.length === 0) return 0;
    return Math.round((getOnlineSwitches() / data.switches.length) * 100);
  };

  // Get recent issues (offline devices)
  const getIssues = () => {
    const issues = [];
    
    const offlineAPs = data.aps.filter(ap => ap.status !== 'online' && ap.status !== 'up');
    const offlineSites = data.sites.filter(site => site.status !== 'online' && site.status !== 'up');
    const offlineSwitches = data.switches.filter(sw => sw.status !== 'online' && sw.status !== 'up');

    offlineAPs.forEach(ap => issues.push({
      type: 'AP',
      name: ap.name || ap.serial,
      status: ap.status,
      severity: 'high'
    }));

    offlineSites.forEach(site => issues.push({
      type: 'Site',
      name: site.name || site.id,
      status: site.status,
      severity: 'critical'
    }));

    offlineSwitches.forEach(sw => issues.push({
      type: 'Switch',
      name: sw.name || sw.serial,
      status: sw.status,
      severity: 'high'
    }));

    return issues;
  };

  if (error && !data.entityDistribution) {
    return (
      <div className="space-y-6">
        <div>
          <h1>Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your network infrastructure
          </p>
        </div>
        
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>

        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1>Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your network infrastructure
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {lastUpdated && (
            <span className="text-sm text-muted-foreground flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Access Points</CardTitle>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="flex items-baseline space-x-2">
                  <div className="text-2xl font-bold">{data.entityDistribution?.aps || data.aps.length}</div>
                  <span className="text-sm text-muted-foreground">
                    ({getOnlineAPs()} online)
                  </span>
                </div>
                <Progress value={getAPHealthPercentage()} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {getAPHealthPercentage()}% healthy
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connected Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{data.entityDistribution?.clients || getTotalClients()}</div>
                <p className="text-xs text-muted-foreground">
                  Active connections
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sites</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="flex items-baseline space-x-2">
                  <div className="text-2xl font-bold">{data.entityDistribution?.sites || data.sites.length}</div>
                  <span className="text-sm text-muted-foreground">
                    ({getOnlineSites()} online)
                  </span>
                </div>
                <Progress value={getSiteHealthPercentage()} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {getSiteHealthPercentage()}% healthy
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Switches</CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="flex items-baseline space-x-2">
                  <div className="text-2xl font-bold">{data.entityDistribution?.switches || data.switches.length}</div>
                  <span className="text-sm text-muted-foreground">
                    ({getOnlineSwitches()} online)
                  </span>
                </div>
                <Progress value={getSwitchHealthPercentage()} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {getSwitchHealthPercentage()}% healthy
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Views */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              System Health
            </CardTitle>
            <CardDescription>Infrastructure status overview</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Wifi className="h-4 w-4 mr-2" />
                    Access Points
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">{getOnlineAPs()}/{data.aps.length}</span>
                    <Badge variant={getAPHealthPercentage() > 90 ? "default" : getAPHealthPercentage() > 70 ? "secondary" : "destructive"}>
                      {getAPHealthPercentage()}%
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    Sites
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">{getOnlineSites()}/{data.sites.length}</span>
                    <Badge variant={getSiteHealthPercentage() > 90 ? "default" : getSiteHealthPercentage() > 70 ? "secondary" : "destructive"}>
                      {getSiteHealthPercentage()}%
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Network className="h-4 w-4 mr-2" />
                    Switches
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">{getOnlineSwitches()}/{data.switches.length}</span>
                    <Badge variant={getSwitchHealthPercentage() > 90 ? "default" : getSwitchHealthPercentage() > 70 ? "secondary" : "destructive"}>
                      {getSwitchHealthPercentage()}%
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Issues & Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Issues & Alerts
            </CardTitle>
            <CardDescription>Devices requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : (
              <div className="space-y-3">
                {getIssues().length === 0 ? (
                  <div className="text-center py-4">
                    <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">All systems operational</p>
                  </div>
                ) : (
                  getIssues().slice(0, 5).map((issue, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center">
                        <XCircle className="h-4 w-4 text-red-500 mr-2" />
                        <div>
                          <span className="font-medium">{issue.name}</span>
                          <div className="text-sm text-muted-foreground">{issue.type}</div>
                        </div>
                      </div>
                      <Badge variant="destructive" className="text-xs">
                        {issue.status}
                      </Badge>
                    </div>
                  ))
                )}
                {getIssues().length > 5 && (
                  <p className="text-sm text-muted-foreground text-center">
                    +{getIssues().length - 5} more issues
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Quick Stats
            </CardTitle>
            <CardDescription>Key performance indicators</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm">Total Devices</span>
                  <span className="font-medium">{data.aps.length + data.switches.length}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm">Client Density</span>
                  <span className="font-medium">
                    {data.aps.length > 0 ? Math.round(getTotalClients() / data.aps.length) : 0} per AP
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm">Overall Health</span>
                  <span className="font-medium">
                    {Math.round((getAPHealthPercentage() + getSiteHealthPercentage() + getSwitchHealthPercentage()) / 3)}%
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm">Active Issues</span>
                  <span className="font-medium text-red-500">{getIssues().length}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Entity Distribution Details */}
      {data.entityDistribution && (
        <Card>
          <CardHeader>
            <CardTitle>Entity Distribution</CardTitle>
            <CardDescription>Detailed breakdown of network entities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Object.entries(data.entityDistribution).map(([key, value]) => (
                <div key={key} className="text-center p-3 border rounded">
                  <div className="text-lg font-semibold">{value}</div>
                  <div className="text-sm text-muted-foreground capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}