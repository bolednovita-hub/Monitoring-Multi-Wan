import React, { useState } from 'react';
import {
  Activity,
  Layers,
  Network,
  Cpu,
  ShieldCheck,
  FlaskConical,
  RefreshCw,
  Menu,
  X,
  Server,
  Clock,
  ChevronRight,
  Terminal,
  GraduationCap,
  Lock,
  UserCheck,
  Sun,
  Moon
} from 'lucide-react';
import { authService } from '../services/authService';

export type ActiveTab = 'dashboard' | 'topology' | 'pcc' | 'terminal' | 'api' | 'tiphon' | 'linksys' | 'chaos';

interface NavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  pollInterval: number;
  onChangePollInterval: (interval: number) => void;
  onOpenChaosModal: () => void;
  onOpenDefenseModal?: () => void;
  onOpenLoginModal: () => void;
}

interface NavItem {
  id: ActiveTab;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
}

const navItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard Monitoring',
    sublabel: 'Telemetri Real-Time & 3 Gerbang WAN',
    icon: Activity,
  },
  {
    id: 'topology',
    label: 'Topologi Multi-WAN',
    sublabel: 'Diagram Klien -> Linksys -> MikroTik',
    icon: Network,
  },
  {
    id: 'pcc',
    label: 'Sesi Koneksi PCC',
    sublabel: 'Pelacak Sesi Hashing & Failover Migrasi',
    icon: Layers,
    badge: 'PCC Live',
    badgeColor: 'text-indigo-400 bg-indigo-950/80 border-indigo-800'
  },
  {
    id: 'terminal',
    label: 'Terminal CLI & Netwatch',
    sublabel: 'Konsol MikroTik v7 & Probe Kesehatan',
    icon: Terminal,
    badge: 'CLI v7',
    badgeColor: 'text-emerald-400 bg-emerald-950/80 border-emerald-800'
  },
  {
    id: 'api',
    label: 'RouterOS REST API',
    sublabel: 'Inspeksi Endpoint & Raw Polling',
    icon: Cpu,
  },
  {
    id: 'tiphon',
    label: 'Standar TIPHON QoS',
    sublabel: 'Throughput, Delay, Jitter, Packet Loss',
    icon: ShieldCheck,
  },
  {
    id: 'linksys',
    label: 'Linksys & RTC OpenWrt',
    sublabel: 'Hardware RTC DS3231 & Kontrol Wi-Fi',
    icon: Layers,
    badge: 'RTC I2C',
    badgeColor: 'text-emerald-400 bg-emerald-950/80 border-emerald-800'
  },
  {
    id: 'chaos',
    label: 'Lab Simulasi Failover',
    sublabel: 'Uji Pemutusan Serat & Benchmark',
    icon: FlaskConical,
    badge: 'Uji Lab',
    badgeColor: 'text-amber-400 bg-amber-950/80 border-amber-800'
  }
];

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  isDarkMode,
  onToggleTheme,
  pollInterval,
  onChangePollInterval,
  onOpenChaosModal,
  onOpenDefenseModal,
  onOpenLoginModal
}) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const currentUser = authService.getCurrentUser();

  const handleSelectTab = (tab: ActiveTab) => {
    onSelectTab(tab);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Top Header for Mobile Only */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xs font-bold text-white tracking-tight">
              Multi-WAN Router API
            </h1>
            <p className="text-[10px] text-slate-400 font-mono">
              MikroTik RouterOS v7 & RTC Linksys
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Sleek Icon-only Login on Mobile */}
          <button
            onClick={onOpenLoginModal}
            className={`p-2 rounded-lg transition-colors border ${
              currentUser?.role === 'admin'
                ? 'bg-rose-950/70 text-rose-300 border-rose-700/60'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title={currentUser?.role === 'admin' ? 'Administrator Gateway (Aktif)' : 'Login Administrator'}
            aria-label="Login Administrator"
          >
            {currentUser?.role === 'admin' ? (
              <ShieldCheck className="w-4 h-4 text-rose-400" />
            ) : (
              <Lock className="w-4 h-4 text-cyan-400" />
            )}
          </button>

          <button
            onClick={onToggleTheme}
            className="p-1.5 text-slate-400 hover:text-cyan-300 bg-slate-900 border border-slate-800 rounded-lg transition-colors"
            title={isDarkMode ? 'Mode Terang' : 'Mode Gelap (NOC)'}
            aria-label="Ganti Tema"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-cyan-400" />}
          </button>

          <button
            onClick={onOpenChaosModal}
            className="p-1.5 text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded transition-colors text-xs font-semibold"
            title="Lab Simulasi Failover"
          >
            <FlaskConical className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors border border-slate-800"
            aria-label="Toggle navigation menu"
          >
            {isMobileOpen ? <X className="w-5 h-5 text-cyan-400" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Backdrop for Mobile */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Vertical Navigation Sidebar (Desktop sticky on left, Mobile drawer) */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-slate-950 border-r border-slate-800 flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:h-screen md:sticky ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand & NOC Telemetry Header */}
        <div className="p-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm shrink-0">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-white tracking-tight leading-snug">
                  Multi-WAN Router API
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">
                    REST API Connected
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={onToggleTheme}
                className="p-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/40 hover:bg-slate-800 transition-colors cursor-pointer"
                title={isDarkMode ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap (NOC)'}
                aria-label="Toggle Theme"
              >
                {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-cyan-400" />}
              </button>

              <button
                onClick={onOpenLoginModal}
                className={`p-2 rounded-lg border transition-all duration-200 shadow-sm relative group cursor-pointer ${
                  currentUser?.role === 'admin'
                    ? 'bg-rose-500/15 text-rose-300 border-rose-500/40 hover:bg-rose-500/25'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-cyan-300 hover:border-cyan-500/40 hover:bg-slate-800'
                }`}
                title={currentUser?.role === 'admin' ? 'Administrator Gateway (Aktif)' : 'Login Administrator'}
                aria-label="Login Administrator"
              >
                {currentUser?.role === 'admin' ? (
                  <>
                    <ShieldCheck className="w-4 h-4 text-rose-400" />
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
                  </>
                ) : (
                  <Lock className="w-4 h-4" />
                )}
              </button>

              <button
                onClick={() => setIsMobileOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white md:hidden"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-semibold text-slate-300">Sistem Monitoring Multi-WAN</span>
            <span className="font-mono text-cyan-400">RouterOS v7</span>
          </div>
        </div>

        {/* Section Label */}
        <div className="px-4 pt-4 pb-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center justify-between">
          <span>Menu Navigasi Sistem</span>
          <span className="text-[9px] font-mono text-cyan-500">v2.4</span>
        </div>

        {/* Vertical Nav Links */}
        <nav className="flex-1 px-3 py-2 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`w-full text-left rounded-lg p-2.5 transition-all flex items-center justify-between group ${
                  isActive
                    ? 'bg-slate-900 border border-cyan-500/40 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`p-2 rounded-md transition-colors shrink-0 ${
                      isActive
                        ? 'bg-cyan-500/20 text-cyan-400'
                        : 'bg-slate-900 text-slate-400 group-hover:text-cyan-400 group-hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-semibold truncate ${
                          isActive ? 'text-cyan-300' : 'text-slate-200'
                        }`}
                      >
                        {item.label}
                      </span>
                      {item.badge && (
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.2 rounded border shrink-0 ${
                            item.badgeColor || 'text-cyan-400 bg-cyan-950 border-cyan-800'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 group-hover:text-slate-400 truncate mt-0.5">
                      {item.sublabel}
                    </p>
                  </div>
                </div>

                <ChevronRight
                  className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                    isActive ? 'text-cyan-400 translate-x-0.5' : 'text-slate-600 opacity-0 group-hover:opacity-100'
                  }`}
                />
              </button>
            );
          })}
        </nav>

        {/* System Status in Sidebar Bottom */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/50 space-y-3 shrink-0">
          {/* Polling Interval Selector */}
          <div className="flex items-center justify-between text-xs bg-slate-950 p-2 rounded-lg border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400">
              <RefreshCw
                className="w-3.5 h-3.5 text-cyan-400 animate-spin"
                style={{ animationDuration: `${pollInterval * 2}ms` }}
              />
              <span className="text-[11px] font-medium">Interval Polling:</span>
            </div>
            <select
              value={pollInterval}
              onChange={(e) => onChangePollInterval(Number(e.target.value))}
              className="bg-slate-900 text-cyan-300 text-xs font-mono border border-slate-700 rounded px-1.5 py-0.5 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value={1000}>1 Detik</option>
              <option value={2000}>2 Detik</option>
              <option value={5000}>5 Detik</option>
            </select>
          </div>

          {/* Quick Action Buttons */}
          <div className="space-y-1.5">
            {onOpenDefenseModal && (
              <button
                onClick={() => {
                  onOpenDefenseModal();
                  setIsMobileOpen(false);
                }}
                className="w-full py-2 px-3 text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-lg transition-all flex items-center justify-center gap-2 shadow-md border border-cyan-400/30"
              >
                <GraduationCap className="w-4 h-4 text-cyan-200" />
                <span>Mode Presentasi Arsitektur NOC</span>
              </button>
            )}

            <button
              onClick={() => {
                onOpenChaosModal();
                setIsMobileOpen(false);
              }}
              className="w-full py-1.5 px-3 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Lab Simulasi Failover</span>
            </button>
          </div>

          {/* Cross-layer hardware indicators */}
          <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span className="flex items-center gap-1">
              <Server className="w-3 h-3 text-sky-400" /> CCR2004 Core
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-emerald-400" /> DS3231 RTC
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
