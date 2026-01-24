import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Radio, TestTube, Zap, Network } from 'lucide-react';
import { AFCPlanningTool } from './AFCPlanningTool';
import { ApiTestTool } from './ApiTestTool';
import { RFManagementTools } from './RFManagementTools';
import { PacketCapture } from './PacketCapture';

export function Tools() {
  const [activeTab, setActiveTab] = useState('rf-management');

  return (
    <div className="h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
        <div className="border-b">
          <TabsList className="h-12 px-6">
            <TabsTrigger value="rf-management" className="flex items-center gap-2">
              <Radio className="h-4 w-4" />
              RF Management
            </TabsTrigger>
            <TabsTrigger value="afc-planning" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              AFC Planning
            </TabsTrigger>
            <TabsTrigger value="api-test" className="flex items-center gap-2">
              <TestTube className="h-4 w-4" />
              API Test
            </TabsTrigger>
            <TabsTrigger value="packet-capture" className="flex items-center gap-2">
              <Network className="h-4 w-4" />
              Packet Capture
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="rf-management" className="m-0 h-[calc(100%-3rem)]">
          <RFManagementTools />
        </TabsContent>

        <TabsContent value="afc-planning" className="m-0 h-[calc(100%-3rem)]">
          <AFCPlanningTool />
        </TabsContent>

        <TabsContent value="api-test" className="m-0 h-[calc(100%-3rem)]">
          <ApiTestTool />
        </TabsContent>

        <TabsContent value="packet-capture" className="m-0 h-[calc(100%-3rem)]">
          <PacketCapture />
        </TabsContent>
      </Tabs>
    </div>
  );
}
