import React, { useState } from 'react';
import {
  Network,
  Laptop,
  Server,
  Globe,
  Power,
  CheckCircle,
  XCircle,
  ArrowRight,
  ShieldAlert,
  Cpu,
  Clock,
  Wifi,
  Layers,
  Zap,
  Info
} from 'lucide-react';
import { RouteEntry, WanId, WanInterface, LinksysDevice, CrossLayerSyncStatus } from '../types/network';

interface TopologyMapProps {
  wans: WanInterface[];
  routes: RouteEntry[];
  onToggleLink: (wanId: WanId) => void;
  linksysDevice?: LinksysDevice;
  crossLayerSync?: CrossLayerSyncStatus;
  onToggleLocalMasterNtp?: () => void;
}

export const TopologyMap: React.FC<TopologyMapProps> = ({
  wans,
  routes,
  onToggleLink,
  linksysDevice,
  crossLayerSync,
  onToggleLocalMasterNtp
}) => {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const wan1 = wans.find(w => w.id === 'ether1-wan1')!;
  const wan2 = wans.find(w => w.id === 'ether2-wan2')!;
  const wan3 = wans.find(w => w.id === 'ether3-wan3')!;

  const isRtcActive = linksysDevice?.rtc.installed && !linksysDevice?.rtc.isSimulated1970Bug;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Topologi Jaringan End-to-End: Klien, Edge Linksys RTC, Core MikroTik & Multi-WAN
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Integrasi arsitektural sub-layer router Linksys OpenWrt (Hardware RTC DS3231) menuju Core MikroTik CCR2004 dengan PCC Load Balance & 3 ISP Uplink.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block"></span>
            <span>Jalur Aktif (Online)</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
            <span>Cadangan (Standby)</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
            <span>Terputus (Down)</span>
          </div>
        </div>
      </div>

      {/* Interactive SVG Network Map */}
      <div className="relative bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 overflow-x-auto">
        <svg className="w-full min-w-[980px] h-[360px]" viewBox="0 0 1020 360">
          <defs>
            <linearGradient id="grad-active-wan1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="grad-active-wan2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0.9" />
            </linearGradient>
          </defs>

          {/* Connection Lines from Wireless Clients to Linksys OpenWrt */}
          <line
            x1="105"
            y1="170"
            x2="195"
            y2="170"
            stroke="#06b6d4"
            strokeWidth="2.5"
            strokeDasharray="4 4"
            className="animate-flow-dash"
          />

          {/* Connection Line: Linksys OpenWrt to MikroTik Core (LAN Gigabit Trunk) */}
          <line
            x1="335"
            y1="170"
            x2="435"
            y2="170"
            stroke="#38bdf8"
            strokeWidth="3.5"
            strokeDasharray="6 4"
            className="animate-flow-dash-fast"
          />

          {/* Time Sync Line: Linksys RTC Master -> MikroTik RouterOS (NTP Stratum 1 Feed) */}
          <path
            d="M 265 110 Q 385 60 485 110"
            fill="none"
            stroke={isRtcActive ? '#10b981' : '#f59e0b'}
            strokeWidth="2"
            strokeDasharray="3 3"
            className="animate-flow-dash"
          />
          <text x="350" y="70" fill={isRtcActive ? '#34d399' : '#fbbf24'} fontSize="9" fontFamily="monospace" textAnchor="middle">
            NTP Stratum 1 Master Time Feed (UDP 123)
          </text>

          {/* Connection Line Router to WAN 1 */}
          <line
            x1="555"
            y1="150"
            x2="695"
            y2="65"
            stroke={wan1.status === 'down' ? '#f43f5e' : '#06b6d4'}
            strokeWidth={wan1.status === 'down' ? '2' : '3.5'}
            strokeDasharray={wan1.status === 'down' ? '4 4' : '6 4'}
            className={wan1.status !== 'down' ? 'animate-flow-dash-fast' : ''}
          />

          {/* Connection Line Router to WAN 2 */}
          <line
            x1="555"
            y1="170"
            x2="695"
            y2="170"
            stroke={wan2.status === 'down' ? '#f43f5e' : '#10b981'}
            strokeWidth={wan2.status === 'down' ? '2' : '3.5'}
            strokeDasharray={wan2.status === 'down' ? '4 4' : '6 4'}
            className={wan2.status !== 'down' ? 'animate-flow-dash' : ''}
          />

          {/* Connection Line Router to WAN 3 (Backup) */}
          <line
            x1="555"
            y1="190"
            x2="695"
            y2="275"
            stroke={
              wan3.status === 'down'
                ? '#f43f5e'
                : wan3.status === 'active'
                ? '#f59e0b'
                : '#475569'
            }
            strokeWidth={wan3.status === 'active' ? '3.5' : '2'}
            strokeDasharray={wan3.status === 'active' ? '6 4' : '3 3'}
            className={wan3.status === 'active' ? 'animate-flow-dash' : ''}
          />

          {/* Lines from WANs to Internet */}
          <line
            x1="815"
            y1="65"
            x2="905"
            y2="150"
            stroke={wan1.status === 'down' ? '#475569' : '#06b6d4'}
            strokeWidth="2.5"
            strokeDasharray="6 4"
            className={wan1.status !== 'down' ? 'animate-flow-dash' : ''}
          />
          <line
            x1="815"
            y1="170"
            x2="905"
            y2="170"
            stroke={wan2.status === 'down' ? '#475569' : '#10b981'}
            strokeWidth="2.5"
            strokeDasharray="6 4"
            className={wan2.status !== 'down' ? 'animate-flow-dash' : ''}
          />
          <line
            x1="815"
            y1="275"
            x2="905"
            y2="190"
            stroke={wan3.status === 'active' ? '#f59e0b' : '#475569'}
            strokeWidth="2"
            strokeDasharray="6 4"
            className={wan3.status === 'active' ? 'animate-flow-dash' : ''}
          />

          {/* NODE 1: Wireless & LAN Clients */}
          <g transform="translate(15, 115)" className="cursor-pointer" onClick={() => setSelectedNode('clients')}>
            <rect width="90" height="110" rx="8" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
            <foreignObject width="90" height="110">
              <div className="flex flex-col items-center justify-center h-full p-2 text-center">
                <Laptop className="w-5 h-5 text-cyan-400 mb-1" />
                <span className="text-[10px] font-bold text-white">Stasiun Klien</span>
                <span className="text-[8px] font-mono text-slate-400">Wi-Fi & LAN</span>
                <span className="text-[8px] font-mono text-cyan-300 mt-1">2.4G & 5G Link</span>
                <span className="text-[8px] text-emerald-400 font-mono mt-0.5">Online</span>
              </div>
            </foreignObject>
          </g>

          {/* NODE 2: Linksys OpenWrt Sub-Layer Node (Hardware RTC DS3231) */}
          <g transform="translate(195, 95)" className="cursor-pointer" onClick={() => setSelectedNode('linksys')}>
            <rect
              width="140"
              height="150"
              rx="10"
              fill="#06121e"
              stroke="#0284c7"
              strokeWidth="2"
              strokeDasharray={linksysDevice?.powerState === 'rebooting' ? '4 4' : 'none'}
            />
            <foreignObject width="140" height="150">
              <div className="flex flex-col items-center justify-center h-full p-2 text-center">
                <div className="flex items-center gap-1">
                  <Wifi className="w-4 h-4 text-cyan-400" />
                  <span className="text-[11px] font-bold text-white truncate max-w-[100px]">Linksys OpenWrt</span>
                </div>
                <span className="text-[8px] font-mono text-slate-400">Node Sub-Layer Gateway</span>
                <span className="text-[8px] font-mono text-cyan-300">{linksysDevice?.lanIp || '192.168.1.1'}</span>

                <div className="mt-1.5 p-1 rounded bg-slate-900/90 border border-slate-700/80 w-full text-[8px] font-mono">
                  <div className="flex items-center justify-center gap-1 text-emerald-400">
                    <Clock className="w-2.5 h-2.5" />
                    <span>RTC: {linksysDevice?.rtc.chipModel.split(' ')[0] || 'DS3231'}</span>
                  </div>
                  <span className="text-slate-400 text-[7px] block">Bat: {linksysDevice?.rtc.batteryVoltage || 3.0}V (Good)</span>
                </div>

                <div className="mt-1 flex items-center gap-1 text-[8px] text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>Wi-Fi Master OK</span>
                </div>
              </div>
            </foreignObject>
          </g>

          {/* NODE 3: MikroTik RouterOS Gateway (CCR2004 Core) */}
          <g transform="translate(435, 95)" className="cursor-pointer" onClick={() => setSelectedNode('mikrotik')}>
            <rect width="120" height="150" rx="10" fill="#090d16" stroke="#0ea5e9" strokeWidth="2" />
            <foreignObject width="120" height="150">
              <div className="flex flex-col items-center justify-center h-full p-2 text-center">
                <Cpu className="w-6 h-6 text-sky-400 mb-1" />
                <span className="text-xs font-bold text-white">RouterOS v7</span>
                <span className="text-[8px] font-mono text-slate-400">CCR2004 Core</span>
                <span className="text-[8px] text-cyan-400 font-mono mt-1">PCC Balance (2:1)</span>
                <span className="text-[8px] bg-sky-950 text-sky-300 border border-sky-800 px-1 py-0.5 rounded mt-1">
                  Recursive Routing
                </span>
                <span className="text-[7px] font-mono text-emerald-400 mt-1">
                  NTP Client Sync OK
                </span>
              </div>
            </foreignObject>
          </g>

          {/* NODE 4: WAN 1 (IndiHome Fiber) */}
          <g transform="translate(695, 15)">
            <rect
              width="120"
              height="95"
              rx="8"
              fill={wan1.status === 'down' ? '#2e0f14' : '#0a1926'}
              stroke={wan1.status === 'down' ? '#f43f5e' : '#06b6d4'}
              strokeWidth="1.5"
            />
            <foreignObject width="120" height="95">
              <div className="flex flex-col items-center justify-center h-full p-2 text-center">
                <span className="text-[11px] font-bold text-white">WAN 1 (IndiHome)</span>
                <span className="text-[8px] font-mono text-slate-400">192.168.1.102</span>
                <span className="text-[8px] font-mono text-cyan-300">Dist 1 · PCC 2:1</span>
                <div className="mt-1">
                  {wan1.status === 'down' ? (
                    <span className="text-[9px] text-rose-400 font-bold">LINK DOWN</span>
                  ) : (
                    <span className="text-[9px] text-emerald-400 font-mono font-bold">{wan1.currentRxMbps} Mbps</span>
                  )}
                </div>
              </div>
            </foreignObject>
          </g>

          {/* NODE 5: WAN 2 (Biznet Dedicated) */}
          <g transform="translate(695, 120)">
            <rect
              width="120"
              height="95"
              rx="8"
              fill={wan2.status === 'down' ? '#2e0f14' : '#071e19'}
              stroke={wan2.status === 'down' ? '#f43f5e' : '#10b981'}
              strokeWidth="1.5"
            />
            <foreignObject width="120" height="95">
              <div className="flex flex-col items-center justify-center h-full p-2 text-center">
                <span className="text-[11px] font-bold text-white">WAN 2 (Biznet)</span>
                <span className="text-[8px] font-mono text-slate-400">192.168.2.55</span>
                <span className="text-[8px] font-mono text-emerald-300">Dist 2 · PCC 1:1</span>
                <div className="mt-1">
                  {wan2.status === 'down' ? (
                    <span className="text-[9px] text-rose-400 font-bold">LINK DOWN</span>
                  ) : (
                    <span className="text-[9px] text-emerald-400 font-mono font-bold">{wan2.currentRxMbps} Mbps</span>
                  )}
                </div>
              </div>
            </foreignObject>
          </g>

          {/* NODE 6: WAN 3 (Telkomsel Orbit 4G) */}
          <g transform="translate(695, 230)">
            <rect
              width="120"
              height="95"
              rx="8"
              fill={
                wan3.status === 'down'
                  ? '#2e0f14'
                  : wan3.status === 'active'
                  ? '#251b08'
                  : '#0f172a'
              }
              stroke={
                wan3.status === 'down'
                  ? '#f43f5e'
                  : wan3.status === 'active'
                  ? '#f59e0b'
                  : '#475569'
              }
              strokeWidth="1.5"
            />
            <foreignObject width="120" height="95">
              <div className="flex flex-col items-center justify-center h-full p-2 text-center">
                <span className="text-[11px] font-bold text-white">WAN 3 (Orbit 4G)</span>
                <span className="text-[8px] font-mono text-slate-400">192.168.8.20</span>
                <span className="text-[8px] font-mono text-amber-300">Dist 3 · Failover</span>
                <div className="mt-1">
                  {wan3.status === 'down' ? (
                    <span className="text-[9px] text-rose-400 font-bold">LINK DOWN</span>
                  ) : wan3.status === 'active' ? (
                    <span className="text-[9px] text-amber-400 font-bold">FAILOVER AKTIF</span>
                  ) : (
                    <span className="text-[9px] text-slate-400 font-mono">STANDBY SIAGA</span>
                  )}
                </div>
              </div>
            </foreignObject>
          </g>

          {/* NODE 7: Global Internet Targets */}
          <g transform="translate(905, 120)">
            <rect width="80" height="100" rx="8" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
            <foreignObject width="80" height="100">
              <div className="flex flex-col items-center justify-center h-full p-2 text-center">
                <Globe className="w-6 h-6 text-emerald-400 mb-1" />
                <span className="text-[10px] font-bold text-white">Internet</span>
                <span className="text-[8px] font-mono text-slate-400">8.8.8.8</span>
                <span className="text-[8px] font-mono text-slate-400">1.1.1.1</span>
              </div>
            </foreignObject>
          </g>
        </svg>
      </div>

      {/* Cross-Layer Synchronization & Routing Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card 1: Cross-Layer Synchronization Status */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Sinkronisasi Waktu Cross-Layer</span>
            </span>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
              crossLayerSync?.isSyncLocked ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-300'
            }`}>
              {crossLayerSync?.isSyncLocked ? 'Terkunci (Lock)' : 'Drift Warning'}
            </span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Perbandingan jam MikroTik Core vs Jam Register Hardware RTC Linksys OpenWrt.
          </p>

          <div className="space-y-1 text-[11px] font-mono bg-slate-900 p-2.5 rounded border border-slate-800">
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">MikroTik RouterOS:</span>
              <span className="text-slate-200">{crossLayerSync?.mikrotikClockString || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Linksys RTC DS3231:</span>
              <span className="text-cyan-300 font-bold">{crossLayerSync?.linksysRtcString || '-'}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-800">
              <span className="text-slate-500 font-sans">Divergensi (Clock Drift):</span>
              <span className="text-emerald-400">{crossLayerSync?.driftMs || 0} ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Integritas Forensik:</span>
              <span className="text-cyan-400 font-bold">{crossLayerSync?.forensicIntegrityScore || 100}%</span>
            </div>
          </div>

          {onToggleLocalMasterNtp && (
            <button
              onClick={onToggleLocalMasterNtp}
              className={`w-full py-1.5 px-2.5 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 border ${
                crossLayerSync?.localMasterNtpActive
                  ? 'bg-slate-900 border-emerald-700/60 text-emerald-300 hover:bg-slate-800'
                  : 'bg-cyan-500 border-cyan-400 text-slate-950 font-bold hover:bg-cyan-400'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>
                {crossLayerSync?.localMasterNtpActive
                  ? 'Linksys Master NTP Aktif (Stratum 1)'
                  : 'Aktifkan Linksys Master NTP'}
              </span>
            </button>
          )}
        </div>

        {/* Card 2: Quick Failover Triggers */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3.5 space-y-2">
          <div className="text-xs font-semibold text-slate-200 flex items-center justify-between">
            <span>Uji Coba Cepat Pemutusan Tautan</span>
            <Power className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <p className="text-[11px] text-slate-400">
            Simulasi manual pemutusan kabel ISP untuk melihat reaksi peralihan rute PCC real-time.
          </p>
          <div className="space-y-1.5 pt-1">
            {wans.map(wan => (
              <div key={wan.id} className="flex items-center justify-between text-xs py-1 px-2 bg-slate-900 rounded border border-slate-800">
                <span className="font-medium text-slate-300 truncate max-w-[150px]">{wan.name.split(' - ')[1]}</span>
                <button
                  onClick={() => onToggleLink(wan.id)}
                  className={`px-2 py-0.5 rounded font-mono text-[11px] transition-colors ${
                    wan.status === 'down'
                      ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                      : 'bg-rose-900/40 text-rose-300 border border-rose-800 hover:bg-rose-900/60'
                  }`}
                >
                  {wan.status === 'down' ? 'Hubungkan' : 'Putuskan'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Card 3: RouterOS Routing Table Summary */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
            <span>Tabel Rute RouterOS (/ip/route)</span>
            <span className="text-[10px] text-slate-500 font-mono">PCC & Failover</span>
          </div>
          <div className="space-y-1.5 overflow-y-auto max-h-48 text-[11px] font-mono">
            {routes.map(r => (
              <div key={r.id} className="p-2 bg-slate-900 rounded border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-slate-200 font-bold">{r.dstAddress} via {r.gateway}</div>
                  <div className="text-[10px] text-slate-500">{r.comment}</div>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-semibold ${r.active ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {r.active ? 'Active (A S)' : 'Standby'}
                  </span>
                  <div className="text-[9px] text-slate-400">Dist: {r.distance}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
