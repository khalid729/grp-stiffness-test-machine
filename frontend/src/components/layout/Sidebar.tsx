import { useTranslation } from 'react-i18next';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FlaskConical,
  Gamepad2,
  FileText,
  AlertTriangle,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import logo from '@/assets/logo.jpg';

const navItems = [
  { key: 'dashboard', icon: LayoutDashboard, path: '/' },
  { key: 'testSetup', icon: FlaskConical, path: '/test' },
  { key: 'manual', icon: Gamepad2, path: '/manual' },
  { key: 'reports', icon: FileText, path: '/reports' },
  { key: 'alarms', icon: AlertTriangle, path: '/alarms' },
  { key: 'settings', icon: Settings, path: '/settings' },
];

export const Sidebar = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { isRTL } = useLanguage();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo Area */}
      <div className={cn(
        "flex items-center justify-center border-b border-sidebar-border bg-sidebar-foreground/10",
        collapsed ? "h-16 px-2" : "h-20 px-4"
      )}>
        {!collapsed && (
          <img 
            src={logo} 
            alt="Al Muhaideb National" 
            className="h-14 w-auto object-contain"
          />
        )}
        {collapsed && (
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-teal to-brand-blue flex items-center justify-center">
            <span className="text-xl font-bold text-sidebar-foreground">M</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <li key={item.key}>
                <NavLink
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200',
                    'hover:bg-sidebar-accent',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                      : 'text-sidebar-foreground/80'
                  )}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && (
                    <span className="truncate">{t(`nav.${item.key}`)}</span>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Collapse Button */}
      <div className="border-t border-sidebar-border p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {collapsed ? (
            isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
          ) : (
            isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />
          )}
          {!collapsed && (
            <span className="ml-2">{isRTL ? 'طي' : 'Collapse'}</span>
          )}
        </Button>
      </div>
    </aside>
  );
};
