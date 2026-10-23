import React from 'react';
import {
  ArrowDown,
  ArrowUp,
  Globe,
  Radio,
  Server,
  AlertTriangle,
  Power,
  SlidersHorizontal,
  Flame,
  CheckCircle2,
  XCircle,
  Clock,
  Gauge,
  Target,
  Activity,
  Layers
} from 'lucide-react';
import { WanId, WanInterface } from '../types/network';

interface WanCardGridProps {
  wans: WanInterface[];
  onToggleLink: (wanId: WanId) => void;
  onSetLatency: (wanId: WanId, latency: number) => void;
  onSetLoss: (wanId: WanId, loss: number) => void;
  chaosState: Record<WanId, {
    forceDown: boolean;
    packetLossOffset: number;
    latencyOffset: number;
    bandwidthMultiplier: number;
  }>;
}

export const WanCardGrid: React.FC<WanCardGridProps> = ({
  wans,
  onToggleLink,
  onSetLatency,
  onSetLoss,
  chaosState
}) => {
  // Render clean SVG sparkline from history
  const renderSparkline = (history: { rxMbps: number }[], color: string) => {
    if (!history || history.length < 2) return null;
    const maxVal = Math.max(...history.map(h => h.rxMbps), 10);
    const width = 160;
    const height = 36;
    const step = width / (history.length - 1);

    const points = history
      .map((h, i) => {
        const x = i * step;
        const y = height - (h.rxMbps / maxVal) * (height - 6) - 3;
        return `${x},${y}`;
      })
      .join(' ');

    return (
      <svg className="w-full h-9 overflow-visible" viewBox={`0 0 ${width} ${height}`}>
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    );
  };

  const getMosLabel = (mos: number) => {
    if (mos >= 4.3) return { text: 'HD / Prima', color: 'text-emerald-400 bg-emerald-950/70 border-emerald-800/80' };
    if (mos >= 4.0) return { text: 'Bagus (Good)', color: 'text-cyan-400 bg-cyan-950/70 border-cyan-800/80' };
    if (mos >= 3.6) return { text: 'Cukup (Fair)', color: 'text-amber-400 bg-amber-950/70 border-amber-800/80' };
    return { text: 'Buruk (Poor)', color: 'text-rose-400 bg-rose-950/70 border-rose-800/80' };
  };

  const getBufferbloatColor = (grade: string) => {
    switch (grade) {
      case 'A+':
      case 'A':
        return 'text-emerald-400 bg-emerald-950/80 border-emerald-800';
      case 'B':
        return 'text-cyan-400 bg-cyan-950/80 border-cyan-800';
      case 'C':
        return 'text-amber-400 bg-amber-950/80 border-amber-800';
      default:
        return 'text-rose-400 bg-rose-950/80 border-rose-800';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {wans.map(wan => {
        const isDown = wan.status === 'down';
        const isStandby = wan.status === 'standby';
        const chaos = chaosState[wan.id];
        const sparkColor = isDown ? '#f43f5e' : wan.id === 'ether1-wan1' ? '#06b6d4' : wan.id === 'ether2-wan2' ? '#10b981' : '#f59e0b';
        const mosInfo = getMosLabel(wan.mosScore || 4.2);

        return (
          <div
            key={wan.id}
            className={`border rounded-lg p-4 transition-all flex flex-col justify-between ${
              isDown
                ? 'bg-rose-950/20 border-rose-800/60 shadow-inner'
                : isStandby
                ? 'bg-slate-900 border-slate-800 opacity-90'
                : 'bg-slate-900 border-slate-700/80 hover:border-slate-600 shadow-sm'
            }`}
          >
            <div>
              {/* Header: Name, Interface ID & Status */}
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white tracking-tight">
                      {wan.name}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                      {wan.interfaceName}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{wan.isp}</div>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {isDown ? (
                    <span className="text-xs font-semibold text-rose-400 flex items-center gap-1 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/60">
                      <XCircle className="w-3.5 h-3.5" />
                      Down
                    </span>
                  ) : isStandby ? (
                    <span className="text-xs font-medium text-slate-400 flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      Standby
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Aktif
                    </span>
                  )}
                </div>
              </div>

              {/* Advanced SLA Strip: Health Score, MOS & Bufferbloat Grade */}
              <div className="mt-2.5 grid grid-cols-3 gap-1.5 text-[11px] font-mono">
                <div className="bg-slate-950/80 border border-slate-800/80 rounded p-1.5 flex flex-col items-center">
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider font-sans">Kesehatan Link</span>
                  <span className={`text-xs font-bold mt-0.5 ${
                    isDown ? 'text-rose-500' :
                    (wan.healthScore || 90) >= 90 ? 'text-emerald-400' :
                    (wan.healthScore || 90) >= 70 ? 'text-amber-400' : 'text-rose-400'
                  }`}>
                    {isDown ? '0%' : `${wan.healthScore || 98}%`}
                  </span>
                </div>

                <div className="bg-slate-950/80 border border-slate-800/80 rounded p-1.5 flex flex-col items-center">
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider font-sans">VoIP MOS</span>
                  <span className={`text-xs font-bold mt-0.5 ${isDown ? 'text-rose-500' : 'text-emerald-400'}`}>
                    {isDown ? '1.00' : `${(wan.mosScore || 4.3).toFixed(2)}`}
                  </span>
                </div>

                <div className="bg-slate-950/80 border border-slate-800/80 rounded p-1.5 flex flex-col items-center">
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider font-sans">Bufferbloat</span>
                  <span className={`text-[10px] font-bold px-1.5 rounded border mt-0.5 ${getBufferbloatColor(wan.bufferbloatGrade || 'A')}`}>
                    Grade {wan.bufferbloatGrade || 'A'}
                  </span>
                </div>
              </div>

              {/* Throughput & Bandwidth Meter */}
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1 mb-0.5">
                    <ArrowDown className="w-3 h-3 text-emerald-400" />
                    <span>Download (Rx)</span>
                  </div>
                  <div className="text-lg font-bold font-mono text-white">
                    {wan.currentRxMbps} <span className="text-xs font-normal text-slate-400">Mbps</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Puncak: {wan.peakRxMbps}M / {wan.maxBandwidthMbps}M
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1 mb-0.5">
                    <ArrowUp className="w-3 h-3 text-cyan-400" />
                    <span>Upload (Tx)</span>
                  </div>
                  <div className="text-lg font-bold font-mono text-white">
                    {wan.currentTxMbps} <span className="text-xs font-normal text-slate-400">Mbps</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Puncak: {wan.peakTxMbps}M
                  </div>
                </div>
              </div>

              {/* Sparkline Visual */}
              <div className="mt-2 pt-2 border-t border-slate-800/60">
                <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                  <span>Tren Real-Time (30 Detik)</span>
                  <span className="font-mono">Kapasitas {wan.maxBandwidthMbps} Mbps</span>
                </div>
                <div className="bg-slate-950/60 rounded p-1 border border-slate-800/40">
                  {renderSparkline(wan.history, sparkColor)}
                </div>
              </div>

              {/* Telemetry Metrics: Latency, Jitter, Packet Loss */}
              <div className="mt-3 grid grid-cols-3 gap-2 py-2 border-y border-slate-800/80 text-center">
                <div>
                  <div className="text-[10px] text-slate-400">Latensi RTT</div>
                  <div className={`text-xs font-bold font-mono mt-0.5 ${wan.latencyMs > 150 ? 'text-amber-400' : 'text-slate-200'}`}>
                    {isDown ? '-' : `${wan.latencyMs} ms`}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Jitter</div>
                  <div className="text-xs font-bold font-mono mt-0.5 text-slate-200">
                    {isDown ? '-' : `${wan.jitterMs} ms`}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Packet Loss</div>
                  <div className={`text-xs font-bold font-mono mt-0.5 ${wan.packetLossPct > 3 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {isDown ? '100%' : `${wan.packetLossPct}%`}
                  </div>
                </div>
              </div>

              {/* Multi-Target ICMP Ping Breakdown (Google, Cloudflare, OpenDNS) */}
              <div className="mt-2.5 bg-slate-950/80 rounded border border-slate-800/80 p-2 space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold mb-1">
                  <span className="flex items-center gap-1 text-slate-300">
                    <Target className="w-3 h-3 text-cyan-400" />
                    Probe Multi-Target ICMP
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">DNS Upstream</span>
                </div>
                {wan.targetProbes && wan.targetProbes.map((probe) => (
                  <div key={probe.target} className="flex items-center justify-between text-[10px] font-mono text-slate-300">
                    <span className="text-slate-400 truncate">{probe.name} ({probe.target})</span>
                    <span className={probe.status === 'down' ? 'text-rose-500 font-bold' : probe.latencyMs > 100 ? 'text-amber-400' : 'text-emerald-400'}>
                      {probe.status === 'down' ? 'DOWN' : `${probe.latencyMs}ms`}
                    </span>
                  </div>
                ))}
              </div>

              {/* Routing & Network Specs + Drop counter */}
              <div className="mt-2.5 text-[11px] text-slate-400 space-y-1 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">IP Gerbang & MTU:</span>
                  <span className="text-slate-300">{wan.gateway} · MTU {wan.mtu || 1500}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Bobot PCC / Distance:</span>
                  <span className="text-cyan-400">PCC {wan.pccWeight} / Dist {wan.distance}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">Packet Drop Counter:</span>
                  <span className={(wan.droppedPackets?.rx || 0) > 50 ? 'text-rose-400' : 'text-slate-400'}>
                    Rx: {wan.droppedPackets?.rx || 0} drops · Tx: {wan.droppedPackets?.tx || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive Chaos & Failover Simulator Buttons */}
            <div className="mt-3.5 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
              <button
                onClick={() => onToggleLink(wan.id)}
                className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                  isDown
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-rose-900/40 hover:bg-rose-900/70 border border-rose-800 text-rose-300'
                }`}
                title="Simulasikan kabel putus / link down untuk menguji respon failover"
              >
                <Power className="w-3.5 h-3.5" />
                <span>{isDown ? 'Hubungkan Kembali' : 'Simulasi Putus Link'}</span>
              </button>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => onSetLatency(wan.id, chaos.latencyOffset > 0 ? 0 : 180)}
                  className={`p-1.5 rounded text-xs border transition-colors ${
                    chaos.latencyOffset > 0
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                  title={chaos.latencyOffset > 0 ? 'Normal Latensi' : 'Injeksi Latensi +180ms'}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => onSetLoss(wan.id, chaos.packetLossOffset > 0 ? 0 : 12)}
                  className={`p-1.5 rounded text-xs border transition-colors ${
                    chaos.packetLossOffset > 0
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                  title={chaos.packetLossOffset > 0 ? 'Normal Loss' : 'Injeksi 12% Packet Loss'}
                >
                  <Flame className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
