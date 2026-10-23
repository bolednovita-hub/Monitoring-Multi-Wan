import React, { useState } from 'react';
import { BarChart3, Pause, Play, PieChart, Activity } from 'lucide-react';
import { WanInterface } from '../types/network';

interface TrafficChartSectionProps {
  wans: WanInterface[];
  isPaused: boolean;
  onTogglePause: () => void;
}

type MetricMode = 'throughput' | 'latency' | 'jitter' | 'packetLoss';

export const TrafficChartSection: React.FC<TrafficChartSectionProps> = ({
  wans,
  isPaused,
  onTogglePause
}) => {
  const [metricMode, setMetricMode] = useState<MetricMode>('throughput');

  const colors: Record<string, { stroke: string; fill: string; name: string }> = {
    'ether1-wan1': { stroke: '#06b6d4', fill: 'rgba(6, 182, 212, 0.15)', name: 'WAN 1 (IndiHome)' },
    'ether2-wan2': { stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.15)', name: 'WAN 2 (Biznet)' },
    'ether3-wan3': { stroke: '#f59e0b', fill: 'rgba(245, 158, 11, 0.15)', name: 'WAN 3 (Orbit 4G)' }
  };

  // Find max value across all histories for the selected metric
  const maxVal = Math.max(
    ...wans.flatMap(w =>
      w.history.map(h => {
        if (metricMode === 'throughput') return h.rxMbps + h.txMbps;
        if (metricMode === 'latency') return h.latencyMs;
        if (metricMode === 'jitter') return h.jitterMs;
        return h.packetLossPct;
      })
    ),
    metricMode === 'throughput' ? 60 : metricMode === 'latency' ? 100 : metricMode === 'jitter' ? 20 : 10
  );

  const chartWidth = 720;
  const chartHeight = 220;
  const paddingLeft = 45;
  const paddingBottom = 25;
  const paddingTop = 15;
  const paddingRight = 15;

  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  // Build SVG path for each WAN
  const generatePath = (wan: WanInterface) => {
    if (!wan.history || wan.history.length < 2) return '';
    const step = innerWidth / (Math.max(wan.history.length - 1, 1));

    const points = wan.history.map((h, i) => {
      const val =
        metricMode === 'throughput'
          ? h.rxMbps
          : metricMode === 'latency'
          ? h.latencyMs
          : metricMode === 'jitter'
          ? h.jitterMs
          : h.packetLossPct;

      const x = paddingLeft + i * step;
      const y = paddingTop + innerHeight - (val / (maxVal || 1)) * innerHeight;
      return `${x},${y}`;
    });

    return points.join(' ');
  };

  // Calculate Traffic Distribution Share (%)
  const totalThroughput = wans.reduce((s, w) => s + w.currentRxMbps, 0);
  const shares = wans.map(w => ({
    id: w.id,
    name: w.name,
    mbps: w.currentRxMbps,
    pct: totalThroughput > 0 ? Math.round((w.currentRxMbps / totalThroughput) * 100) : 0,
    color: colors[w.id].stroke
  }));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
      {/* Chart Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-bold text-white tracking-tight">
            Grafik Kinerja Real-Time Multi-WAN
          </span>
          <span className="text-xs text-slate-500 font-mono hidden md:inline">
            (Interval Sampel: 1 Detik)
          </span>
        </div>

        {/* Metric Selector Tabs & Pause */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-950 p-1 rounded-md border border-slate-800 flex items-center gap-1 text-xs">
            <button
              onClick={() => setMetricMode('throughput')}
              className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
                metricMode === 'throughput'
                  ? 'bg-slate-800 text-cyan-400 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Throughput (Mbps)
            </button>
            <button
              onClick={() => setMetricMode('latency')}
              className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
                metricMode === 'latency'
                  ? 'bg-slate-800 text-cyan-400 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Latensi RTT (ms)
            </button>
            <button
              onClick={() => setMetricMode('jitter')}
              className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
                metricMode === 'jitter'
                  ? 'bg-slate-800 text-cyan-400 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Jitter (ms)
            </button>
            <button
              onClick={() => setMetricMode('packetLoss')}
              className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
                metricMode === 'packetLoss'
                  ? 'bg-slate-800 text-cyan-400 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Packet Loss (%)
            </button>
          </div>

          <button
            onClick={onTogglePause}
            className={`p-1.5 rounded-md border text-xs transition-colors flex items-center gap-1 ${
              isPaused
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title={isPaused ? 'Lanjutkan Stream Data' : 'Jeda Stream Data'}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mt-4">
        {/* Main Multi-Stream SVG Line Chart */}
        <div className="lg:col-span-3 bg-slate-950/70 border border-slate-800/80 rounded-lg p-3">
          <div className="relative w-full aspect-[21/9] sm:aspect-[24/9]">
            <svg
              className="w-full h-full"
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              preserveAspectRatio="none"
            >
              {/* Horizontal Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                const y = paddingTop + innerHeight * (1 - ratio);
                const labelVal = Math.round(maxVal * ratio);
                return (
                  <g key={i}>
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={chartWidth - paddingRight}
                      y2={y}
                      stroke="rgba(51, 65, 85, 0.35)"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={paddingLeft - 8}
                      y={y + 3}
                      fill="#64748b"
                      fontSize="9"
                      textAnchor="end"
                      fontFamily="JetBrains Mono"
                    >
                      {labelVal}
                    </text>
                  </g>
                );
              })}

              {/* Paths for each WAN */}
              {wans.map(wan => {
                const polyPoints = generatePath(wan);
                if (!polyPoints) return null;
                const { stroke } = colors[wan.id];

                return (
                  <polyline
                    key={wan.id}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={wan.status === 'down' ? '1.5' : '2.2'}
                    strokeDasharray={wan.status === 'down' ? '4 4' : 'none'}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={polyPoints}
                  />
                );
              })}
            </svg>
          </div>

          {/* Chart Legend */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/60 mt-1 text-xs">
            <div className="flex items-center gap-4">
              {wans.map(wan => (
                <div key={wan.id} className="flex items-center gap-1.5 font-mono">
                  <span
                    className="w-3 h-1 rounded-sm"
                    style={{ backgroundColor: colors[wan.id].stroke }}
                  />
                  <span className="text-slate-300 font-sans">{wan.name.split(' - ')[1]}</span>
                  <span className="text-slate-500">
                    ({metricMode === 'throughput' ? `${wan.currentRxMbps}M` : metricMode === 'latency' ? `${wan.latencyMs}ms` : metricMode === 'jitter' ? `${wan.jitterMs}ms` : `${wan.packetLossPct}%`})
                  </span>
                </div>
              ))}
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              Satuan: {metricMode === 'throughput' ? 'Megabit per detik (Mbps)' : metricMode === 'latency' ? 'Latensi RTT (ms)' : metricMode === 'jitter' ? 'Variasi Jitter (ms)' : 'Packet Loss (%)'}
            </div>
          </div>
        </div>

        {/* Load Balance Traffic Distribution Panel */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold text-slate-200">Distribusi Beban Trafik (PCC)</span>
              <PieChart className="w-3.5 h-3.5 text-cyan-400" />
            </div>

            <div className="space-y-3 mt-3">
              {shares.map(item => (
                <div key={item.id}>
                  <div className="flex justify-between text-xs mb-1 font-mono">
                    <span className="text-slate-300 font-sans truncate">{item.name.split(' - ')[1]}</span>
                    <span className="text-slate-200">{item.pct}% ({item.mbps}M)</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${item.pct}%`,
                        backgroundColor: item.color
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/60 mt-3 text-[11px] text-slate-400">
            <span className="text-slate-300 font-semibold">Kebijakan Multi-WAN:</span>
            <p className="mt-0.5 text-slate-400 leading-relaxed">
              PCC (Per Connection Classifier) mendistribusikan koneksi proporsional 2:1 ke WAN 1 & WAN 2 dengan failover otomatis ke WAN 3.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
