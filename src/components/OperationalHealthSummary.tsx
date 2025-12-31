/**
 * Operational Health Summary Widget
 *
 * Single-pane-of-glass network health overview with actionable drilldowns.
 * Displays: Organization Health Score, Critical Alerts, Service Degradation, Client Experience
 *
 * Part of P1-001 implementation from API Dashboard Audit
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import {
  Activity,
  AlertTriangle,
  TrendingDown,
  Users,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import { apiService, AccessPoint, Station, Service } from '../services/api';
import { useGlobalFilters } from '../hooks/useGlobalFilters';

interface HealthMetrics {
  organizationHealth: {
    score: number;
    status: 'excellent' | 'good' | 'degraded' | 'critical';
    details: {
      apUptime: number;
      clientSuccessRate: number;
      throughputEfficiency: number;
    };
  };
  criticalAlerts: {
    count: number;
    alerts: any[];
  };
  serviceDegradation: {
    count: number;
    services: Service[];
  };
  clientExperience: {
    score: number;
    status: 'excellent' | 'good' | 'degraded' | 'critical';
    details: {
      avgSignalStrength: number;
      authFailureRate: number;
      avgRetryRate: number;
    };
  };
}

export function OperationalHealthSummary() {
  const { filters } = useGlobalFilters();
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<'organization' | 'alerts' | 'services' | 'experience' | null>(null);

  useEffect(() => {
    loadHealthMetrics();

    // Refresh every 2 minutes
    const interval = setInterval(loadHealthMetrics, 120000);
    return () => clearInterval(interval);
  }, [filters.site, filters.timeRange]);

  const loadHealthMetrics = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch data in parallel for better performance
      const [aps, stations, services] = await Promise.all([
        apiService.getAccessPoints(),
        apiService.getStations(),
        apiService.getServices()
      ]);

      // Apply site filter if needed
      const filteredAPs = filters.site === 'all'
        ? aps
        : aps.filter(ap => ap.site === filters.site || ap.hostSite === filters.site);

      const filteredStations = filters.site === 'all'
        ? stations
        : stations.filter(s => s.siteName === filters.site || s.siteId === filters.site);

      // Calculate Organization Health Score (weighted composite)
      const organizationHealth = calculateOrganizationHealth(filteredAPs, filteredStations);

      // Get critical alerts
      const criticalAlerts = await getCriticalAlerts();

      // Calculate service degradation
      const serviceDegradation = calculateServiceDegradation(services, filteredStations);

      // Calculate client experience score
      const clientExperience = calculateClientExperience(filteredStations);

      setMetrics({
        organizationHealth,
        criticalAlerts,
        serviceDegradation,
        clientExperience
      });
    } catch (error) {
      console.error('[OperationalHealthSummary] Error loading metrics:', error);
      setError('Failed to load health metrics');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateOrganizationHealth = (aps: AccessPoint[], stations: Station[]) => {
    // AP Uptime: percentage of APs that are "up" or "connected"
    const upAPs = aps.filter(ap =>
      ap.status?.toLowerCase() === 'up' ||
      ap.status?.toLowerCase() === 'connected' ||
      ap.connectionState?.toLowerCase() === 'up'
    ).length;
    const apUptime = aps.length > 0 ? (upAPs / aps.length) * 100 : 100;

    // Client Success Rate: percentage of clients with good status
    const connectedStations = stations.filter(s =>
      s.status?.toLowerCase() === 'associated' ||
      s.status?.toLowerCase() === 'connected'
    ).length;
    const clientSuccessRate = stations.length > 0 ? (connectedStations / stations.length) * 100 : 100;

    // Throughput Efficiency: based on signal strength distribution
    const goodSignalStations = stations.filter(s =>
      (s.signalStrength && s.signalStrength > -70) ||
      (s.rss && s.rss > -70)
    ).length;
    const throughputEfficiency = stations.length > 0 ? (goodSignalStations / stations.length) * 100 : 100;

    // Weighted score: 30% AP uptime, 30% client success, 40% throughput
    const score = (apUptime * 0.3) + (clientSuccessRate * 0.3) + (throughputEfficiency * 0.4);

    let status: 'excellent' | 'good' | 'degraded' | 'critical';
    if (score >= 95) status = 'excellent';
    else if (score >= 85) status = 'good';
    else if (score >= 70) status = 'degraded';
    else status = 'critical';

    return {
      score: Math.round(score * 10) / 10,
      status,
      details: {
        apUptime: Math.round(apUptime * 10) / 10,
        clientSuccessRate: Math.round(clientSuccessRate * 10) / 10,
        throughputEfficiency: Math.round(throughputEfficiency * 10) / 10
      }
    };
  };

  const getCriticalAlerts = async () => {
    try {
      // Try to get alerts from API
      // Note: The actual alerts endpoint may vary
      const alerts = await apiService.getAlerts?.() || [];
      const criticalAlerts = alerts.filter((a: any) =>
        a.severity?.toLowerCase() === 'critical' ||
        a.priority?.toLowerCase() === 'critical'
      );

      return {
        count: criticalAlerts.length,
        alerts: criticalAlerts.slice(0, 5) // Top 5 for display
      };
    } catch (error) {
      // Fallback: if alerts API not available, return 0
      console.warn('[OperationalHealthSummary] Alerts API not available:', error);
      return { count: 0, alerts: [] };
    }
  };

  const calculateServiceDegradation = (services: Service[], stations: Station[]) => {
    // Services are considered degraded if they have issues or low client counts
    const degradedServices = services.filter(service => {
      const serviceStations = stations.filter(s =>
        s.serviceName === service.name ||
        s.network === service.name ||
        s.ssid === service.ssid
      );

      // Consider degraded if: disabled, or has connected clients but low signal
      const isDisabled = !service.enabled || service.status?.toLowerCase() === 'disabled';
      const hasLowSignalClients = serviceStations.some(s =>
        (s.signalStrength && s.signalStrength < -80) ||
        (s.rss && s.rss < -80)
      );

      return isDisabled || (serviceStations.length > 0 && hasLowSignalClients);
    });

    return {
      count: degradedServices.length,
      services: degradedServices.slice(0, 5)
    };
  };

  const calculateClientExperience = (stations: Station[]) => {
    if (stations.length === 0) {
      return {
        score: 100,
        status: 'excellent' as const,
        details: {
          avgSignalStrength: 0,
          authFailureRate: 0,
          avgRetryRate: 0
        }
      };
    }

    // Calculate average signal strength
    const stationsWithSignal = stations.filter(s => s.signalStrength || s.rss);
    const avgSignalStrength = stationsWithSignal.length > 0
      ? stationsWithSignal.reduce((sum, s) => sum + (s.signalStrength || s.rss || 0), 0) / stationsWithSignal.length
      : -50;

    // Auth failure rate (estimate based on disconnected clients)
    const disconnectedStations = stations.filter(s =>
      s.status?.toLowerCase() === 'disconnected' ||
      s.status?.toLowerCase() === 'failed'
    ).length;
    const authFailureRate = (disconnectedStations / stations.length) * 100;

    // Retry rate (estimate based on poor signal)
    const poorSignalStations = stations.filter(s =>
      (s.signalStrength && s.signalStrength < -75) ||
      (s.rss && s.rss < -75)
    ).length;
    const avgRetryRate = (poorSignalStations / stations.length) * 100;

    // Calculate experience score
    let signalScore = 100;
    if (avgSignalStrength < -80) signalScore = 40;
    else if (avgSignalStrength < -70) signalScore = 70;
    else if (avgSignalStrength < -60) signalScore = 85;

    const failureImpact = (100 - authFailureRate);
    const retryImpact = (100 - avgRetryRate);

    const score = (signalScore * 0.5) + (failureImpact * 0.3) + (retryImpact * 0.2);

    let status: 'excellent' | 'good' | 'degraded' | 'critical';
    if (score >= 90) status = 'excellent';
    else if (score >= 75) status = 'good';
    else if (score >= 60) status = 'degraded';
    else status = 'critical';

    return {
      score: Math.round(score * 10) / 10,
      status,
      details: {
        avgSignalStrength: Math.round(avgSignalStrength * 10) / 10,
        authFailureRate: Math.round(authFailureRate * 10) / 10,
        avgRetryRate: Math.round(avgRetryRate * 10) / 10
      }
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600 dark:text-green-400';
      case 'good': return 'text-blue-600 dark:text-blue-400';
      case 'degraded': return 'text-yellow-600 dark:text-yellow-400';
      case 'critical': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent': return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'good': return <CheckCircle2 className="h-5 w-5 text-blue-600" />;
      case 'degraded': return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'critical': return <XCircle className="h-5 w-5 text-red-600" />;
      default: return <Activity className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'excellent': return 'default';
      case 'good': return 'secondary';
      case 'degraded': return 'outline';
      case 'critical': return 'destructive';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Operational Health Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-pulse">Loading health metrics...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !metrics) {
    return (
      <Card className="w-full border-red-200 dark:border-red-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Operational Health Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600 dark:text-red-400">{error || 'Unable to load health metrics'}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Operational Health Summary
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Hide Details
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Show Details
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* 4-card KPI layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Organization Health Score */}
          <div
            className="p-4 border rounded-lg bg-card cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setSelectedMetric('organization')}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                  Organization Health
                  <Info className="h-3 w-3" />
                </div>
                <div className={`text-3xl font-bold ${getStatusColor(metrics.organizationHealth.status)}`}>
                  {metrics.organizationHealth.score}%
                </div>
                <Badge
                  variant={getStatusBadgeVariant(metrics.organizationHealth.status)}
                  className="mt-2 text-xs"
                >
                  {metrics.organizationHealth.status.toUpperCase()}
                </Badge>
              </div>
              {getStatusIcon(metrics.organizationHealth.status)}
            </div>
          </div>

          {/* Critical Alerts */}
          <div
            className="p-4 border rounded-lg bg-card cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setSelectedMetric('alerts')}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                  Critical Alerts
                  <Info className="h-3 w-3" />
                </div>
                <div className={`text-3xl font-bold ${metrics.criticalAlerts.count > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {metrics.criticalAlerts.count}
                </div>
                <Badge
                  variant={metrics.criticalAlerts.count > 0 ? 'destructive' : 'default'}
                  className="mt-2 text-xs"
                >
                  {metrics.criticalAlerts.count > 0 ? 'ACTION REQUIRED' : 'ALL CLEAR'}
                </Badge>
              </div>
              <AlertTriangle className={`h-5 w-5 ${metrics.criticalAlerts.count > 0 ? 'text-red-600' : 'text-green-600'}`} />
            </div>
          </div>

          {/* Service Degradation */}
          <div
            className="p-4 border rounded-lg bg-card cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setSelectedMetric('services')}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                  Service Issues
                  <Info className="h-3 w-3" />
                </div>
                <div className={`text-3xl font-bold ${metrics.serviceDegradation.count > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {metrics.serviceDegradation.count}
                </div>
                <Badge
                  variant={metrics.serviceDegradation.count > 0 ? 'outline' : 'default'}
                  className="mt-2 text-xs"
                >
                  {metrics.serviceDegradation.count > 0 ? 'DEGRADED' : 'HEALTHY'}
                </Badge>
              </div>
              <TrendingDown className={`h-5 w-5 ${metrics.serviceDegradation.count > 0 ? 'text-yellow-600' : 'text-green-600'}`} />
            </div>
          </div>

          {/* Client Experience */}
          <div
            className="p-4 border rounded-lg bg-card cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setSelectedMetric('experience')}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                  Client Experience
                  <Info className="h-3 w-3" />
                </div>
                <div className={`text-3xl font-bold ${getStatusColor(metrics.clientExperience.status)}`}>
                  {metrics.clientExperience.score}%
                </div>
                <Badge
                  variant={getStatusBadgeVariant(metrics.clientExperience.status)}
                  className="mt-2 text-xs"
                >
                  {metrics.clientExperience.status.toUpperCase()}
                </Badge>
              </div>
              <Users className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Expandable Details Panel */}
        {isExpanded && (
          <div className="mt-6 pt-6 border-t space-y-4">
            {/* Organization Health Details */}
            <div>
              <h4 className="font-semibold mb-2">Organization Health Breakdown</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">AP Uptime:</span>
                  <span className="ml-2 font-medium">{metrics.organizationHealth.details.apUptime}%</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Client Success:</span>
                  <span className="ml-2 font-medium">{metrics.organizationHealth.details.clientSuccessRate}%</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Throughput:</span>
                  <span className="ml-2 font-medium">{metrics.organizationHealth.details.throughputEfficiency}%</span>
                </div>
              </div>
            </div>

            {/* Client Experience Details */}
            <div>
              <h4 className="font-semibold mb-2">Client Experience Breakdown</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Avg Signal:</span>
                  <span className="ml-2 font-medium">{metrics.clientExperience.details.avgSignalStrength} dBm</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Auth Failures:</span>
                  <span className="ml-2 font-medium">{metrics.clientExperience.details.authFailureRate}%</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Retry Rate:</span>
                  <span className="ml-2 font-medium">{metrics.clientExperience.details.avgRetryRate}%</span>
                </div>
              </div>
            </div>

            {/* Degraded Services List */}
            {metrics.serviceDegradation.count > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Degraded Services</h4>
                <ul className="space-y-1 text-sm">
                  {metrics.serviceDegradation.services.map((service, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <span>{service.name || service.serviceName || service.ssid}</span>
                      {!service.enabled && (
                        <Badge variant="outline" className="text-xs">Disabled</Badge>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Critical Alerts List */}
            {metrics.criticalAlerts.count > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Critical Alerts</h4>
                <ul className="space-y-1 text-sm">
                  {metrics.criticalAlerts.alerts.map((alert, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span>{alert.message || alert.description || 'Critical alert'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Detail Dialog */}
      <Dialog open={selectedMetric !== null} onOpenChange={() => setSelectedMetric(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedMetric === 'organization' && <Activity className="h-5 w-5" />}
              {selectedMetric === 'alerts' && <AlertTriangle className="h-5 w-5" />}
              {selectedMetric === 'services' && <TrendingDown className="h-5 w-5" />}
              {selectedMetric === 'experience' && <Users className="h-5 w-5" />}
              {selectedMetric === 'organization' && 'Organization Health Details'}
              {selectedMetric === 'alerts' && 'Critical Alerts Details'}
              {selectedMetric === 'services' && 'Service Issues Details'}
              {selectedMetric === 'experience' && 'Client Experience Details'}
            </DialogTitle>
            <DialogDescription>
              Detailed breakdown and insights
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {selectedMetric === 'organization' && (
              <>
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Overall Score</h3>
                    <div className={`text-4xl font-bold ${getStatusColor(metrics.organizationHealth.status)}`}>
                      {metrics.organizationHealth.score}%
                    </div>
                  </div>
                  <Badge variant={getStatusBadgeVariant(metrics.organizationHealth.status)}>
                    {metrics.organizationHealth.status.toUpperCase()}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">Component Breakdown</h4>
                  <div className="grid gap-3">
                    <div className="p-3 rounded-lg border">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">AP Uptime</span>
                        <span className="font-bold">{metrics.organizationHealth.details.apUptime}%</span>
                      </div>
                      <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${metrics.organizationHealth.details.apUptime}%` }}
                        />
                      </div>
                    </div>
                    <div className="p-3 rounded-lg border">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Client Success Rate</span>
                        <span className="font-bold">{metrics.organizationHealth.details.clientSuccessRate}%</span>
                      </div>
                      <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 transition-all"
                          style={{ width: `${metrics.organizationHealth.details.clientSuccessRate}%` }}
                        />
                      </div>
                    </div>
                    <div className="p-3 rounded-lg border">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Throughput Efficiency</span>
                        <span className="font-bold">{metrics.organizationHealth.details.throughputEfficiency}%</span>
                      </div>
                      <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all"
                          style={{ width: `${metrics.organizationHealth.details.throughputEfficiency}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-muted/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    The Organization Health score is a weighted composite of AP uptime (30%),
                    client success rate (30%), and throughput efficiency (40%). This provides
                    a single metric to assess overall network performance.
                  </p>
                </div>
              </>
            )}

            {selectedMetric === 'alerts' && (
              <>
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">Critical Alerts</h3>
                    <div className={`text-4xl font-bold ${metrics.criticalAlerts.count > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {metrics.criticalAlerts.count}
                    </div>
                  </div>
                  <Badge variant={metrics.criticalAlerts.count > 0 ? 'destructive' : 'default'}>
                    {metrics.criticalAlerts.count > 0 ? 'ACTION REQUIRED' : 'ALL CLEAR'}
                  </Badge>
                </div>

                {metrics.criticalAlerts.count > 0 ? (
                  <div className="space-y-2">
                    <h4 className="font-semibold">Active Alerts</h4>
                    {metrics.criticalAlerts.alerts.map((alert, idx) => (
                      <div key={idx} className="p-3 rounded-lg border border-red-500/50 bg-red-500/5">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                          <p className="text-sm">{alert.message || alert.description || 'Critical alert'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg text-center">
                    <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No critical alerts at this time. All systems operating normally.</p>
                  </div>
                )}
              </>
            )}

            {selectedMetric === 'services' && (
              <>
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">Service Issues</h3>
                    <div className={`text-4xl font-bold ${metrics.serviceDegradation.count > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {metrics.serviceDegradation.count}
                    </div>
                  </div>
                  <Badge variant={metrics.serviceDegradation.count > 0 ? 'outline' : 'default'}>
                    {metrics.serviceDegradation.count > 0 ? 'DEGRADED' : 'HEALTHY'}
                  </Badge>
                </div>

                {metrics.serviceDegradation.count > 0 ? (
                  <div className="space-y-2">
                    <h4 className="font-semibold">Degraded Services</h4>
                    {metrics.serviceDegradation.services.map((service, idx) => (
                      <div key={idx} className="p-3 rounded-lg border border-yellow-500/50 bg-yellow-500/5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-yellow-600" />
                            <span className="font-medium">{service.name || service.serviceName || service.ssid}</span>
                          </div>
                          {!service.enabled && (
                            <Badge variant="outline" className="text-xs">Disabled</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg text-center">
                    <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">All services operating normally with no performance degradation detected.</p>
                  </div>
                )}
              </>
            )}

            {selectedMetric === 'experience' && (
              <>
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Client Experience Score</h3>
                    <div className={`text-4xl font-bold ${getStatusColor(metrics.clientExperience.status)}`}>
                      {metrics.clientExperience.score}%
                    </div>
                  </div>
                  <Badge variant={getStatusBadgeVariant(metrics.clientExperience.status)}>
                    {metrics.clientExperience.status.toUpperCase()}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">Experience Metrics</h4>
                  <div className="grid gap-3">
                    <div className="p-3 rounded-lg border">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Average Signal Strength</span>
                        <span className="font-bold">{metrics.clientExperience.details.avgSignalStrength} dBm</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {metrics.clientExperience.details.avgSignalStrength > -60 ? 'Excellent' :
                         metrics.clientExperience.details.avgSignalStrength > -70 ? 'Good' :
                         metrics.clientExperience.details.avgSignalStrength > -80 ? 'Fair' : 'Poor'} signal quality
                      </p>
                    </div>
                    <div className="p-3 rounded-lg border">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Authentication Failure Rate</span>
                        <span className="font-bold">{metrics.clientExperience.details.authFailureRate}%</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg border">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Average Retry Rate</span>
                        <span className="font-bold">{metrics.clientExperience.details.avgRetryRate}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-muted/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Client Experience score combines signal strength (50%), authentication success (30%),
                    and retry rates (20%) to measure overall end-user satisfaction.
                  </p>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
