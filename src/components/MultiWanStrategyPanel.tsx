import React from 'react';
import {
  Layers,
  Network,
  ShieldCheck,
  Zap,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Compass,
  Radio,
  Share2
} from 'lucide-react';
import {
  LoadBalancingConfig,
  LoadBalancingMode,
  TrafficCategoryStat,
  WanInterface
} from '../types/network';

interface MultiWanStrategyPanelProps {
  config: LoadBalancingConfig;
  trafficCategories: TrafficCategoryStat[];
  wans: WanInterface[];
  onChangeMode: (mode: LoadBalancingMode) => void;
  onChangePccClassifier: (classifier: 'src-address' | 'src-address-and-port' | 'both-addresses-and-ports') => void;
  onChangeCheckInterval: (sec: number) => void;
}

export const MultiWanStrategyPanel: React.FC<MultiWanStrategyPanelProps> = ({
  config,
  trafficCategories,
  wans,
  onChangeMode,
  onChangePccClassifier,
  onChangeCheckInterval
}) => {
  const modes: { id: LoadBalancingMode; label: string; desc: string; icon: any }[] = [
    {
      id: 'pcc',
      label: 'PCC (Per Connection Classifier)',
      desc: 'Membagi beban sesi hashing proporsional (2:1:1) berbasis tuple IP/Port.',
      icon: Layers
    },
    {
      id: 'ecmp',
      label: 'ECMP (Equal-Cost Multi-Path)',
      desc: 'Multi-gateway default route 0.0.0.0/0 dengan round-robin kernel.',
      icon: Share2
    },
    {
      id: 'failover_recursive',
      label: 'Recursive Route Failover',
      desc: 'Hierarki Distance 1 -> 2 -> 3 dengan probe check-gateway=ping.',
      icon: ArrowRightLeft
    },
    {
      id: 'pbr_qos',
      label: 'PBR QoS Policy-Based',
      desc: 'Prioritas rute berdasarkan jenis aplikasi (VoIP, Video, Web, Bulk).',
      icon: Compass
    }
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">
              Arsitektur Load Balancing & Mesin Failover Multi-WAN
            </h2>
            <p className="text-xs text-slate-400">
              RouterOS v7 Mangle Table · Algoritma Hashing · Pengawasan Check-Gateway
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/70 border border-emerald-800/80 px-2 py-0.5 rounded flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Switchover: {config.lastFailoverSwitchMs}ms
          </span>
          <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
            Trigger: {config.failoverTriggerCount}x
          </span>
        </div>
      </div>

      {/* Mode Selector Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {modes.map(m => {
          const Icon = m.icon;
          const isSelected = config.mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => onChangeMode(m.id)}
              className={`p-3 rounded-lg text-left transition-all border flex flex-col justify-between ${
                isSelected
                  ? 'bg-cyan-950/30 border-cyan-500/60 shadow-sm ring-1 ring-cyan-500/30'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-cyan-400' : 'text-slate-400'}`} />
                    <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                      {m.label.split(' (')[0]}
                    </span>
                  </div>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {m.desc}
                </p>
              </div>
              <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono">
                <span className="text-slate-500">Status</span>
                <span className={isSelected ? 'text-cyan-400 font-semibold' : 'text-slate-500'}>
                  {isSelected ? 'AKTIF (Berjalan)' : 'Klik Aktifkan'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Sub-Panel: Dynamic Tuning Controls & Application Class Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-1">
        {/* Left Column: PCC Hash Classifier & Check-Gateway Tuning */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
            <span className="font-semibold text-slate-200">Parameter Mesin Routing</span>
            <span className="text-[10px] font-mono text-cyan-400">{config.activeBalancingRatio}</span>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">
              Field PCC Hash Classifier (Mangle):
            </label>
            <select
              value={config.pccClassifier}
              onChange={(e) => onChangePccClassifier(e.target.value as any)}
              className="w-full bg-slate-900 text-cyan-300 text-xs font-mono border border-slate-700 rounded px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="both-addresses-and-ports">both-addresses-and-ports (Rekomendasi - Paling Merata)</option>
              <option value="src-address-and-port">src-address-and-port (Bagus untuk Multi-Client)</option>
              <option value="src-address">src-address (Menjaga Sesi Per-IP Klien)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Interval Ping Gateway:</label>
              <select
                value={config.checkGatewayIntervalSec}
                onChange={(e) => onChangeCheckInterval(Number(e.target.value))}
                className="w-full bg-slate-900 text-slate-200 text-xs font-mono border border-slate-700 rounded px-2 py-1 focus:outline-none focus:border-cyan-500"
              >
                <option value={1}>1 Detik (Agresif)</option>
                <option value={3}>3 Detik (Standar)</option>
                <option value={5}>5 Detik (Hemat)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Ambang Failover:</label>
              <div className="bg-slate-900 border border-slate-700 text-slate-200 px-2 py-1 rounded text-xs font-mono">
                {config.failoverThresholdAttempts}x Gagal Ping
              </div>
            </div>
          </div>

          {/* Real-Time Check-Gateway Heartbeat */}
          <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
              Deteksi Detak Jantung Check-Gateway:
            </span>
            {wans.map(w => (
              <div key={w.id} className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${w.status === 'down' ? 'bg-rose-500' : 'bg-emerald-400 animate-pulse'}`} />
                  <span className="text-slate-300 truncate">{w.name.split(' - ')[1]}</span>
                </div>
                <span className={w.status === 'down' ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                  {w.status === 'down' ? 'PING TIMEOUT' : `REPLY ${w.latencyMs}ms`}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Application Traffic Distribution Matrix across WANs */}
        <div className="lg:col-span-2 bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
              <span className="font-semibold text-slate-200">
                Matriks Pemetaan Kategori Trafik Aplikasi Real-Time
              </span>
              <span className="text-[10px] font-mono text-slate-400">Firewall Mangle QoS</span>
            </div>

            <div className="mt-2.5 space-y-2">
              {trafficCategories.map(cat => {
                const assignedWan = wans.find(w => w.id === cat.allocatedWan);
                const isDown = assignedWan?.status === 'down';
                return (
                  <div
                    key={cat.category}
                    className="p-2 rounded bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200 truncate">
                          {cat.label}
                        </span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                          cat.qosPriority === 'High' ? 'text-emerald-400 bg-emerald-950/80 border-emerald-800' :
                          cat.qosPriority === 'Normal' ? 'text-cyan-400 bg-cyan-950/80 border-cyan-800' :
                          'text-slate-400 bg-slate-800 border-slate-700'
                        }`}>
                          {cat.qosPriority}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono mt-0.5">
                        <span>Throughput: <strong className="text-white">{cat.totalMbps} Mbps</strong></span>
                        <span>·</span>
                        <span>{cat.activeSessions} Sesi Terbuka</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 font-mono text-xs">
                      <div className="text-[10px] text-slate-500">Rute Gerbang Keluar:</div>
                      <div className={`font-bold flex items-center gap-1 justify-end ${
                        isDown ? 'text-rose-400' :
                        cat.allocatedWan === 'ether1-wan1' ? 'text-cyan-400' :
                        cat.allocatedWan === 'ether2-wan2' ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        <span>{assignedWan ? assignedWan.name.split(' - ')[1] : cat.allocatedWan}</span>
                        {isDown && <span className="text-[10px] text-rose-500">(Down)</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Algoritma: ECMP / PCC Connection Tracking (Linux Conntrack)</span>
            <span className="text-emerald-400">Zero Session Drop During Failover: Aktif</span>
          </div>
        </div>
      </div>
    </div>
  );
};
