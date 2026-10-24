import React from 'react';
import {
  Scan,
  KanbanSquare,
  BarChart3,
  Building2,
  CheckCircle2,
  MapPin,
  Settings
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, stats, onOpenSettings, onOpenNewReport }) {
  const tabs = [
    { id: 'detect', label: 'Report', icon: Scan },
    { id: 'kanban', label: 'Work List', icon: KanbanSquare },
    { id: 'analytics', label: 'Stats', icon: BarChart3 },
    { id: 'authorities', label: 'Offices', icon: Building2 },
    { id: 'references', label: 'References', icon: MapPin },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('detect')}>
            <img
              src="/logo-full.svg"
              alt="SADAKSIGNAL - From Road Hazard to Verified Repair Follow-up"
              className="h-10 w-auto max-w-[min(58vw,250px)]"
            />
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Right Action Items & Status */}
          <div className="flex items-center gap-3">
            {stats && (
              <div className="hidden lg:flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-red-300">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  <span>{stats.severity_distribution?.CRITICAL || 0} Critical</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{stats.resolution_rate_percent || 0}% Resolved</span>
                </div>
              </div>
            )}

            <button
              onClick={onOpenNewReport}
              className="flex items-center gap-2 px-3 py-2 rounded-md bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium transition-colors"
            >
              <Scan className="w-4 h-4" />
              <span>New Report</span>
            </button>
            <button
              onClick={onOpenSettings}
              className="p-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              aria-label="System configuration"
              title="System configuration"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
