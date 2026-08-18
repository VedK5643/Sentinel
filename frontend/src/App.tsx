import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import Home from '@/pages/Home';
import Agents from '@/pages/Agents';
import AgentWorkspace from '@/pages/AgentWorkspace';
import AgentOverview from '@/pages/AgentOverview';
import AgentAudits from '@/pages/AgentAudits';
import AgentTraces from '@/pages/AgentTraces';
import Scorecard from '@/pages/Scorecard';
import Compare from '@/pages/Compare';
import TraceViewer from '@/pages/TraceViewer';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Home />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/agents/:agentId" element={<AgentWorkspace />}>
            <Route index element={<AgentOverview />} />
            <Route path="audits" element={<AgentAudits />} />
            <Route path="scorecard" element={<Scorecard />} />
            <Route path="traces" element={<AgentTraces />} />
          </Route>
          <Route path="/audit/:runId" element={<div className="p-8 text-muted">Audit Run Placeholder</div>} />
          <Route path="/trace/:traceId" element={<TraceViewer />} />
          <Route path="/compare" element={<Compare />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}