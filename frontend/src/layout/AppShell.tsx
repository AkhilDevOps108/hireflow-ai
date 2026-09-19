import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { AICopilot } from '../features/copilot/AICopilot';

export function AppShell() {
  return (
    <div className="hf-shell">
      <Sidebar />
      <div className="hf-main-area">
        <TopBar />
        <main className="hf-workspace">
          <Outlet />
        </main>
      </div>
      <AICopilot />
    </div>
  );
}
