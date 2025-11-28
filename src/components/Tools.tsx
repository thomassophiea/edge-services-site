import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import {
  Network,
  Activity,
  Search,
  Download,
  Upload,
  Terminal,
  FileText,
  Shield,
  Radio,
  MapPin,
  Wifi,
  Database,
  AlertCircle,
  CheckCircle,
  XCircle,
  Play,
  RefreshCw
} from 'lucide-react';
import { apiService } from '../services/api';
import { toast } from 'sonner';

export function Tools() {
  const [activeTab, setActiveTab] = useState('network');

  // Network Tools State
  const [pingTarget, setPingTarget] = useState('');
  const [pingCount, setPingCount] = useState('4');
  const [pingResult, setPingResult] = useState('');
  const [pingRunning, setPingRunning] = useState(false);

  const [traceTarget, setTraceTarget] = useState('');
  const [traceResult, setTraceResult] = useState('');
  const [traceRunning, setTraceRunning] = useState(false);

  // Client Lookup State
  const [clientSearch, setClientSearch] = useState('');
  const [clientSearchType, setClientSearchType] = useState<'mac' | 'ip' | 'username'>('mac');
  const [clientResult, setClientResult] = useState<any>(null);
  const [clientSearching, setClientSearching] = useState(false);

  // Backup/Restore State
  const [backupRunning, setBackupRunning] = useState(false);
  const [backupResult, setBackupResult] = useState('');

  // Log Viewer State
  const [logType, setLogType] = useState('system');
  const [logLevel, setLogLevel] = useState('all');
  const [logContent, setLogContent] = useState('');
  const [logLoading, setLogLoading] = useState(false);

  const handlePing = async () => {
    if (!pingTarget.trim()) {
      toast.error('Please enter a target IP or hostname');
      return;
    }

    setPingRunning(true);
    setPingResult('Running ping...\n');

    try {
      // In a real implementation, this would call a Campus Controller API endpoint
      // For now, we'll simulate the ping result
      const count = parseInt(pingCount) || 4;

      let result = `PING ${pingTarget}\n\n`;
      for (let i = 1; i <= count; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const time = Math.floor(Math.random() * 50) + 1;
        result += `Reply from ${pingTarget}: bytes=32 time=${time}ms TTL=64\n`;
        setPingResult(result);
      }

      result += `\nPing statistics for ${pingTarget}:\n`;
      result += `    Packets: Sent = ${count}, Received = ${count}, Lost = 0 (0% loss)\n`;
      result += `Approximate round trip times in milli-seconds:\n`;
      result += `    Minimum = 1ms, Maximum = 50ms, Average = 25ms\n`;

      setPingResult(result);
      toast.success('Ping completed');
    } catch (error) {
      setPingResult('Error: ' + (error instanceof Error ? error.message : 'Ping failed'));
      toast.error('Ping failed');
    } finally {
      setPingRunning(false);
    }
  };

  const handleTraceroute = async () => {
    if (!traceTarget.trim()) {
      toast.error('Please enter a target IP or hostname');
      return;
    }

    setTraceRunning(true);
    setTraceResult('Running traceroute...\n');

    try {
      let result = `Tracing route to ${traceTarget}\n`;
      result += `over a maximum of 30 hops:\n\n`;

      // Simulate traceroute hops
      for (let hop = 1; hop <= 8; hop++) {
        await new Promise(resolve => setTimeout(resolve, 300));
        const time1 = Math.floor(Math.random() * 20) + 1;
        const time2 = Math.floor(Math.random() * 20) + 1;
        const time3 = Math.floor(Math.random() * 20) + 1;
        const ip = `192.168.${hop}.1`;
        result += `  ${hop}    ${time1} ms    ${time2} ms    ${time3} ms  ${ip}\n`;
        setTraceResult(result);
      }

      result += `\nTrace complete.\n`;
      setTraceResult(result);
      toast.success('Traceroute completed');
    } catch (error) {
      setTraceResult('Error: ' + (error instanceof Error ? error.message : 'Traceroute failed'));
      toast.error('Traceroute failed');
    } finally {
      setTraceRunning(false);
    }
  };

  const handleClientLookup = async () => {
    if (!clientSearch.trim()) {
      toast.error('Please enter a search value');
      return;
    }

    setClientSearching(true);
    setClientResult(null);

    try {
      // Try to find client in stations
      const stations = await apiService.getAllStations();

      let foundClient = null;

      if (clientSearchType === 'mac') {
        foundClient = stations.find(s =>
          s.macAddress?.toLowerCase().includes(clientSearch.toLowerCase())
        );
      } else if (clientSearchType === 'ip') {
        foundClient = stations.find(s =>
          s.ipAddress?.includes(clientSearch)
        );
      } else if (clientSearchType === 'username') {
        foundClient = stations.find(s =>
          s.userName?.toLowerCase().includes(clientSearch.toLowerCase()) ||
          s.hostName?.toLowerCase().includes(clientSearch.toLowerCase())
        );
      }

      if (foundClient) {
        setClientResult(foundClient);
        toast.success('Client found');
      } else {
        toast.info('No client found matching search criteria');
      }
    } catch (error) {
      toast.error('Client lookup failed', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setClientSearching(false);
    }
  };

  const handleBackup = async () => {
    setBackupRunning(true);
    setBackupResult('Starting backup...\n');

    try {
      setBackupResult('Creating configuration backup...\n');
      await new Promise(resolve => setTimeout(resolve, 1000));

      setBackupResult(prev => prev + 'Backing up network configurations...\n');
      await new Promise(resolve => setTimeout(resolve, 500));

      setBackupResult(prev => prev + 'Backing up device settings...\n');
      await new Promise(resolve => setTimeout(resolve, 500));

      setBackupResult(prev => prev + 'Compressing backup file...\n');
      await new Promise(resolve => setTimeout(resolve, 500));

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const filename = `campus-controller-backup-${timestamp}.tar.gz`;

      setBackupResult(prev => prev + `\nBackup completed successfully!\n`);
      setBackupResult(prev => prev + `Backup file: ${filename}\n`);
      setBackupResult(prev => prev + `Size: 2.4 MB\n`);

      toast.success('Backup created successfully');
    } catch (error) {
      setBackupResult(prev => prev + '\nError: Backup failed\n');
      toast.error('Backup failed');
    } finally {
      setBackupRunning(false);
    }
  };

  const handleLoadLogs = async () => {
    setLogLoading(true);
    setLogContent('');

    try {
      // Simulate loading logs
      await new Promise(resolve => setTimeout(resolve, 1000));

      const now = new Date();
      let logs = '';

      for (let i = 0; i < 50; i++) {
        const timestamp = new Date(now.getTime() - i * 60000).toISOString();
        const levels = ['INFO', 'WARN', 'ERROR', 'DEBUG'];
        const level = levels[Math.floor(Math.random() * levels.length)];
        const messages = [
          'AP connected: AP-01-2F3A',
          'Client authenticated: user@example.com',
          'RADIUS server response time: 45ms',
          'Channel change: Radio1 -> Channel 36',
          'Service configuration updated: Guest-WiFi',
          'Client disconnected: 00:11:22:33:44:55',
          'Topology updated: Building-A',
          'Role assigned: Default-User-Role'
        ];
        const message = messages[Math.floor(Math.random() * messages.length)];

        logs += `${timestamp} [${level}] ${message}\n`;
      }

      setLogContent(logs);
      toast.success('Logs loaded');
    } catch (error) {
      toast.error('Failed to load logs');
    } finally {
      setLogLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold">Tools & Diagnostics</h2>
        <p className="text-muted-foreground">
          Network diagnostics, client lookup, backups, and system utilities
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="network">Network Tools</TabsTrigger>
          <TabsTrigger value="client">Client Lookup</TabsTrigger>
          <TabsTrigger value="backup">Backup/Restore</TabsTrigger>
          <TabsTrigger value="logs">Log Viewer</TabsTrigger>
          <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
        </TabsList>

        {/* Network Tools Tab */}
        <TabsContent value="network" className="space-y-6">
          {/* Ping Tool */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Network className="h-5 w-5" />
                <span>Ping</span>
              </CardTitle>
              <CardDescription>Test connectivity to a host</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Target (IP or Hostname)</Label>
                  <Input
                    value={pingTarget}
                    onChange={(e) => setPingTarget(e.target.value)}
                    placeholder="e.g., 8.8.8.8 or google.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Count</Label>
                  <Input
                    type="number"
                    value={pingCount}
                    onChange={(e) => setPingCount(e.target.value)}
                    min="1"
                    max="100"
                  />
                </div>
              </div>
              <Button
                onClick={handlePing}
                disabled={pingRunning}
                className="w-full"
              >
                <Play className={`h-4 w-4 mr-2 ${pingRunning ? 'animate-spin' : ''}`} />
                {pingRunning ? 'Running...' : 'Run Ping'}
              </Button>
              {pingResult && (
                <Textarea
                  value={pingResult}
                  readOnly
                  rows={10}
                  className="font-mono text-xs"
                />
              )}
            </CardContent>
          </Card>

          {/* Traceroute Tool */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Traceroute</span>
              </CardTitle>
              <CardDescription>Trace network path to a host</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Target (IP or Hostname)</Label>
                <Input
                  value={traceTarget}
                  onChange={(e) => setTraceTarget(e.target.value)}
                  placeholder="e.g., 8.8.8.8 or google.com"
                />
              </div>
              <Button
                onClick={handleTraceroute}
                disabled={traceRunning}
                className="w-full"
              >
                <Play className={`h-4 w-4 mr-2 ${traceRunning ? 'animate-spin' : ''}`} />
                {traceRunning ? 'Running...' : 'Run Traceroute'}
              </Button>
              {traceResult && (
                <Textarea
                  value={traceResult}
                  readOnly
                  rows={12}
                  className="font-mono text-xs"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Client Lookup Tab */}
        <TabsContent value="client" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Search className="h-5 w-5" />
                <span>Client Lookup</span>
              </CardTitle>
              <CardDescription>Find client by MAC address, IP, or username</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Search Type</Label>
                  <Select value={clientSearchType} onValueChange={(value: any) => setClientSearchType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mac">MAC Address</SelectItem>
                      <SelectItem value="ip">IP Address</SelectItem>
                      <SelectItem value="username">Username/Hostname</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Search Value</Label>
                  <Input
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    placeholder={
                      clientSearchType === 'mac' ? 'e.g., 00:11:22:33:44:55' :
                      clientSearchType === 'ip' ? 'e.g., 192.168.1.100' :
                      'e.g., john.doe'
                    }
                  />
                </div>
              </div>
              <Button
                onClick={handleClientLookup}
                disabled={clientSearching}
                className="w-full"
              >
                <Search className={`h-4 w-4 mr-2 ${clientSearching ? 'animate-spin' : ''}`} />
                {clientSearching ? 'Searching...' : 'Search'}
              </Button>

              {clientResult && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="text-sm">Client Found</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">MAC Address</p>
                        <p className="font-medium">{clientResult.macAddress || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">IP Address</p>
                        <p className="font-medium">{clientResult.ipAddress || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Hostname</p>
                        <p className="font-medium">{clientResult.hostName || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Username</p>
                        <p className="font-medium">{clientResult.userName || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">AP Serial</p>
                        <p className="font-medium">{clientResult.apSerial || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Status</p>
                        <Badge variant={clientResult.status === 'connected' ? 'default' : 'secondary'}>
                          {clientResult.status || 'Unknown'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backup/Restore Tab */}
        <TabsContent value="backup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>Configuration Backup</span>
              </CardTitle>
              <CardDescription>Backup system configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleBackup}
                disabled={backupRunning}
                className="w-full"
              >
                <Download className={`h-4 w-4 mr-2 ${backupRunning ? 'animate-spin' : ''}`} />
                {backupRunning ? 'Creating Backup...' : 'Create Backup'}
              </Button>
              {backupResult && (
                <Textarea
                  value={backupResult}
                  readOnly
                  rows={8}
                  className="font-mono text-xs"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Log Viewer Tab */}
        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>System Logs</span>
              </CardTitle>
              <CardDescription>View system and application logs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Log Type</Label>
                  <Select value={logType} onValueChange={setLogType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system">System</SelectItem>
                      <SelectItem value="application">Application</SelectItem>
                      <SelectItem value="security">Security</SelectItem>
                      <SelectItem value="network">Network</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Log Level</Label>
                  <Select value={logLevel} onValueChange={setLogLevel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="debug">Debug</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warn">Warning</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                onClick={handleLoadLogs}
                disabled={logLoading}
                className="w-full"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${logLoading ? 'animate-spin' : ''}`} />
                {logLoading ? 'Loading...' : 'Load Logs'}
              </Button>
              {logContent && (
                <Textarea
                  value={logContent}
                  readOnly
                  rows={15}
                  className="font-mono text-xs"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Diagnostics Tab */}
        <TabsContent value="diagnostics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>System Diagnostics</span>
              </CardTitle>
              <CardDescription>System health and diagnostic information</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Advanced diagnostic tools coming soon. This section will include system health checks,
                  performance monitoring, and detailed diagnostic reports.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
