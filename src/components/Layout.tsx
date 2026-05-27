import { ReactNode } from 'react';
import { Database, FileText, Play, CheckSquare, BarChart3, Settings as SettingsIcon } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  currentView: 'dashboard' | 'datasets' | 'configs' | 'runs' | 'reviews' | 'settings';
  onNavigate: (view: 'dashboard' | 'datasets' | 'configs' | 'runs' | 'reviews' | 'settings') => void;
}

export function Layout({ children, currentView, onNavigate }: LayoutProps) {
  const navItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: BarChart3 },
    { id: 'datasets' as const, label: 'Datasets', icon: Database },
    { id: 'configs' as const, label: 'Eval Configs', icon: FileText },
    { id: 'runs' as const, label: 'Eval Runs', icon: Play },
    { id: 'reviews' as const, label: 'Reviews', icon: CheckSquare },
    { id: 'settings' as const, label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-8 h-8 text-blue-600" />
              <span className="text-xl font-semibold text-slate-900">AI Eval Tool</span>
            </div>
            <div className="flex space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
