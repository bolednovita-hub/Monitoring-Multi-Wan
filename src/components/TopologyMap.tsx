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
  Info,
  GitBranch,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Terminal,
  Share2,
  HardDrive
} from 'lucide-react';
import {
  RouteEntry,
  WanId,
  WanInterface,
  LinksysDevice,
  CrossLayerSyncStatus,
  LinksysTopologyMode,
  TopologyArchitectureConfig
} from '../types/network';

interface TopologyMapProps {
  wans: WanInterface[];
  routes: RouteEntry[];
  onToggleLink: (wanId: WanId) => void;
  linksysDevice?: LinksysDevice;
  crossLayerSync?: CrossLayerSyncStatus;
  onToggleLocalMasterNtp?: () => void;
  topologyMode?: LinksysTopologyMode;
  onSelectTopologyMode?: (mode: LinksysTopologyMode) => void;
  vrrpMaster?: 'mikrotik' | 'linksys';
  onToggleVrrpMaster?: () => void;
}

export const TopologyMap: React.FC<TopologyMapProps> = ({
  wans,
  routes,
  onToggleLink,
  linksysDevice,
  crossLayerSync,
  onToggleLocalMasterNtp,
  topologyMode: propTopologyMode,
  onSelectTopologyMode,
  vrrpMaster: propVrrpMaster,
  onToggleVrrpMaster
}) => {
  const [localMode, setLocalMode] = useState<LinksysTopologyMode>('downstream_sublayer');
  const [localVrrpMaster, setLocalVrrpMaster] = useState<'mikrotik' | 'linksys'>('mikrotik');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [comparisonTab, setComparisonTab] = useState<'architecture' | 'spof' | 'cli_config'>('architecture');

  const activeMode = propTopologyMode || localMode;
  const activeVrrpMaster = propVrrpMaster || localVrrpMaster;

  const handleModeChange = (mode: LinksysTopologyMode) => {
    setLocalMode(mode);
    if (onSelectTopologyMode) {
      onSelectTopologyMode(mode);
    }
  };

  const handleVrrpToggle = () => {
    setLocalVrrpMaster(prev => (prev === 'mikrotik' ? 'linksys' : 'mikrotik'));
    if (onToggleVrrpMaster) {
      onToggleVrrpMaster();
    }
  };

  const wan1 = wans.find(w => w.id === 'ether1-wan1')!;
  const wan2 = wans.find(w => w.id === 'ether2-wan2')!;
  const wan3 = wans.find(w => w.id === 'ether3-wan3')!;

  const isRtcActive = linksysDevice?.rtc.installed && !linksysDevice?.rtc.isSimulated1970Bug;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Topologi Jaringan End-to-End: Multi-WAN, Core MikroTik & Linksys OpenWrt
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Eksplorasi arsitektur jaringan profesional: simulasi penempatan router Linksys di bawah (downstream) atau sejajar (paralel VRRP HA) dengan MikroTik Core.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono shrink-0">
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

      {/* Topology Architecture Selector (Interactive Switcher) */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <GitBranch className="w-4 h-4 text-cyan-400" />
            <span>Pilih Model Arsitektur Topologi Jaringan:</span>
          </div>
          <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/80 border border-cyan-800 px-2 py-0.5 rounded">
            Standar Industri: {activeMode === 'downstream_sublayer' ? 'Cisco Hierarchical Model' : activeMode === 'parallel_vrrp' ? 'IETF RFC 5798 (VRRPv3)' : 'NIST SP 800-160 OOBM'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Option 1: Downstream Bertingkat */}
          <button
            onClick={() => handleModeChange('downstream_sublayer')}
            className={`p-3 rounded-lg border text-left transition-all cursor-pointer relative ${
              activeMode === 'downstream_sublayer'
                ? 'bg-cyan-950/30 border-cyan-500 shadow-lg ring-1 ring-cyan-500/50'
                : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Model 1: Bertingkat (Di Bawah MikroTik)</span>
              </span>
              {activeMode === 'downstream_sublayer' && (
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 leading-snug">
              Linksys sebagai <strong>Sub-layer Access Gateway & AP Wi-Fi</strong>. Seluruh 3 WAN terpusat di MikroTik Core.
            </p>
            <div className="mt-2 text-[10px] font-mono text-cyan-300 flex items-center gap-1">
              <span>Klien &rarr; Linksys &rarr; MikroTik CCR2004 &rarr; 3 ISP</span>
            </div>
          </button>

          {/* Option 2: Parallel VRRP Sejajar */}
          <button
            onClick={() => handleModeChange('parallel_vrrp')}
            className={`p-3 rounded-lg border text-left transition-all cursor-pointer relative ${
              activeMode === 'parallel_vrrp'
                ? 'bg-emerald-950/30 border-emerald-500 shadow-lg ring-1 ring-emerald-500/50'
                : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Model 2: Sejajar (VRRP High-Availability)</span>
              </span>
              {activeMode === 'parallel_vrrp' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 leading-snug">
              Linksys <strong>SEJAJAR</strong> MikroTik berbagi Virtual Gateway (VIP 192.168.1.254). Linksys pegang langsung WAN 3 Orbit LTE.
            </p>
            <div className="mt-2 text-[10px] font-mono text-emerald-300 flex items-center gap-1">
              <span>Klien &rarr; VIP VRRP &harr; [MikroTik (M) / Linksys (B)]</span>
            </div>
          </button>

          {/* Option 3: Dedicated Offload / OOBM */}
          <button
            onClick={() => handleModeChange('edge_offload')}
            className={`p-3 rounded-lg border text-left transition-all cursor-pointer relative ${
              activeMode === 'edge_offload'
                ? 'bg-indigo-950/30 border-indigo-500 shadow-lg ring-1 ring-indigo-500/50'
                : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Model 3: Dedicated Edge Offload (OOBM)</span>
              </span>
              {activeMode === 'edge_offload' && (
                <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 leading-snug">
              MikroTik tangani WAN 1 & 2 (Produksi); Linksys tangani WAN 3 Orbit 4G sebagai gerbang <strong>Out-of-Band Remote & Time Server</strong>.
            </p>
            <div className="mt-2 text-[10px] font-mono text-indigo-300 flex items-center gap-1">
              <span>MikroTik (Prod WAN 1&2) + Linksys (OOBM WAN 3)</span>
            </div>
          </button>
        </div>

        {/* VRRP Live Simulation Trigger if Model 2 is Active */}
        {activeMode === 'parallel_vrrp' && (
          <div className="p-3 bg-emerald-950/20 border border-emerald-800/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <div className="font-semibold text-emerald-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Simulasi Failover Gateway VRRP (RFC 5798): Virtual IP 192.168.1.254</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Gateway Aktif Saat Ini:{' '}
                <strong className={activeVrrpMaster === 'mikrotik' ? 'text-sky-400' : 'text-amber-400'}>
                  {activeVrrpMaster === 'mikrotik'
                    ? 'MikroTik CCR2004 Core (MASTER - Priority 255 -> WAN1 & WAN2)'
                    : 'Linksys OpenWrt Edge (BACKUP -> MASTER Terpicu - Priority 100 -> WAN3 Orbit 4G)'}
                </strong>
              </p>
            </div>

            <button
              onClick={handleVrrpToggle}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-sm ${
                activeVrrpMaster === 'mikrotik'
                  ? 'bg-rose-500 hover:bg-rose-400 text-slate-950'
                  : 'bg-sky-500 hover:bg-sky-400 text-slate-950'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>
                {activeVrrpMaster === 'mikrotik'
                  ? 'Simulasikan MikroTik Down (Failover ke Linksys)'
                  : 'Pulihkan MikroTik Core (Kembali ke Master)'}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Dynamic SVG Network Map */}
      <div className="relative bg-slate-950/90 border border-slate-800/80 rounded-xl p-4 overflow-x-auto">
        {/* SVG DIAGRAM 1: Bertingkat (Downstream Sub-Layer) */}
        {activeMode === 'downstream_sublayer' && (
          <svg className="w-full min-w-[980px] h-[370px]" viewBox="0 0 1020 370">
            {/* Connection Lines from Wireless Clients to Linksys OpenWrt */}
            <line
              x1="105"
              y1="175"
              x2="195"
              y2="175"
              stroke="#06b6d4"
              strokeWidth="2.5"
              strokeDasharray="4 4"
              className="animate-flow-dash"
            />

            {/* Connection Line: Linksys OpenWrt to MikroTik Core (LAN Gigabit Trunk) */}
            <line
              x1="335"
              y1="175"
              x2="435"
              y2="175"
              stroke="#38bdf8"
              strokeWidth="3.5"
              strokeDasharray="6 4"
              className="animate-flow-dash-fast"
            />
            <text x="385" y="165" fill="#38bdf8" fontSize="8" fontFamily="monospace" textAnchor="middle">
              Gigabit Trunk (192.168.1.1 &rarr; 192.168.1.2)
            </text>

            {/* Time Sync Line: Linksys RTC Master -> MikroTik RouterOS (NTP Stratum 1 Feed) */}
            <path
              d="M 265 110 Q 385 60 485 110"
              fill="none"
              stroke={isRtcActive ? '#10b981' : '#f59e0b'}
              strokeWidth="2"
              strokeDasharray="3 3"
              className="animate-flow-dash"
            />
            <text x="385" y="68" fill={isRtcActive ? '#34d399' : '#fbbf24'} fontSize="9" fontFamily="monospace" textAnchor="middle">
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
              y1="175"
              x2="695"
              y2="175"
              stroke={wan2.status === 'down' ? '#f43f5e' : '#10b981'}
              strokeWidth={wan2.status === 'down' ? '2' : '3.5'}
              strokeDasharray={wan2.status === 'down' ? '4 4' : '6 4'}
              className={wan2.status !== 'down' ? 'animate-flow-dash' : ''}
            />

            {/* Connection Line Router to WAN 3 (Backup) */}
            <line
              x1="555"
              y1="200"
              x2="695"
              y2="285"
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
              y2="155"
              stroke={wan1.status === 'down' ? '#475569' : '#06b6d4'}
              strokeWidth="2.5"
              strokeDasharray="6 4"
              className={wan1.status !== 'down' ? 'animate-flow-dash' : ''}
            />
            <line
              x1="815"
              y1="175"
              x2="905"
              y2="175"
              stroke={wan2.status === 'down' ? '#475569' : '#10b981'}
              strokeWidth="2.5"
              strokeDasharray="6 4"
              className={wan2.status !== 'down' ? 'animate-flow-dash' : ''}
            />
            <line
              x1="815"
              y1="285"
              x2="905"
              y2="195"
              stroke={wan3.status === 'active' ? '#f59e0b' : '#475569'}
              strokeWidth="2"
              strokeDasharray="6 4"
              className={wan3.status === 'active' ? 'animate-flow-dash' : ''}
            />

            {/* NODE 1: Wireless & LAN Clients */}
            <g
              transform="translate(15, 120)"
              className="cursor-pointer transition-transform hover:opacity-90"
              onClick={() => setSelectedNode(selectedNode === 'clients' ? null : 'clients')}
            >
              <rect
                width="90"
                height="110"
                rx="8"
                fill="#0f172a"
                stroke={selectedNode === 'clients' ? '#22d3ee' : '#334155'}
                strokeWidth={selectedNode === 'clients' ? '3' : '1.5'}
              />
              <foreignObject width="90" height="110">
                <div className="flex flex-col items-center justify-center h-full p-2 text-center">
                  <Laptop className="w-5 h-5 text-cyan-400 mb-1" />
                  <span className="text-[10px] font-bold text-white">Stasiun Klien</span>
                  <span className="text-[8px] font-mono text-slate-400">Wi-Fi & LAN</span>
                  <span className="text-[8px] font-mono text-cyan-300 mt-1">192.168.1.0/24</span>
                  <span className="text-[8px] text-emerald-400 font-mono mt-0.5">Online</span>
                </div>
              </foreignObject>
            </g>

            {/* NODE 2: Linksys OpenWrt Sub-Layer Node (Downstream) */}
            <g
              transform="translate(195, 100)"
              className="cursor-pointer transition-transform hover:opacity-90"
              onClick={() => setSelectedNode(selectedNode === 'linksys' ? null : 'linksys')}
            >
              <rect
                width="140"
                height="150"
                rx="10"
                fill="#06121e"
                stroke={selectedNode === 'linksys' ? '#38bdf8' : '#0284c7'}
                strokeWidth={selectedNode === 'linksys' ? '3' : '2'}
              />
              <foreignObject width="140" height="150">
                <div className="flex flex-col items-center justify-center h-full p-2 text-center">
                  <div className="flex items-center gap-1">
                    <Wifi className="w-4 h-4 text-cyan-400" />
                    <span className="text-[11px] font-bold text-white truncate max-w-[100px]">Linksys OpenWrt</span>
                  </div>
                  <span className="text-[8px] font-mono text-slate-400">Sub-Layer Access Gateway</span>
                  <span className="text-[8px] font-mono text-cyan-300">192.168.1.1 (LAN)</span>

                  <div className="mt-1.5 p-1 rounded bg-slate-900/90 border border-slate-700/80 w-full text-[8px] font-mono">
                    <div className="flex items-center justify-center gap-1 text-emerald-400">
                      <Clock className="w-2.5 h-2.5" />
                      <span>RTC: {linksysDevice?.rtc.chipModel.split(' ')[0] || 'DS3231'}</span>
                    </div>
                    <span className="text-slate-400 text-[7px] block">NTP Stratum 1 Master OK</span>
                  </div>

                  <div className="mt-1 flex items-center gap-1 text-[8px] text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>Di Bawah MikroTik</span>
                  </div>
                </div>
              </foreignObject>
            </g>

            {/* NODE 3: MikroTik Core Gateway */}
            <g
              transform="translate(435, 100)"
              className="cursor-pointer transition-transform hover:opacity-90"
              onClick={() => setSelectedNode(selectedNode === 'mikrotik' ? null : 'mikrotik')}
            >
              <rect
                width="120"
                height="150"
                rx="10"
                fill="#090d16"
                stroke={selectedNode === 'mikrotik' ? '#38bdf8' : '#0ea5e9'}
                strokeWidth={selectedNode === 'mikrotik' ? '3' : '2'}
              />
              <foreignObject width="120" height="150">
                <div className="flex flex-col items-center justify-center h-full p-2 text-center">
                  <Cpu className="w-6 h-6 text-sky-400 mb-1" />
                  <span className="text-xs font-bold text-white">RouterOS v7</span>
                  <span className="text-[8px] font-mono text-slate-400">CCR2004 Core</span>
                  <span className="text-[8px] text-cyan-400 font-mono mt-1">PCC Balance (2:1)</span>
                  <span className="text-[8px] bg-sky-950 text-sky-300 border border-sky-800 px-1 py-0.5 rounded mt-1">
                    Semua 3 WAN Terpusat
                  </span>
                  <span className="text-[7px] font-mono text-emerald-400 mt-1">
                    NTP Sync dari Linksys
                  </span>
                </div>
              </foreignObject>
            </g>

            {/* NODE 4: WAN 1 (IndiHome) */}
            <g
              transform="translate(695, 20)"
              className="cursor-pointer transition-transform hover:opacity-90"
              onClick={() => setSelectedNode(selectedNode === 'wan1' ? null : 'wan1')}
            >
              <rect
                width="120"
                height="90"
                rx="8"
                fill={wan1.status === 'down' ? '#2e0f14' : '#0a1926'}
                stroke={selectedNode === 'wan1' ? '#38bdf8' : (wan1.status === 'down' ? '#f43f5e' : '#06b6d4')}
                strokeWidth={selectedNode === 'wan1' ? '3' : '1.5'}
              />
              <foreignObject width="120" height="90">
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

            {/* NODE 5: WAN 2 (Biznet) */}
            <g
              transform="translate(695, 130)"
              className="cursor-pointer transition-transform hover:opacity-90"
              onClick={() => setSelectedNode(selectedNode === 'wan2' ? null : 'wan2')}
            >
              <rect
                width="120"
                height="90"
                rx="8"
                fill={wan2.status === 'down' ? '#2e0f14' : '#071e19'}
                stroke={selectedNode === 'wan2' ? '#34d399' : (wan2.status === 'down' ? '#f43f5e' : '#10b981')}
                strokeWidth={selectedNode === 'wan2' ? '3' : '1.5'}
              />
              <foreignObject width="120" height="90">
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

            {/* NODE 6: WAN 3 (Telkomsel Orbit) */}
            <g
              transform="translate(695, 240)"
              className="cursor-pointer transition-transform hover:opacity-90"
              onClick={() => setSelectedNode(selectedNode === 'wan3' ? null : 'wan3')}
            >
              <rect
                width="120"
                height="90"
                rx="8"
                fill={
                  wan3.status === 'down'
                    ? '#2e0f14'
                    : wan3.status === 'active'
                    ? '#251b08'
                    : '#0f172a'
                }
                stroke={
                  selectedNode === 'wan3'
                    ? '#fbbf24'
                    : wan3.status === 'down'
                    ? '#f43f5e'
                    : wan3.status === 'active'
                    ? '#f59e0b'
                    : '#475569'
                }
                strokeWidth={selectedNode === 'wan3' ? '3' : '1.5'}
              />
              <foreignObject width="120" height="90">
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

            {/* NODE 7: Global Internet */}
            <g
              transform="translate(905, 125)"
              className="cursor-pointer transition-transform hover:opacity-90"
              onClick={() => setSelectedNode(selectedNode === 'internet' ? null : 'internet')}
            >
              <rect
                width="80"
                height="100"
                rx="8"
                fill="#0f172a"
                stroke={selectedNode === 'internet' ? '#38bdf8' : '#334155'}
                strokeWidth={selectedNode === 'internet' ? '3' : '1.5'}
              />
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
        )}

        {/* SVG DIAGRAM 2: Sejajar / Paralel (VRRP High-Availability) */}
        {activeMode === 'parallel_vrrp' && (
          <svg className="w-full min-w-[980px] h-[400px]" viewBox="0 0 1020 400">
            {/* Connection: Clients -> Virtual Router Switch (VIP 192.168.1.254) */}
            <line
              x1="95"
              y1="190"
              x2="175"
              y2="190"
              stroke="#06b6d4"
              strokeWidth="3"
              strokeDasharray="4 4"
              className="animate-flow-dash"
            />

            {/* Virtual Switch branches: Top to MikroTik Core (VRRP Master) */}
            <path
              d="M 275 190 L 330 190 L 330 90 L 380 90"
              fill="none"
              stroke={activeVrrpMaster === 'mikrotik' ? '#0ea5e9' : '#475569'}
              strokeWidth={activeVrrpMaster === 'mikrotik' ? '3.5' : '1.5'}
              strokeDasharray={activeVrrpMaster === 'mikrotik' ? '6 4' : '3 3'}
              className={activeVrrpMaster === 'mikrotik' ? 'animate-flow-dash-fast' : ''}
            />

            {/* Virtual Switch branches: Bottom to Linksys OpenWrt (VRRP Backup) */}
            <path
              d="M 275 190 L 330 190 L 330 290 L 380 290"
              fill="none"
              stroke={activeVrrpMaster === 'linksys' ? '#f59e0b' : '#475569'}
              strokeWidth={activeVrrpMaster === 'linksys' ? '3.5' : '1.5'}
              strokeDasharray={activeVrrpMaster === 'linksys' ? '6 4' : '3 3'}
              className={activeVrrpMaster === 'linksys' ? 'animate-flow-dash-fast' : ''}
            />

            {/* VRRP Heartbeat & Sync Line between MikroTik and Linksys */}
            <line
              x1="450"
              y1="155"
              x2="450"
              y2="225"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeDasharray="4 4"
              className="animate-flow-dash"
            />
            <text x="450" y="195" fill="#34d399" fontSize="8" fontFamily="monospace" textAnchor="middle">
              VRRP Multicast Heartbeat (224.0.0.18) & NTP
            </text>

            {/* MikroTik to WAN 1 */}
            <line
              x1="520"
              y1="70"
              x2="650"
              y2="50"
              stroke={wan1.status === 'down' || activeVrrpMaster !== 'mikrotik' ? '#475569' : '#06b6d4'}
              strokeWidth="3"
              strokeDasharray="6 4"
              className={wan1.status !== 'down' && activeVrrpMaster === 'mikrotik' ? 'animate-flow-dash-fast' : ''}
            />

            {/* MikroTik to WAN 2 */}
            <line
              x1="520"
              y1="95"
              x2="650"
              y2="135"
              stroke={wan2.status === 'down' || activeVrrpMaster !== 'mikrotik' ? '#475569' : '#10b981'}
              strokeWidth="3"
              strokeDasharray="6 4"
              className={wan2.status !== 'down' && activeVrrpMaster === 'mikrotik' ? 'animate-flow-dash' : ''}
            />

            {/* Linksys DIRECT to WAN 3 Orbit LTE */}
            <line
              x1="520"
              y1="290"
              x2="650"
              y2="290"
              stroke={
                wan3.status === 'down'
                  ? '#f43f5e'
                  : activeVrrpMaster === 'linksys'
                  ? '#f59e0b'
                  : '#10b981'
              }
              strokeWidth="3.5"
              strokeDasharray="6 4"
              className={activeVrrpMaster === 'linksys' || wan3.status === 'active' ? 'animate-flow-dash-fast' : ''}
            />
            <text x="585" y="280" fill="#f59e0b" fontSize="8" fontFamily="monospace" textAnchor="middle">
              Direct LTE Uplink
            </text>

            {/* WANs to Internet */}
            <line
              x1="770"
              y1="50"
              x2="885"
              y2="160"
              stroke={wan1.status === 'down' ? '#475569' : '#06b6d4'}
              strokeWidth="2.5"
              strokeDasharray="6 4"
              className={wan1.status !== 'down' ? 'animate-flow-dash' : ''}
            />
            <line
              x1="770"
              y1="135"
              x2="885"
              y2="175"
              stroke={wan2.status === 'down' ? '#475569' : '#10b981'}
              strokeWidth="2.5"
              strokeDasharray="6 4"
              className={wan2.status !== 'down' ? 'animate-flow-dash' : ''}
            />
            <line
              x1="770"
              y1="290"
              x2="885"
              y2="190"
              stroke={wan3.status === 'down' ? '#475569' : '#f59e0b'}
              strokeWidth="3"
              strokeDasharray="6 4"
              className={wan3.status !== 'down' ? 'animate-flow-dash' : ''}
            />

            {/* NODE: Klien */}
            <g transform="translate(15, 135)" className="cursor-pointer" onClick={() => setSelectedNode('clients')}>
              <rect width="80" height="110" rx="8" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
              <foreignObject width="80" height="110">
                <div className="flex flex-col items-center justify-center h-full p-2 text-center">
                  <Laptop className="w-5 h-5 text-cyan-400 mb-1" />
                  <span className="text-[10px] font-bold text-white">Klien Lab</span>
                  <span className="text-[8px] font-mono text-cyan-300 mt-1">Gateway:</span>
                  <span className="text-[8px] font-bold text-emerald-400 font-mono">192.168.1.254</span>
                  <span className="text-[7px] text-slate-400 font-mono">(Virtual IP)</span>
                </div>
              </foreignObject>
            </g>

            {/* NODE: Virtual IP VRRP Switch */}
            <g transform="translate(175, 135)">
              <rect
                width="100"
                height="110"
                rx="8"
                fill="#06121e"
                stroke="#06b6d4"
                strokeWidth="2"
                strokeDasharray="4 2"
              />
              <foreignObject width="100" height="110">
                <div className="flex flex-col items-center justify-center h-full p-2 text-center">
                  <ShieldCheck className="w-5 h-5 text-cyan-400 mb-1" />
                  <span className="text-[10px] font-bold text-white">VRRP Virtual IP</span>
                  <span className="text-[8px] font-mono text-cyan-300">192.168.1.254</span>
                  <span className="text-[7px] font-mono text-slate-400">VRID: 10</span>
                  <span className={`text-[8px] font-bold mt-1 px-1 rounded ${
                    activeVrrpMaster === 'mikrotik' ? 'bg-sky-950 text-sky-300 border border-sky-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}>
                    Aktif: {activeVrrpMaster === 'mikrotik' ? 'MikroTik' : 'Linksys'}
                  </span>
                </div>
              </foreignObject>
            </g>

            {/* NODE: MikroTik CCR2004 (Master VRRP - Sejajar Atas) */}
            <g
              transform="translate(380, 25)"
              className="cursor-pointer"
              onClick={() => setSelectedNode('mikrotik')}
            >
              <rect
                width="140"
                height="130"
                rx="10"
                fill="#090d16"
                stroke={activeVrrpMaster === 'mikrotik' ? '#0ea5e9' : '#334155'}
                strokeWidth={activeVrrpMaster === 'mikrotik' ? '3' : '1.5'}
              />
              <foreignObject width="140" height="130">
                <div className="flex flex-col items-center justify-center h-full p-2 text-center">
                  <Cpu className="w-5 h-5 text-sky-400 mb-0.5" />
                  <span className="text-xs font-bold text-white">MikroTik CCR2004</span>
                  <span className="text-[8px] font-mono text-slate-400">192.168.1.2 (Fisik)</span>
                  <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded mt-1 ${
                    activeVrrpMaster === 'mikrotik' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {activeVrrpMaster === 'mikrotik' ? 'VRRP MASTER (Pri 255)' : 'VRRP STANDBY'}
                  </span>
                  <span className="text-[8px] font-mono text-cyan-300 mt-1">Uplink: WAN 1 & WAN 2</span>
                </div>
              </foreignObject>
            </g>

            {/* NODE: Linksys OpenWrt (Backup VRRP - Sejajar Bawah) */}
            <g
              transform="translate(380, 225)"
              className="cursor-pointer"
              onClick={() => setSelectedNode('linksys')}
            >
              <rect
                width="140"
                height="130"
                rx="10"
                fill="#06121e"
                stroke={activeVrrpMaster === 'linksys' ? '#f59e0b' : '#0284c7'}
                strokeWidth={activeVrrpMaster === 'linksys' ? '3' : '2'}
              />
              <foreignObject width="140" height="130">
                <div className="flex flex-col items-center justify-center h-full p-2 text-center">
                  <Wifi className="w-5 h-5 text-cyan-400 mb-0.5" />
                  <span className="text-xs font-bold text-white">Linksys OpenWrt</span>
                  <span className="text-[8px] font-mono text-slate-400">192.168.1.3 (Fisik)</span>
                  <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded mt-1 ${
                    activeVrrpMaster === 'linksys' ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {activeVrrpMaster === 'linksys' ? 'VRRP MASTER AKTIF!' : 'VRRP BACKUP (Pri 100)'}
                  </span>
                  <span className="text-[8px] font-mono text-amber-300 mt-1">Direct Uplink: WAN 3 LTE</span>
                  <span className="text-[7px] text-emerald-400 mt-0.5">RTC DS3231 Master</span>
                </div>
              </foreignObject>
            </g>

            {/* WAN 1 (IndiHome via MikroTik) */}
            <g transform="translate(650, 10)" className="cursor-pointer" onClick={() => setSelectedNode('wan1')}>
              <rect width="120" height="75" rx="8" fill="#0a1926" stroke="#06b6d4" strokeWidth="1.5" />
              <foreignObject width="120" height="75">
                <div className="flex flex-col items-center justify-center h-full p-1.5 text-center">
                  <span className="text-[10px] font-bold text-white">WAN 1 (IndiHome)</span>
                  <span className="text-[8px] font-mono text-cyan-300">via MikroTik Core</span>
                  <span className="text-[9px] text-emerald-400 font-mono font-bold">{wan1.currentRxMbps} Mbps</span>
                </div>
              </foreignObject>
            </g>

            {/* WAN 2 (Biznet via MikroTik) */}
            <g transform="translate(650, 95)" className="cursor-pointer" onClick={() => setSelectedNode('wan2')}>
              <rect width="120" height="75" rx="8" fill="#071e19" stroke="#10b981" strokeWidth="1.5" />
              <foreignObject width="120" height="75">
                <div className="flex flex-col items-center justify-center h-full p-1.5 text-center">
                  <span className="text-[10px] font-bold text-white">WAN 2 (Biznet)</span>
                  <span className="text-[8px] font-mono text-emerald-300">via MikroTik Core</span>
                  <span className="text-[9px] text-emerald-400 font-mono font-bold">{wan2.currentRxMbps} Mbps</span>
                </div>
              </foreignObject>
            </g>

            {/* WAN 3 (Telkomsel Orbit via Linksys Direct) */}
            <g transform="translate(650, 250)" className="cursor-pointer" onClick={() => setSelectedNode('wan3')}>
              <rect
                width="120"
                height="80"
                rx="8"
                fill={activeVrrpMaster === 'linksys' ? '#251b08' : '#0f172a'}
                stroke="#f59e0b"
                strokeWidth="2"
              />
              <foreignObject width="120" height="80">
                <div className="flex flex-col items-center justify-center h-full p-1.5 text-center">
                  <span className="text-[10px] font-bold text-white">WAN 3 (Orbit 4G)</span>
                  <span className="text-[8px] font-mono text-amber-300">Langsung ke Linksys</span>
                  <span className="text-[9px] text-amber-400 font-mono font-bold">
                    {activeVrrpMaster === 'linksys' ? 'LALU LINTAS AKTIF' : 'STANDBY HOT-REDUNDANT'}
                  </span>
                </div>
              </foreignObject>
            </g>

            {/* Internet */}
            <g transform="translate(885, 125)" className="cursor-pointer" onClick={() => setSelectedNode('internet')}>
              <rect width="80" height="100" rx="8" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
              <foreignObject width="80" height="100">
                <div className="flex flex-col items-center justify-center h-full p-2 text-center">
                  <Globe className="w-6 h-6 text-emerald-400 mb-1" />
                  <span className="text-[10px] font-bold text-white">Internet</span>
                  <span className="text-[8px] font-mono text-slate-400">8.8.8.8</span>
                  <span className="text-[7px] text-emerald-400 font-mono">No SPOF</span>
                </div>
              </foreignObject>
            </g>
          </svg>
        )}

        {/* SVG DIAGRAM 3: Dedicated Edge Offload / OOBM */}
        {activeMode === 'edge_offload' && (
          <svg className="w-full min-w-[980px] h-[370px]" viewBox="0 0 1020 370">
            {/* Clients to MikroTik (Production) */}
            <line
              x1="95"
              y1="140"
              x2="260"
              y2="100"
              stroke="#06b6d4"
              strokeWidth="3"
              strokeDasharray="6 4"
              className="animate-flow-dash-fast"
            />
            <text x="175" y="110" fill="#06b6d4" fontSize="8" fontFamily="monospace" textAnchor="middle">
              Trafik Produksi (LAN User)
            </text>

            {/* NOC Admin to Linksys (OOBM) */}
            <line
              x1="95"
              y1="230"
              x2="260"
              y2="260"
              stroke="#a855f7"
              strokeWidth="2.5"
              strokeDasharray="4 4"
              className="animate-flow-dash"
            />
            <text x="175" y="270" fill="#c084fc" fontSize="8" fontFamily="monospace" textAnchor="middle">
              Jaringan Manajemen Terisolasi (OOBM)
            </text>

            {/* Isolated Serial / Management Trunk between Linksys & MikroTik */}
            <line
              x1="330"
              y1="160"
              x2="330"
              y2="210"
              stroke="#e2e8f0"
              strokeWidth="2"
              strokeDasharray="3 3"
            />
            <text x="340" y="185" fill="#e2e8f0" fontSize="7" fontFamily="monospace">
              Kabel Serial / AUX Rescue
            </text>

            {/* MikroTik to WAN 1 & 2 */}
            <line x1="400" y1="70" x2="560" y2="45" stroke="#06b6d4" strokeWidth="3" strokeDasharray="6 4" className="animate-flow-dash" />
            <line x1="400" y1="100" x2="560" y2="120" stroke="#10b981" strokeWidth="3" strokeDasharray="6 4" className="animate-flow-dash" />

            {/* Linksys to WAN 3 (Dedicated OOBM LTE) */}
            <line x1="400" y1="260" x2="560" y2="260" stroke="#f59e0b" strokeWidth="3" strokeDasharray="6 4" className="animate-flow-dash" />

            {/* WANs to Internet */}
            <line x1="680" y1="45" x2="800" y2="135" stroke="#06b6d4" strokeWidth="2.5" />
            <line x1="680" y1="120" x2="800" y2="155" stroke="#10b981" strokeWidth="2.5" />
            <line x1="680" y1="260" x2="800" y2="175" stroke="#f59e0b" strokeWidth="2.5" />

            {/* Node Klien */}
            <g transform="translate(15, 110)">
              <rect width="80" height="150" rx="8" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
              <foreignObject width="80" height="150">
                <div className="flex flex-col items-center justify-center h-full p-2 text-center">
                  <Laptop className="w-5 h-5 text-cyan-400 mb-1" />
                  <span className="text-[10px] font-bold text-white">Stasiun Lab & NOC</span>
                  <span className="text-[8px] text-cyan-300 font-mono mt-1">Dual-Homed</span>
                  <span className="text-[7px] text-slate-400 font-mono">LAN Produksi + VLAN OOBM</span>
                </div>
              </foreignObject>
            </g>

            {/* Node MikroTik (Production) */}
            <g transform="translate(260, 40)" className="cursor-pointer" onClick={() => setSelectedNode('mikrotik')}>
              <rect width="140" height="120" rx="10" fill="#090d16" stroke="#0ea5e9" strokeWidth="2" />
              <foreignObject width="140" height="120">
                <div className="flex flex-col items-center justify-center h-full p-2 text-center">
                  <Cpu className="w-5 h-5 text-sky-400 mb-0.5" />
                  <span className="text-xs font-bold text-white">MikroTik CCR2004</span>
                  <span className="text-[8px] font-mono text-cyan-300">Router Produksi</span>
                  <span className="text-[8px] bg-sky-950 text-sky-300 px-1 py-0.5 rounded mt-1">
                    PCC WAN 1 (Fiber) & WAN 2 (Biznet)
                  </span>
                </div>
              </foreignObject>
            </g>

            {/* Node Linksys (OOBM) */}
            <g transform="translate(260, 210)" className="cursor-pointer" onClick={() => setSelectedNode('linksys')}>
              <rect width="140" height="120" rx="10" fill="#06121e" stroke="#a855f7" strokeWidth="2" />
              <foreignObject width="140" height="120">
                <div className="flex flex-col items-center justify-center h-full p-2 text-center">
                  <Server className="w-5 h-5 text-purple-400 mb-0.5" />
                  <span className="text-xs font-bold text-white">Linksys OpenWrt</span>
                  <span className="text-[8px] font-mono text-purple-300">Dedicated OOBM Gateway</span>
                  <span className="text-[8px] bg-purple-950 text-purple-300 px-1 py-0.5 rounded mt-1">
                    WAN 3 Orbit (Jalur Darurat)
                  </span>
                  <span className="text-[7px] text-emerald-400 mt-0.5">RTC DS3231 Master Time</span>
                </div>
              </foreignObject>
            </g>

            {/* WAN Nodes */}
            <g transform="translate(560, 15)"><rect width="120" height="60" rx="6" fill="#0a1926" stroke="#06b6d4" /><foreignObject width="120" height="60"><div className="p-1 text-center text-[10px] text-white">WAN 1 (IndiHome Prod)</div></foreignObject></g>
            <g transform="translate(560, 90)"><rect width="120" height="60" rx="6" fill="#071e19" stroke="#10b981" /><foreignObject width="120" height="60"><div className="p-1 text-center text-[10px] text-white">WAN 2 (Biznet Prod)</div></foreignObject></g>
            <g transform="translate(560, 230)"><rect width="120" height="60" rx="6" fill="#251b08" stroke="#f59e0b" /><foreignObject width="120" height="60"><div className="p-1 text-center text-[10px] text-white">WAN 3 (Orbit OOBM 4G)</div></foreignObject></g>

            {/* Internet */}
            <g transform="translate(800, 115)"><rect width="80" height="90" rx="8" fill="#0f172a" stroke="#334155" /><foreignObject width="80" height="90"><div className="flex flex-col items-center justify-center h-full p-2 text-center"><Globe className="w-5 h-5 text-emerald-400 mb-1" /><span className="text-[10px] font-bold text-white">Internet</span></div></foreignObject></g>
          </svg>
        )}
      </div>

      {/* Selected Node Live Telemetry Inspector Card */}
      {selectedNode && (
        <div className="bg-slate-950 border border-cyan-500/40 rounded-xl p-4 shadow-xl animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                <Info className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Inspektur Telemetri Node Terpilih:</span>
                  <span className="text-cyan-400 font-mono uppercase">
                    {selectedNode === 'clients' && 'Stasiun Klien Lab (Wi-Fi 5G & LAN)'}
                    {selectedNode === 'linksys' && (linksysDevice?.name || 'Linksys OpenWrt Hardware RTC')}
                    {selectedNode === 'mikrotik' && 'MikroTik RouterOS Core Gateway (CCR2004)'}
                    {selectedNode === 'wan1' && 'WAN 1 IndiHome Fiber (ether1)'}
                    {selectedNode === 'wan2' && 'WAN 2 Biznet Dedicated (ether2)'}
                    {selectedNode === 'wan3' && 'WAN 3 Telkomsel Orbit 4G (ether3)'}
                    {selectedNode === 'internet' && 'Global Internet Uplink Probe (8.8.8.8)'}
                  </span>
                </h3>
                <p className="text-[10px] text-slate-400">
                  Data diagnostik langsung dari REST API router dan sub-layer telemetri pada mode {activeMode.replace('_', ' ').toUpperCase()}.
                </p>
              </div>
            </div>

            <button
              onClick={() => setSelectedNode(null)}
              className="px-2 py-1 text-[11px] font-mono text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded border border-slate-800 transition-colors cursor-pointer"
            >
              Tutup Inspektur (Esc)
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            {selectedNode === 'clients' && (
              <>
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-sans">Klien Terhubung:</div>
                  <div className="text-white font-bold mt-0.5">3 Perangkat Aktif</div>
                  <div className="text-[10px] text-cyan-400">ThinkPad-T14, iPad, IoT</div>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-sans">Default Gateway IP:</div>
                  <div className="text-cyan-300 font-bold mt-0.5">
                    {activeMode === 'parallel_vrrp' ? '192.168.1.254 (VRRP VIP)' : '192.168.1.1 (Linksys AP)'}
                  </div>
                  <div className="text-[10px] text-slate-400">Subnet: 192.168.1.0/24</div>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-sans">Koneksi Fisik:</div>
                  <div className="text-emerald-400 font-bold mt-0.5">Wi-Fi 6 MIMO & GbE</div>
                  <div className="text-[10px] text-slate-400">1201 Mbps PHY Rate</div>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-sans">Integritas Akses:</div>
                  <div className="text-emerald-400 font-bold mt-0.5">Normal (100%)</div>
                  <div className="text-[10px] text-slate-400">WPA3-Personal Security</div>
                </div>
              </>
            )}

            {selectedNode === 'linksys' && (
              <>
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-sans">Peran Topologi Saat Ini:</div>
                  <div className="text-cyan-300 font-bold mt-0.5">
                    {activeMode === 'downstream_sublayer' ? 'Downstream Sub-Layer AP' : activeMode === 'parallel_vrrp' ? 'VRRP Backup / Failover Master' : 'Dedicated OOBM LTE'}
                  </div>
                  <div className="text-[10px] text-slate-400">IP: {linksysDevice?.lanIp || '192.168.1.1'}</div>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-sans">Hardware RTC SoC:</div>
                  <div className="text-emerald-400 font-bold mt-0.5">{linksysDevice?.rtc.chipModel || 'DS3231 I2C'}</div>
                  <div className="text-[10px] text-slate-400">Bat: {linksysDevice?.rtc.batteryVoltage || 3.0}V (Good)</div>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-sans">Sinkronisasi Waktu:</div>
                  <div className="text-cyan-300 font-bold mt-0.5">NTP Stratum 1 Master</div>
                  <div className="text-[10px] text-slate-400">Port UDP 123 Broadcast</div>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-sans">Uplink Internet:</div>
                  <div className="text-amber-400 font-bold mt-0.5">
                    {activeMode === 'downstream_sublayer' ? 'via MikroTik CCR2004' : 'Langsung WAN 3 Orbit LTE'}
                  </div>
                  <div className="text-[10px] text-slate-400">OpenWrt 23.05 Release</div>
                </div>
              </>
            )}

            {selectedNode === 'mikrotik' && (
              <>
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-sans">Sistem Operasi:</div>
                  <div className="text-cyan-300 font-bold mt-0.5">RouterOS v7.14.3</div>
                  <div className="text-[10px] text-slate-400">Arsitektur: ARM64 CCR2004</div>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-sans">Peran Perutean:</div>
                  <div className="text-emerald-400 font-bold mt-0.5">
                    {activeMode === 'parallel_vrrp' ? 'VRRP Master (Priority 255)' : 'Core Multi-WAN Gateway'}
                  </div>
                  <div className="text-[10px] text-slate-400">PCC both-addresses-and-ports</div>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-sans">WAN Terkoneksi:</div>
                  <div className="text-cyan-300 font-bold mt-0.5">
                    {activeMode === 'downstream_sublayer' ? 'WAN 1 + WAN 2 + WAN 3' : 'WAN 1 (IndiHome) + WAN 2 (Biznet)'}
                  </div>
                  <div className="text-[10px] text-slate-400">Failover: Check-gateway=ping</div>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-sans">Toleransi Kegagalan:</div>
                  <div className="text-white font-bold mt-0.5">
                    {activeMode === 'parallel_vrrp' ? 'Tinggi (VRRP Clustered)' : 'Tergantung Core (SPOF)'}
                  </div>
                  <div className="text-[10px] text-cyan-400">NTP Client Sync OK</div>
                </div>
              </>
            )}

            {(selectedNode === 'wan1' || selectedNode === 'wan2' || selectedNode === 'wan3') && (() => {
              const currentWan = selectedNode === 'wan1' ? wan1 : selectedNode === 'wan2' ? wan2 : wan3;
              return (
                <>
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-400 font-sans">Status Antarmuka:</div>
                    <div className={`font-bold mt-0.5 ${currentWan.status === 'down' ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {currentWan.status === 'down' ? 'TERPUTUS (LINK DOWN)' : currentWan.status === 'active' ? 'AKTIF (TRAFIK NORMAL)' : 'STANDBY SIAGA'}
                    </div>
                    <div className="text-[10px] text-slate-400">IP: {currentWan.ipAddress}</div>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-400 font-sans">Laju Throughput:</div>
                    <div className="text-cyan-300 font-bold mt-0.5">{currentWan.currentRxMbps} Mbps Rx</div>
                    <div className="text-[10px] text-slate-400">{currentWan.currentTxMbps} Mbps Tx</div>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-400 font-sans">Latensi & Jitter:</div>
                    <div className="text-white font-bold mt-0.5">{currentWan.latencyMs} ms · {currentWan.jitterMs} ms</div>
                    <div className="text-[10px] text-slate-400">Packet Loss: {currentWan.packetLossPct}%</div>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 flex flex-col justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 font-sans">Aksi Link:</div>
                      <div className="text-[11px] text-slate-300">Simulasi Kabel ISP</div>
                    </div>
                    <button
                      onClick={() => onToggleLink(currentWan.id)}
                      className={`mt-1 py-1 px-2.5 rounded text-[11px] font-bold transition-colors cursor-pointer text-center ${
                        currentWan.status === 'down'
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          : 'bg-rose-900/50 hover:bg-rose-800 text-rose-200 border border-rose-700'
                      }`}
                    >
                      {currentWan.status === 'down' ? 'Hubungkan Kembali' : 'Putuskan Jalur (Failover)'}
                    </button>
                  </div>
                </>
              );
            })()}

            {selectedNode === 'internet' && (
              <>
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-sans">DNS Target Utama:</div>
                  <div className="text-cyan-300 font-bold mt-0.5">8.8.8.8 (Google DNS)</div>
                  <div className="text-[10px] text-slate-400">RTT Target: ~12ms</div>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-sans">DNS Target Sekunder:</div>
                  <div className="text-emerald-400 font-bold mt-0.5">1.1.1.1 (Cloudflare)</div>
                  <div className="text-[10px] text-slate-400">RTT Target: ~11ms</div>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-sans">Kategori QoS TIPHON:</div>
                  <div className="text-emerald-400 font-bold mt-0.5">Sangat Baik (Index 4.0)</div>
                  <div className="text-[10px] text-slate-400">Evaluasi Telemetri SLA</div>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-sans">Ketersediaan Rute:</div>
                  <div className="text-white font-bold mt-0.5">
                    {wans.filter(w => w.status === 'active').length} / 3 Jalur Online
                  </div>
                  <div className="text-[10px] text-cyan-400">Multi-Path Redundancy</div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Professional Networking Industry Comparison & Technical Deep Dive */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-white tracking-tight">
              Kajian Rekayasa Jaringan Profesional: Model Bertingkat vs Model Sejajar (ISP & Enterprise)
            </h3>
          </div>

          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px] font-mono">
            <button
              onClick={() => setComparisonTab('architecture')}
              className={`px-2.5 py-1 rounded transition-colors ${
                comparisonTab === 'architecture' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Matriks Komparasi
            </button>
            <button
              onClick={() => setComparisonTab('spof')}
              className={`px-2.5 py-1 rounded transition-colors ${
                comparisonTab === 'spof' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Analisis SPOF & Ketersediaan
            </button>
            <button
              onClick={() => setComparisonTab('cli_config')}
              className={`px-2.5 py-1 rounded transition-colors ${
                comparisonTab === 'cli_config' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Skrip Konfigurasi Riil
            </button>
          </div>
        </div>

        {/* Tab 1: Architecture Matrix */}
        {comparisonTab === 'architecture' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900 border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="p-3">Parameter Rekayasa</th>
                  <th className="p-3 text-cyan-300">Model A: Bertingkat (Downstream Sub-Layer)</th>
                  <th className="p-3 text-emerald-300">Model B: Sejajar (VRRP High-Availability)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                <tr className="hover:bg-slate-900/40">
                  <td className="p-3 font-semibold text-white">Posisi Fisik Linksys</td>
                  <td className="p-3 text-cyan-200">Di bawah MikroTik CCR2004 (Access Layer)</td>
                  <td className="p-3 text-emerald-200">Sejajar di sisi Edge Gateway (Core Layer HA)</td>
                </tr>
                <tr className="hover:bg-slate-900/40">
                  <td className="p-3 font-semibold text-white">Jalur Akses Internet Linksys</td>
                  <td className="p-3 text-slate-300">Mendapat internet dari MikroTik melalui trunk LAN</td>
                  <td className="p-3 text-emerald-300">Memiliki jalur uplink mandiri ke WAN 3 Orbit LTE</td>
                </tr>
                <tr className="hover:bg-slate-900/40">
                  <td className="p-3 font-semibold text-white">Gateway Perangkat Klien</td>
                  <td className="p-3 text-slate-300">192.168.1.1 (IP Linksys AP LAN)</td>
                  <td className="p-3 text-emerald-300 font-bold">192.168.1.254 (Virtual IP VRRP RFC 5798)</td>
                </tr>
                <tr className="hover:bg-slate-900/40">
                  <td className="p-3 font-semibold text-white">Distribusi Beban 3 ISP</td>
                  <td className="p-3 text-cyan-300">PCC 3/0, 3/1, 3/2 terpusat penuh di MikroTik CCR2004</td>
                  <td className="p-3 text-slate-300">WAN 1 & 2 di MikroTik (PCC 2/0, 2/1); WAN 3 cadangan di Linksys</td>
                </tr>
                <tr className="hover:bg-slate-900/40">
                  <td className="p-3 font-semibold text-white">Sinkronisasi Waktu RTC</td>
                  <td className="p-3 text-emerald-300 font-bold">Hardware RTC Linksys jadi Stratum 1 Master bagi MikroTik</td>
                  <td className="p-3 text-slate-300">Linksys siarkan NTP Multicast ke seluruh subnet LAN & MikroTik</td>
                </tr>
                <tr className="hover:bg-slate-900/40">
                  <td className="p-3 font-semibold text-white">Rekomendasi Terbaik</td>
                  <td className="p-3 text-cyan-400 font-bold">Sangat Ideal: Kampus, Lab Riset, Kantor Cabang</td>
                  <td className="p-3 text-emerald-400 font-bold">Sangat Ideal: Data Center, NOC ISP, Rumah Sakit (Mission Critical)</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: SPOF Analysis */}
        {comparisonTab === 'spof' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-3.5 space-y-2">
              <div className="flex items-center justify-between text-white font-bold">
                <span className="text-cyan-400">Analisis Model A: Bertingkat (Downstream)</span>
                <span className="text-[10px] text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
                  Ada SPOF
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                Jika router <strong>MikroTik CCR2004 mengalami kerusakan perangkat keras (mati total/reboot)</strong>, maka seluruh koneksi ke 3 ISP akan terputus bersamaan meskipun Linksys dan ISP tetap menyala.
              </p>
              <div className="p-2 bg-slate-950 rounded border border-slate-800 text-[10px] space-y-1">
                <div className="text-slate-300 font-semibold font-sans">Kelebihan Utama:</div>
                <div className="text-cyan-300">&bull; Konfigurasi PCC load balancer sangat bersih & efisien</div>
                <div className="text-cyan-300">&bull; Linksys murni fokus sebagai AP Wi-Fi 6 & Master Jam Hardware RTC</div>
              </div>
            </div>

            <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-3.5 space-y-2">
              <div className="flex items-center justify-between text-white font-bold">
                <span className="text-emerald-400">Analisis Model B: Sejajar (VRRP High-Availability)</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                  Zero SPOF (Toleran Rusak)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                Jika <strong>MikroTik CCR2004 mati atau listrik raknya padam</strong>, router Linksys OpenWrt secara otomatis mendeteksi ketiadaan paket VRRP heartbeat (dalam ~900 ms) dan langsung mengambil alih Virtual IP 192.168.1.254 melalui koneksi mandiri WAN 3 Orbit LTE.
              </p>
              <div className="p-2 bg-slate-950 rounded border border-slate-800 text-[10px] space-y-1">
                <div className="text-slate-300 font-semibold font-sans">Kelebihan Utama:</div>
                <div className="text-emerald-300">&bull; Akses internet klien tidak pernah down total (100% HA SLA)</div>
                <div className="text-emerald-300">&bull; Jalur darurat seluler 4G LTE terisolasi secara fisik dari rack core</div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Real CLI Configuration */}
        {comparisonTab === 'cli_config' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2">
              <div className="text-sky-400 font-bold text-xs flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" />
                <span>Konfigurasi VRRP MikroTik RouterOS v7 (Master)</span>
              </div>
              <pre className="text-slate-300 text-[10px] bg-slate-900 p-2.5 rounded border border-slate-800 overflow-x-auto whitespace-pre">
{`# 1. Buat interface VRRP di antarmuka LAN
/interface vrrp add name=vrrp-lan interface=bridge-lan \\
  vrid=10 priority=255 interval=1s version=3

# 2. Berikan Virtual IP bersama
/ip address add address=192.168.1.254/24 \\
  interface=vrrp-lan network=192.168.1.0

# 3. Tetapkan IP fisik router
/ip address add address=192.168.1.2/24 \\
  interface=bridge-lan network=192.168.1.0

# 4. Sinkron waktu NTP Client ke Linksys RTC
/system ntp client set enabled=yes
/system ntp client servers add address=192.168.1.1`}
              </pre>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2">
              <div className="text-emerald-400 font-bold text-xs flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" />
                <span>Konfigurasi VRRP Linksys OpenWrt (Backup)</span>
              </div>
              <pre className="text-slate-300 text-[10px] bg-slate-900 p-2.5 rounded border border-slate-800 overflow-x-auto whitespace-pre">
{`# /etc/config/keepalived di OpenWrt
vrrp_instance VI_LAN {
  state BACKUP
  interface br-lan
  virtual_router_id 10
  priority 100
  advert_int 1
  virtual_ipaddress {
    192.168.1.254/24
  }
}

# Skrip On-Master (Pemicu failover ke WAN3 Orbit)
notify_master "/sbin/route add default gw 192.168.8.1 dev wwan0"

# Hardware RTC DS3231 Master NTP Broadcast
ntpd -l -N -p 123 -I br-lan`}
              </pre>
            </div>
          </div>
        )}
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
