/**
 * Contextual Insights Selector Component
 *
 * Tab-based selector for filtering by AI Insights, Site, Access Point, Switch, or Client.
 * Follows the pattern: tabs at top, search box, then filterable list.
 */

import { useState, useEffect, useMemo } from 'react';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Search, Sparkles, Building, Radio, Network, Users } from 'lucide-react';
import { cn } from './ui/utils';
import { apiService, Site } from '../services/api';
import { getSiteDisplayName } from '../contexts/SiteContext';

export type SelectorTab = 'ai-insights' | 'site' | 'access-point' | 'switch' | 'client';

interface SelectorItem {
  id: string;
  name: string;
  subtitle?: string;
  status?: 'online' | 'offline' | 'warning';
}

interface ContextualInsightsSelectorProps {
  activeTab?: SelectorTab;
  selectedId?: string;
  onTabChange?: (tab: SelectorTab) => void;
  onSelectionChange?: (tab: SelectorTab, id: string | null) => void;
  className?: string;
}

const tabs: { id: SelectorTab; label: string; icon: React.ElementType; beta?: boolean }[] = [
  { id: 'ai-insights', label: 'AI Insights', icon: Sparkles },
  { id: 'site', label: 'Site', icon: Building },
  { id: 'access-point', label: 'Access Point', icon: Radio },
  { id: 'switch', label: 'Switch', icon: Network, beta: true },
  { id: 'client', label: 'Client', icon: Users },
];

export function ContextualInsightsSelector({
  activeTab = 'ai-insights',
  selectedId,
  onTabChange,
  onSelectionChange,
  className = ''
}: ContextualInsightsSelectorProps) {
  const [currentTab, setCurrentTab] = useState<SelectorTab>(activeTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<SelectorItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(selectedId || null);

  // Load items based on active tab
  useEffect(() => {
    loadItems(currentTab);
  }, [currentTab]);

  const loadItems = async (tab: SelectorTab) => {
    setLoading(true);
    setItems([]);

    try {
      switch (tab) {
        case 'ai-insights':
          // AI Insights doesn't need a list - it shows insights directly
          setItems([
            { id: 'network-health', name: 'Network Health Analysis', subtitle: 'Overall network performance' },
            { id: 'anomaly-detection', name: 'Anomaly Detection', subtitle: 'Unusual patterns detected' },
            { id: 'capacity-planning', name: 'Capacity Planning', subtitle: 'Resource utilization trends' },
            { id: 'predictive-maintenance', name: 'Predictive Maintenance', subtitle: 'Potential issues forecast' },
          ]);
          break;

        case 'site':
          const sites = await apiService.getSites();
          setItems(sites.map((site: Site) => ({
            id: site.id,
            name: getSiteDisplayName(site),
            subtitle: site.siteGroup || undefined,
            status: 'online' as const
          })));
          break;

        case 'access-point':
          const aps = await apiService.getAccessPoints();
          setItems(aps.slice(0, 100).map((ap: any) => ({
            id: ap.serialNumber || ap.id,
            name: ap.displayName || ap.name || ap.serialNumber,
            subtitle: ap.siteName || ap.model || undefined,
            status: ap.connectionState === 'Connected' || ap.status === 'online' ? 'online' : 'offline'
          })));
          break;

        case 'switch':
          // Switches endpoint - may need adjustment based on actual API
          try {
            const switches = await apiService.getSwitches?.() || [];
            setItems(switches.slice(0, 100).map((sw: any) => ({
              id: sw.serialNumber || sw.id,
              name: sw.displayName || sw.name || sw.serialNumber,
              subtitle: sw.siteName || sw.model || undefined,
              status: sw.connectionState === 'Connected' || sw.status === 'online' ? 'online' : 'offline'
            })));
          } catch {
            // If switches API not available, show placeholder
            setItems([]);
          }
          break;

        case 'client':
          const clients = await apiService.getStations();
          setItems(clients.slice(0, 100).map((client: any) => ({
            id: client.macAddress || client.id,
            name: client.hostName || client.macAddress,
            subtitle: client.ssid || client.serviceName || undefined,
            status: 'online' as const
          })));
          break;
      }
    } catch (error) {
      console.warn('[ContextualInsightsSelector] Failed to load items:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: SelectorTab) => {
    setCurrentTab(tab);
    setSearchQuery('');
    setSelectedItemId(null);
    onTabChange?.(tab);
    onSelectionChange?.(tab, null);
  };

  const handleItemSelect = (itemId: string) => {
    const newId = selectedItemId === itemId ? null : itemId;
    setSelectedItemId(newId);
    onSelectionChange?.(currentTab, newId);
  };

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(item =>
      item.name.toLowerCase().includes(query) ||
      item.subtitle?.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);

  return (
    <div className={cn("flex flex-col bg-card border rounded-lg shadow-sm", className)}>
      {/* Tabs */}
      <div className="flex border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={cn(
              "flex-1 px-3 py-3 text-sm font-medium transition-colors relative",
              "hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              currentTab === tab.id
                ? "text-primary border-b-2 border-primary -mb-[1px]"
                : "text-muted-foreground"
            )}
          >
            <div className="flex flex-col items-center gap-0.5">
              <span className="whitespace-nowrap">{tab.label}</span>
              {tab.beta && (
                <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  Beta
                </Badge>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Search Box */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${tabs.find(t => t.id === currentTab)?.label || ''}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Items List */}
      <ScrollArea className="h-[300px]">
        <div className="p-1">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
              Loading...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
              {searchQuery ? 'No matches found' : 'No items available'}
            </div>
          ) : (
            filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleItemSelect(item.id)}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-md transition-colors",
                  "hover:bg-muted/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  selectedItemId === item.id && "bg-primary/10 border-l-2 border-primary"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{item.name}</div>
                    {item.subtitle && (
                      <div className="text-xs text-muted-foreground truncate">{item.subtitle}</div>
                    )}
                  </div>
                  {item.status && currentTab !== 'ai-insights' && (
                    <div className={cn(
                      "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                      item.status === 'online' && "bg-green-500",
                      item.status === 'offline' && "bg-red-500",
                      item.status === 'warning' && "bg-amber-500"
                    )} />
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
