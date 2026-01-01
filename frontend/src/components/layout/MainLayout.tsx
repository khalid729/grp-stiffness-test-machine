import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export const MainLayout = () => {
  const [isConnected, setIsConnected] = useState(true);
  const { t } = useTranslation();

  const handleEmergencyStop = () => {
    toast.error(t('header.emergencyStop') + ' - Machine Stopped!', {
      duration: 5000,
    });
    // In real implementation, this would send WebSocket command to stop the machine
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header isConnected={isConnected} onEmergencyStop={handleEmergencyStop} />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
