import React from 'react';
import { ArrowDownRight, ArrowUpRight, Cpu, Radio, ShieldCheck, Zap, Activity, Gauge } from 'lucide-react';
import { QoSEvaluation, RouterResource } from '../types/network';

interface KpiOverviewProps {
  totalRx: number;
  totalTx: number;
  totalBandwidth: number;
  activeCount: number;
  standbyCount: number;
  downCount: number;
  avgLatency: number;
  avgJitter: number;
  avgLoss: number;
  router: RouterResource;
  qos: QoSEvaluation;
  overallHealthScore?: number;
  overallMosScore?: number;
  failoverSwitchSpeedMs?: number;
}

export const KpiOverview: React.FC<KpiOverviewProps> = ({
  totalRx,
  totalTx,
  totalBandwidth,
  activeCount,
  standbyCount,
  downCount,
  avgLatency,
  avgJitter,
  avgLoss,
  router,
  qos,
  overallHealthScore = 96,
  overallMosScore = 4.35,
  failoverSwitchSpeedMs = 420
}) => {
  const getQosColor = (cat: string) => {
    switch (cat) {
      case 'Sangat Baik':
        return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
      case 'Baik':
        return 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10';
      case 'Sedang':
        return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
      default:
        return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
    }
  };

  return (
    <div className="space-y-2.5">
      {/* Primary KPI 6-Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Total Aggregated Bandwidth */}
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-lg shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Agregat Throughput</span>
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white tracking-tight">
            {totalBandwidth} <span className="text-xs font-normal text-slate-400">Mbps</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 mt-1">
            <span className="flex items-center text-emerald-400">
              <ArrowDownRight className="w-3 h-3 mr-0.5" />
              {totalRx}M
            </span>
            <span>·</span>
            <span className="flex items-center text-cyan-400">
              <ArrowUpRight className="w-3 h-3 mr-0.5" />
              {totalTx}M
            </span>
          </div>
        </div>

        {/* 2. WAN Status Distribution & Failover Switch Speed */}
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-lg shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Status Tautan WAN</span>
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white tracking-tight flex items-baseline gap-1.5">
            <span className="text-emerald-400">{activeCount}</span>
            <span className="text-xs text-slate-500">/ 3 Aktif</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span className="text-slate-300 font-mono">{standbyCount} Siaga</span>
            <span className="text-[10px] text-indigo-400 font-mono bg-indigo-950/60 px-1 rounded border border-indigo-800/40">
              {failoverSwitchSpeedMs}ms sw
            </span>
          </div>
        </div>

        {/* 3. Latency, Jitter & VoIP MOS */}
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-lg shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Rata-Rata Latensi</span>
            <span className="text-[10px] text-slate-400 font-mono">RTT</span>
          </div>
          <div className="text-xl font-bold font-mono text-white tracking-tight">
            {avgLatency} <span className="text-xs font-normal text-slate-400">ms</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-1 flex items-center justify-between">
            <span>Jitter: <strong className="text-slate-200">{avgJitter}ms</strong></span>
            <span className="text-emerald-400 font-bold" title="Mean Opinion Score (ITU-T G.107)">
              MOS {overallMosScore}
            </span>
          </div>
        </div>

        {/* 4. Packet Loss & Link Health */}
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-lg shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Packet Loss & Health</span>
            <Gauge className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <div className={`text-xl font-bold font-mono tracking-tight ${avgLoss > 3 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {avgLoss} <span className="text-xs font-normal text-slate-400">%</span>
            </div>
            <div className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
              overallHealthScore >= 90 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
              overallHealthScore >= 70 ? 'bg-amber-950 text-amber-400 border border-amber-800' :
              'bg-rose-950 text-rose-400 border border-rose-800'
            }`}>
              {overallHealthScore}%
            </div>
          </div>
          <div className="text-[10px] text-slate-400 mt-1 truncate">
            {overallHealthScore >= 90 ? 'Kualitas Link Prima' : overallHealthScore >= 70 ? 'Kualitas Terdegradasi' : 'Peringatan Gangguan'}
          </div>
        </div>

        {/* 5. Router Hardware & CPU */}
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-lg shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>CPU RouterOS</span>
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white tracking-tight flex items-baseline gap-1">
            <span>{router.cpuLoadPct}%</span>
            <span className="text-xs font-normal text-slate-400 font-sans">({router.boardTempC}°C)</span>
          </div>
          <div className="text-[11px] text-slate-400 truncate mt-1">
            Free RAM: <span className="font-mono text-slate-200">{router.freeMemoryMb} MB</span>
          </div>
        </div>

        {/* 6. TIPHON Overall QoS Evaluation */}
        <div className={`border p-3.5 rounded-lg shadow-sm ${getQosColor(qos.overallCategory)}`}>
          <div className="flex items-center justify-between text-xs opacity-90 mb-1">
            <span>Indeks TIPHON</span>
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-bold font-mono tracking-tight">
            {qos.overallScore} <span className="text-xs font-normal opacity-80">/ 4.00</span>
          </div>
          <div className="text-[11px] font-semibold mt-1 truncate flex items-center justify-between">
            <span>{qos.overallCategory}</span>
            <span className="text-[10px] opacity-75 font-mono">ETSI</span>
          </div>
        </div>
      </div>
    </div>
  );
};
