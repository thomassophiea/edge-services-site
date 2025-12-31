import { useState } from 'react';
import { Button } from './ui/button';
import { RefreshCw, TrendingUp } from 'lucide-react';
import { AnomalyDetector } from './AnomalyDetector';
import { RFQualityWidget } from './RFQualityWidget';
import { ApplicationAnalyticsEnhancedWidget } from './ApplicationAnalyticsEnhancedWidget';

/**
 * Network Insights Dashboard
 *
 * Displays advanced analytics and insights about network performance:
 * - Anomaly Detection (What Changed?)
 * - RF Quality Index (RFQI)
 * - Application Analytics
 */
export function NetworkInsights() {
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const handleRefresh = () => {
    setRefreshing(true);
    setLastUpdate(new Date());

    // Trigger refresh on all child components by updating timestamp
    setTimeout(() => {
      setRefreshing(false);
      window.location.reload(); // Force reload to refresh all widgets
    }, 500);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-primary" />
            Network Insights
          </h2>
          <p className="text-muted-foreground mt-1">
            Advanced analytics, anomaly detection, and performance insights
            {lastUpdate && (
              <span className="ml-2">• Last updated {lastUpdate.toLocaleTimeString()}</span>
            )}
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          disabled={refreshing}
          size="default"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh All
        </Button>
      </div>

      {/* Anomaly Detector - What Changed? */}
      <div className="widget-container">
        <AnomalyDetector />
      </div>

      {/* RF Quality Index (RFQI) */}
      <div className="widget-container">
        <RFQualityWidget
          siteId="c7395471-aa5c-46dc-9211-3ed24c5789bd"
          duration="24H"
        />
      </div>

      {/* Application Analytics */}
      <div className="widget-container">
        <ApplicationAnalyticsEnhancedWidget
          siteId="c7395471-aa5c-46dc-9211-3ed24c5789bd"
          duration="24H"
        />
      </div>

      {/* Info Footer */}
      <div className="mt-8 p-4 bg-muted/20 rounded-lg border border-muted">
        <p className="text-sm text-muted-foreground">
          <strong>Network Insights</strong> provides advanced analytics powered by the Campus Controller.
          Data updates automatically every 5 minutes per widget. Use the "Refresh All" button to manually update all widgets.
        </p>
      </div>
    </div>
  );
}
