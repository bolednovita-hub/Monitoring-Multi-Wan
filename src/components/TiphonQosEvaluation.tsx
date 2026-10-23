import React, { useState } from 'react';
import { ShieldCheck, Award, Info, BookOpen, CheckCircle, HelpCircle, Download, FileSpreadsheet, FileJson, ArrowRight } from 'lucide-react';
import { QoSEvaluation, WanInterface } from '../types/network';
import { evaluateQoS } from '../utils/tiphonCalculator';

interface TiphonQosEvaluationProps {
  qos: QoSEvaluation;
  wans: WanInterface[];
  onExportCsv?: () => void;
  onExportJson?: () => void;
}

export const TiphonQosEvaluation: React.FC<TiphonQosEvaluationProps> = ({
  qos,
  wans,
  onExportCsv,
  onExportJson
}) => {
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const getBadgeStyle = (category: string) => {
    switch (category) {
      case 'Sangat Baik':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'Baik':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
      case 'Sedang':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      default:
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
    }
  };

  const handleCsvDownload = () => {
    if (onExportCsv) {
      onExportCsv();
      setDownloadSuccess('Dataset CSV berhasil diunduh untuk lampiran skripsi.');
      setTimeout(() => setDownloadSuccess(null), 3000);
    }
  };

  const handleJsonDownload = () => {
    if (onExportJson) {
      onExportJson();
      setDownloadSuccess('Dokumen Forensik JSON berhasil diunduh.');
      setTimeout(() => setDownloadSuccess(null), 3000);
    }
  };

  // Compile real-time last 10 points
  const historyPoints = (wans[0]?.history || []).slice(-10).reverse();

  return (
    <div className="space-y-4">
      {/* Overview Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-bold text-white tracking-tight">
                Evaluasi Kualitas Layanan (QoS) Berdasarkan Standar TIPHON
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Standarisasi telekomunikasi ETSI TR 101 329 / ITU-T G.1010 untuk penilaian kinerja jaringan Multi-WAN
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className={`px-3 py-1.5 rounded-lg border text-xs font-bold font-mono flex items-center gap-2 ${getBadgeStyle(qos.overallCategory)}`}>
              <Award className="w-4 h-4" />
              <span>Indeks Total: {qos.overallScore} / 4.00 ({qos.overallCategory})</span>
            </div>

            {onExportCsv && (
              <button
                onClick={handleCsvDownload}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 border border-slate-700"
                title="Unduh seluruh dataset telemetri ke format CSV untuk Microsoft Excel / SPSS"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Unduh CSV</span>
              </button>
            )}

            {onExportJson && (
              <button
                onClick={handleJsonDownload}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 border border-slate-700"
                title="Unduh dataset telemetri dan log forensik lengkap dalam format JSON"
              >
                <FileJson className="w-3.5 h-3.5 text-cyan-400" />
                <span>Unduh JSON</span>
              </button>
            )}
          </div>
        </div>

        {downloadSuccess && (
          <div className="mt-3 p-2 bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs rounded flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>{downloadSuccess}</span>
          </div>
        )}

        {/* 4 Parameter Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
          {/* 1. Throughput */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3.5">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Throughput</span>
              <span className="text-[10px] font-mono">Bobot 25%</span>
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {qos.throughput.value} <span className="text-xs font-normal text-slate-400">Mbps</span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">Indeks: <b className="text-white font-mono">{qos.throughput.indexScore}</b></span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${getBadgeStyle(qos.throughput.category)}`}>
                {qos.throughput.category}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1 font-mono">{qos.throughput.thresholdReference}</div>
          </div>

          {/* 2. Delay / Latency */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3.5">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Delay (Latensi)</span>
              <span className="text-[10px] font-mono">Bobot 25%</span>
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {qos.delay.value} <span className="text-xs font-normal text-slate-400">ms</span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">Indeks: <b className="text-white font-mono">{qos.delay.indexScore}</b></span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${getBadgeStyle(qos.delay.category)}`}>
                {qos.delay.category}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1 font-mono">{qos.delay.thresholdReference}</div>
          </div>

          {/* 3. Jitter */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3.5">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Jitter (Variasi RTT)</span>
              <span className="text-[10px] font-mono">Bobot 25%</span>
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {qos.jitter.value} <span className="text-xs font-normal text-slate-400">ms</span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">Indeks: <b className="text-white font-mono">{qos.jitter.indexScore}</b></span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${getBadgeStyle(qos.jitter.category)}`}>
                {qos.jitter.category}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1 font-mono">{qos.jitter.thresholdReference}</div>
          </div>

          {/* 4. Packet Loss */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3.5">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Packet Loss</span>
              <span className="text-[10px] font-mono">Bobot 25%</span>
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {qos.packetLoss.value} <span className="text-xs font-normal text-slate-400">%</span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">Indeks: <b className="text-white font-mono">{qos.packetLoss.indexScore}</b></span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${getBadgeStyle(qos.packetLoss.category)}`}>
                {qos.packetLoss.category}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1 font-mono">{qos.packetLoss.thresholdReference}</div>
          </div>
        </div>
      </div>

      {/* Live Continuous Telemetry Stream Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
          <div>
            <h3 className="text-xs font-bold text-white tracking-tight flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Log Telemetri Real-Time TIPHON (10 Sampel Terakhir)</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Data pencatatan per detik yang terekam secara berkesinambungan untuk keperluan analisis statistik skripsi.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
              Sinkronisasi API: 1000 ms
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 text-[10px]">
                <th className="pb-1.5 font-normal">Waktu Pengambilan</th>
                <th className="pb-1.5 font-normal">Total Throughput</th>
                <th className="pb-1.5 font-normal">WAN 1 Rx</th>
                <th className="pb-1.5 font-normal">WAN 2 Rx</th>
                <th className="pb-1.5 font-normal">WAN 3 Rx</th>
                <th className="pb-1.5 font-normal">Rata-Rata Latensi</th>
                <th className="pb-1.5 font-normal">Jitter</th>
                <th className="pb-1.5 font-normal">Packet Loss</th>
                <th className="pb-1.5 font-normal text-right">Kategori TIPHON</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {historyPoints.map((pt, idx) => {
                const w1 = wans[0]?.history[wans[0].history.length - 1 - idx] || pt;
                const w2 = wans[1]?.history[wans[1].history.length - 1 - idx] || pt;
                const w3 = wans[2]?.history[wans[2].history.length - 1 - idx] || pt;
                const totRx = Number((w1.rxMbps + w2.rxMbps + w3.rxMbps).toFixed(1));
                const ptQos = evaluateQoS(totRx, pt.latencyMs, pt.jitterMs, pt.packetLossPct);

                return (
                  <tr key={pt.timestamp} className="hover:bg-slate-950/40">
                    <td className="py-2 text-slate-400">{pt.timeLabel}</td>
                    <td className="py-2 text-white font-bold">{totRx} Mbps</td>
                    <td className="py-2 text-cyan-400">{w1.rxMbps} M</td>
                    <td className="py-2 text-emerald-400">{w2.rxMbps} M</td>
                    <td className="py-2 text-amber-400">{w3.rxMbps} M</td>
                    <td className="py-2 text-slate-200">{pt.latencyMs} ms</td>
                    <td className="py-2 text-slate-300">{pt.jitterMs} ms</td>
                    <td className="py-2 text-slate-300">{pt.packetLossPct}%</td>
                    <td className="py-2 text-right">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border ${getBadgeStyle(ptQos.overallCategory)}`}>
                        {ptQos.overallCategory}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Standar TIPHON Reference Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Table Reference */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-xs font-semibold text-slate-200">
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <span>Tabel Klasifikasi Indeks Kinerja Standar TIPHON</span>
          </div>

          <div className="mt-3 space-y-2">
            <div className="grid grid-cols-5 text-[10px] text-slate-500 font-mono pb-1 border-b border-slate-800">
              <span>Kategori</span>
              <span>Indeks</span>
              <span>Throughput</span>
              <span>Delay (RTT)</span>
              <span>Packet Loss</span>
            </div>
            <div className="grid grid-cols-5 text-[11px] font-mono py-1 border-b border-slate-800/40 text-emerald-400">
              <span className="font-semibold">Sangat Baik</span>
              <span>4</span>
              <span>&gt; 2.1 M</span>
              <span>&lt; 150 ms</span>
              <span>0% - 0.5%</span>
            </div>
            <div className="grid grid-cols-5 text-[11px] font-mono py-1 border-b border-slate-800/40 text-cyan-400">
              <span className="font-semibold">Baik</span>
              <span>3</span>
              <span>1.2 - 2.1 M</span>
              <span>150-300 ms</span>
              <span>0.6% - 3%</span>
            </div>
            <div className="grid grid-cols-5 text-[11px] font-mono py-1 border-b border-slate-800/40 text-amber-400">
              <span className="font-semibold">Sedang</span>
              <span>2</span>
              <span>0.7 - 1.2 M</span>
              <span>300-450 ms</span>
              <span>4% - 15%</span>
            </div>
            <div className="grid grid-cols-5 text-[11px] font-mono py-1 text-rose-400">
              <span className="font-semibold">Buruk</span>
              <span>1</span>
              <span>&lt; 0.7 M</span>
              <span>&gt; 450 ms</span>
              <span>&gt; 15%</span>
            </div>
          </div>
        </div>

        {/* Formulas & Calculation Rationale */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-xs font-semibold text-slate-200">
            <Info className="w-4 h-4 text-cyan-400" />
            <span>Rumus Matematis Perhitungan QoS Skripsi</span>
          </div>

          <div className="mt-3 space-y-2.5 text-xs text-slate-300 font-mono">
            <div className="bg-slate-950 p-2 rounded border border-slate-800">
              <div className="text-[10px] text-slate-500">1. Rumus Rata-Rata Jitter:</div>
              <div className="text-cyan-300 mt-0.5">J = (1 / (N - 1)) * Σ |D(i) - D(i-1)|</div>
            </div>

            <div className="bg-slate-950 p-2 rounded border border-slate-800">
              <div className="text-[10px] text-slate-500">2. Rumus Packet Loss:</div>
              <div className="text-cyan-300 mt-0.5">Packet Loss (%) = ((Paket Kirim - Paket Terima) / Paket Kirim) * 100%</div>
            </div>

            <div className="bg-slate-950 p-2 rounded border border-slate-800">
              <div className="text-[10px] text-slate-500">3. Indeks Kinerja Kumulatif (Mean Opinion Score):</div>
              <div className="text-cyan-300 mt-0.5">Indeks = (I_Throughput + I_Delay + I_Jitter + I_PacketLoss) / 4</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
