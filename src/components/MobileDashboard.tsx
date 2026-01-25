import { Users, Wifi, AppWindow, ArrowLeft, Activity, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from './ui/button';
import { UserMenu } from './UserMenu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { useEffect, useState, Suspense, lazy } from 'react';
import { apiService } from '@/services/api';

// Lazy load main pages
const TrafficStatsConnectedClients = lazy(() => import('./TrafficStatsConnectedClients').then(m => ({ default: m.TrafficStatsConnectedClients })));
const AccessPoints = lazy(() => import('./AccessPoints').then(m => ({ default: m.AccessPoints })));
const AppInsights = lazy(() => import('./AppInsights').then(m => ({ default: m.AppInsights })));

interface MobileDashboardProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  theme: 'light' | 'dark' | 'system';
  onThemeToggle: () => void;
  currentSite: string;
  onSiteChange: (siteId: string) => void;
}

export function MobileDashboard({
  currentPage,
  onNavigate,
  onLogout,
  theme,
  onThemeToggle,
  currentSite,
  onSiteChange,
}: MobileDashboardProps) {
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ clients: 0, aps: { total: 0, online: 0 } });
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    const loadSites = async () => {
      try {
        const sitesData = await apiService.getSites();
        setSites([{ id: 'all', name: 'All Sites' }, ...sitesData]);
      } catch (error) {
        console.error('Failed to load sites:', error);
      } finally {
        setLoading(false);
      }
    };
    loadSites();
  }, []);

  // Load basic stats
  useEffect(() => {
    const loadStats = async () => {
      if (!currentSite) return;

      setStatsLoading(true);
      try {
        const [clientsData, apsData] = await Promise.all([
          apiService.getStations(),
          apiService.getAccessPoints()
        ]);

        const filteredClients = currentSite === 'all'
          ? clientsData
          : clientsData.filter((c: any) => c.siteId === currentSite);

        const filteredAPs = currentSite === 'all'
          ? apsData
          : apsData.filter((ap: any) => ap.siteId === currentSite);

        const onlineAPs = filteredAPs.filter((ap: any) =>
          ap.status === 'up' || ap.connectionState === 'connected'
        ).length;

        setStats({
          clients: filteredClients.length,
          aps: { total: filteredAPs.length, online: onlineAPs }
        });
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setStatsLoading(false);
      }
    };

    loadStats();
  }, [currentSite]);

  const menuItems = [
    {
      id: 'connected-clients',
      title: 'Clients',
      subtitle: 'View connected devices',
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      id: 'access-points',
      title: 'Access Points',
      subtitle: 'Manage APs',
      icon: Wifi,
      color: 'bg-green-500',
    },
    {
      id: 'app-insights',
      title: 'Applications',
      subtitle: 'App analytics',
      icon: AppWindow,
      color: 'bg-purple-500',
    },
  ];

  // Check if we're on the home dashboard or a specific page
  const isHome = !['connected-clients', 'access-points', 'app-insights'].includes(currentPage);
  const showBackButton = !isHome;

  const renderPageContent = () => {
    switch (currentPage) {
      case 'connected-clients':
        return <TrafficStatsConnectedClients />;
      case 'access-points':
        return <AccessPoints />;
      case 'app-insights':
        return <AppInsights />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <div className="sticky top-0 z-50 bg-background border-b border-border p-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            {showBackButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('mobile-home')}
                className="p-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <h1 className="text-xl font-bold">EDGE</h1>
          </div>
          <UserMenu
            onLogout={onLogout}
            theme={theme}
            onThemeToggle={onThemeToggle}
            userEmail={localStorage.getItem('user_email') || undefined}
          />
        </div>

        {/* Site Selector - Only show on home */}
        {isHome && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Select Site</label>
            <Select value={currentSite} onValueChange={onSiteChange} disabled={loading}>
              <SelectTrigger className="w-full h-12 text-base">
                <SelectValue placeholder={loading ? 'Loading sites...' : 'Select a site'} />
              </SelectTrigger>
              <SelectContent>
                {sites.map((site) => (
                  <SelectItem key={site.id} value={site.id} className="text-base py-3">
                    {site.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Main Content */}
      {isHome ? (
        /* Dashboard - Stats + Large Buttons */
        <div className="p-6 space-y-6">
          {/* Status Overview */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">Network Status</h2>
            <div className="grid grid-cols-2 gap-3">
              {/* Clients Card */}
              <div className="bg-card border-2 border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Clients</span>
                </div>
                <div className="text-3xl font-bold">
                  {statsLoading ? '...' : stats.clients}
                </div>
              </div>

              {/* APs Card */}
              <div className="bg-card border-2 border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Wifi className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Access Points</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold">
                    {statsLoading ? '...' : stats.aps.online}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    / {stats.aps.total}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {stats.aps.online === stats.aps.total ? (
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                  ) : (
                    <Activity className="h-3 w-3 text-yellow-500" />
                  )}
                  <span className="text-xs text-muted-foreground">
                    {stats.aps.online === stats.aps.total ? 'All Online' : 'Some Offline'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Access Buttons */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">Quick Access</h2>
            <div className="space-y-3">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className="w-full p-5 bg-card border-2 border-border rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`${item.color} p-3 rounded-xl`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold">{item.title}</h3>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Page Content */
        <div className="p-4">
          <Suspense fallback={
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
                  <span className="sr-only">Loading...</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
              </div>
            </div>
          }>
            {renderPageContent()}
          </Suspense>
        </div>
      )}
    </div>
  );
}
