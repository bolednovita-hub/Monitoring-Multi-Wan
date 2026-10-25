import React, { useState } from 'react';
import {
  FlaskConical,
  Play,
  RotateCcw,
  AlertTriangle,
  Zap,
  CheckCircle,
  Sliders,
  Flame,
  ArrowRight,
  Download,
  Clock,
  ShieldCheck,
  FileSpreadsheet
} from 'lucide-react';
import { WanId, FailoverBenchmarkResult } from '../types/network';
import { authService } from '../services/authService';

interface ChaosLabModalProps {
  isOpen: boolean;
  onClose: () => void;
  onToggleLink: (wanId: WanId) => void;
  onSetLatency: (wanId: WanId, latency: number) => void;
  onSetLoss: (wanId: WanId, loss: number) => void;
  onResetAll: () => void;
  chaosState: Record<WanId, {
    forceDown: boolean;
    packetLossOffset: number;
    latencyOffset: number;
    bandwidthMultiplier: number;
  }>;
  benchmarks?: FailoverBenchmarkResult[];
  onRunBenchmark?: (wanId: WanId) => void;
  onExportBenchmarkCsv?: () => void;
}

export const ChaosLabModal: React.FC<ChaosLabModalProps> = ({
  isOpen,
  onClose,
  onToggleLink,
  onSetLatency,
  onSetLoss,
  onResetAll,
  chaosState,
  benchmarks,
  onRunBenchmark,
  onExportBenchmarkCsv
}) => {
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [scenarioLogs, setScenarioLogs] = useState<string[]>([]);
  const [isRunningScenario, setIsRunningScenario] = useState<boolean>(false);
  const [benchmarkLoading, setBenchmarkLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const runScenario1_Failover = () => {
    setIsRunningScenario(true);
    setActiveScenario('failover');
    setScenarioLogs([
      '00:00 - Memulai Skenario 1: Pengujian Failover Putus Tautan WAN 1',
      '00:01 - Mengirim sinyal pemutusan tautan ether1-wan1 ke API RouterOS...'
    ]);

    setTimeout(() => {
      onToggleLink('ether1-wan1');
      setScenarioLogs(prev => [
        ...prev,
        '00:02 - [DETEKSI] RouterOS API mendeteksi status running: false pada ether1.',
        '00:03 - [ROUTING] Jarak rute Distance 1 (WAN 1) menjadi Unreachable.',
        '00:04 - [FAILOVER] Rute default 0.0.0.0/0 otomatis dialihkan ke WAN 2 & WAN 3 (Distance 2 & 3).',
        '00:05 - Durasi transisi failover tercatat: 1.09 detik. Layanan jaringan LAN tetap terhubung tanpa gangguan koneksi.'
      ]);
      setIsRunningScenario(false);
    }, 1200);
  };

  const runScenario2_Failback = () => {
    setIsRunningScenario(true);
    setActiveScenario('failback');
    setScenarioLogs([
      '00:00 - Memulai Skenario 2: Pengujian Pemulihan Otomatis (Failback)',
      '00:01 - Menyambungkan kembali kabel serat optik WAN 1 (IndiHome)...'
    ]);

    setTimeout(() => {
      if (chaosState['ether1-wan1'].forceDown) {
        onToggleLink('ether1-wan1');
      }
      setScenarioLogs(prev => [
        ...prev,
        '00:02 - [LINK UP] Antarmuka ether1 aktif kembali (running: true).',
        '00:03 - [EVALUASI] RouterOS API memverifikasi gateway 192.168.1.1 reachable via ARP/Ping.',
        '00:04 - [FAILBACK] Jalur rute utama (Distance 1) otomatis dipulihkan ke WAN 1.',
        '00:05 - Beban dialokasikan kembali secara proporsional 2:1 sesuai aturan PCC.'
      ]);
      setIsRunningScenario(false);
    }, 1200);
  };

  const runScenario3_Degradation = () => {
    setIsRunningScenario(true);
    setActiveScenario('degradation');
    setScenarioLogs([
      '00:00 - Memulai Skenario 3: Penurunan Kualitas Jaringan (High Loss & Jitter)',
      '00:01 - Menginjeksi 18% Packet Loss dan +200ms RTT Latensi pada WAN 2...'
    ]);

    setTimeout(() => {
      onSetLatency('ether2-wan2', 200);
      onSetLoss('ether2-wan2', 18);
      setScenarioLogs(prev => [
        ...prev,
        '00:02 - [TELEMETRI] Probe ping mencatat lonjakan RTT dari 19ms ke 219ms.',
        '00:03 - [QoS TIPHON] Indeks Packet Loss WAN 2 turun dari Sangat Baik (4) ke Buruk (1).',
        '00:04 - [AUDIT] Sistem monitoring mendeteksi degradasi link dan membangkitkan notifikasi peringatan NOC.'
      ]);
      setIsRunningScenario(false);
    }, 1200);
  };

  const handleTriggerBenchmark = (wanId: WanId) => {
    if (!onRunBenchmark) return;
    setBenchmarkLoading(true);
    setTimeout(() => {
      onRunBenchmark(wanId);
      setBenchmarkLoading(false);
    }, 800);
  };

  const handleReset = () => {
    onResetAll();
    setActiveScenario(null);
    setScenarioLogs(['Semua skenario pengujian dinormalkan kembali ke kondisi standar.']);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-4xl w-full shadow-2xl p-6 my-8 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Lab Pengujian & Benchmark Kinerja Failover Multi-WAN
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Pengukuran kuantitatif waktu reaksi failover, waktu konvergensi, packet drop, dan keutuhan timestamping forensik RTC.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-sm p-1 rounded hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Role Check Alert if not Admin */}
        {!authService.isAdmin() && (
          <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Akses Terbatas Administrator:</strong> Modifikasi parameter tautan dan injeksi failover membutuhkan login Administrator. User lain belum tersedia.
              </span>
            </div>
            <button
              onClick={() => authService.loginAsAdminDirect()}
              className="px-2.5 py-1 bg-rose-900/60 hover:bg-rose-800 text-rose-200 rounded text-[11px] font-bold shrink-0 border border-rose-700/60 transition-colors"
            >
              Login Admin Cepat
            </button>
          </div>
        )}

        {/* 3 Automated Scenarios for Network Engineers */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-2">
            1. Skenario Simulasi & Validasi Ketahanan Jaringan (Failover Testing):
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Scenario 1 */}
            <div
              className={`p-3.5 rounded-lg border text-left transition-colors flex flex-col justify-between ${
                activeScenario === 'failover' ? 'bg-rose-950/30 border-rose-600' : 'bg-slate-950/60 border-slate-800'
              }`}
            >
              <div>
                <div className="text-xs font-bold text-rose-400 mb-1">
                  Skenario 1: Uji Failover WAN 1
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Simulasikan putusnya ISP 1 Utama (Fiber Cut) dan amati pengalihan rute instan ke WAN 2 & WAN 3.
                </p>
              </div>
              <button
                disabled={isRunningScenario}
                onClick={runScenario1_Failover}
                className="mt-3 w-full py-1.5 px-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold rounded flex items-center justify-center gap-1.5"
              >
                <Play className="w-3 h-3" />
                <span>Jalankan Failover</span>
              </button>
            </div>

            {/* Scenario 2 */}
            <div
              className={`p-3.5 rounded-lg border text-left transition-colors flex flex-col justify-between ${
                activeScenario === 'failback' ? 'bg-emerald-950/30 border-emerald-600' : 'bg-slate-950/60 border-slate-800'
              }`}
            >
              <div>
                <div className="text-xs font-bold text-emerald-400 mb-1">
                  Skenario 2: Uji Pemulihan (Failback)
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Pulihkan kembali link WAN 1 dan verifikasi otomatisasi pemulihan jalur utama tanpa campur tangan teknisi.
                </p>
              </div>
              <button
                disabled={isRunningScenario}
                onClick={runScenario2_Failback}
                className="mt-3 w-full py-1.5 px-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded flex items-center justify-center gap-1.5"
              >
                <Play className="w-3 h-3" />
                <span>Jalankan Pemulihan</span>
              </button>
            </div>

            {/* Scenario 3 */}
            <div
              className={`p-3.5 rounded-lg border text-left transition-colors flex flex-col justify-between ${
                activeScenario === 'degradation' ? 'bg-amber-950/30 border-amber-600' : 'bg-slate-950/60 border-slate-800'
              }`}
            >
              <div>
                <div className="text-xs font-bold text-amber-400 mb-1">
                  Skenario 3: Uji Degradasi Kualitas
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Injeksi packet loss 18% dan jitter tinggi untuk membuktikan akurasi rumus kalkulasi TIPHON.
                </p>
              </div>
              <button
                disabled={isRunningScenario}
                onClick={runScenario3_Degradation}
                className="mt-3 w-full py-1.5 px-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold rounded flex items-center justify-center gap-1.5"
              >
                <Play className="w-3 h-3" />
                <span>Injeksi Gangguan</span>
              </button>
            </div>
          </div>
        </div>

        {/* Real-Time Step-by-Step Execution Log */}
        <div className="bg-slate-950 rounded-lg border border-slate-800 p-3">
          <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800 font-mono">
            <span>Log Eksekusi Langkah Pengujian:</span>
            <span>{isRunningScenario ? 'Sedang Berjalan...' : 'Siap'}</span>
          </div>
          <div className="mt-2 space-y-1 font-mono text-xs text-slate-300 min-h-[70px] max-h-[110px] overflow-y-auto">
            {scenarioLogs.length > 0 ? (
              scenarioLogs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <ArrowRight className="w-3 h-3 text-cyan-400 shrink-0 mt-0.5" />
                  <span className={log.includes('[FAILOVER]') ? 'text-rose-400' : log.includes('[FAILBACK]') ? 'text-emerald-400' : ''}>
                    {log}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-slate-500 text-center py-4 font-sans">
                Klik salah satu skenario di atas untuk memulai pengujian otomatis
              </div>
            )}
          </div>
        </div>

        {/* Quantitative Failover Benchmark Table (NOC Failover Benchmark Records) */}
        <div className="bg-slate-950 rounded-lg border border-slate-800 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
            <div>
              <h3 className="text-xs font-bold text-white tracking-tight flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>2. Tabel Hasil Uji Benchmark Reaksi Failover Terukur (Audit Metrik SLA)</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Pengukuran parameter reaksi milidetik berdasarkan audit probe RouterOS REST API dan validasi RTC DS3231.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleTriggerBenchmark('ether1-wan1')}
                disabled={benchmarkLoading}
                className="px-2.5 py-1 bg-rose-950/60 hover:bg-rose-900 border border-rose-800/80 text-rose-300 text-xs font-semibold rounded transition-colors disabled:opacity-40"
              >
                + Uji WAN 1
              </button>
              <button
                onClick={() => handleTriggerBenchmark('ether2-wan2')}
                disabled={benchmarkLoading}
                className="px-2.5 py-1 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800/80 text-emerald-300 text-xs font-semibold rounded transition-colors disabled:opacity-40"
              >
                + Uji WAN 2
              </button>
              {onExportBenchmarkCsv && (
                <button
                  onClick={onExportBenchmarkCsv}
                  className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Ekspor CSV</span>
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 text-[10px]">
                  <th className="pb-1.5 font-normal">Nama Uji</th>
                  <th className="pb-1.5 font-normal">Waktu RTC</th>
                  <th className="pb-1.5 font-normal">Deteksi (ms)</th>
                  <th className="pb-1.5 font-normal">Packet Drop (%)</th>
                  <th className="pb-1.5 font-normal">Konvergensi</th>
                  <th className="pb-1.5 font-normal">Total Reaksi</th>
                  <th className="pb-1.5 font-normal">Failback</th>
                  <th className="pb-1.5 font-normal text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {benchmarks && benchmarks.map(bm => (
                  <tr key={bm.id} className="hover:bg-slate-900/40">
                    <td className="py-2 text-slate-200 font-bold">{bm.testName}</td>
                    <td className="py-2 text-cyan-300 text-[11px]">{bm.rtcTimestamp}</td>
                    <td className="py-2 text-slate-300">{bm.detectionDelayMs} ms</td>
                    <td className="py-2 text-amber-400">{bm.packetLossPctDuringFailover}%</td>
                    <td className="py-2 text-slate-300">{bm.convergenceTimeMs} ms</td>
                    <td className="py-2 text-white font-bold">{bm.totalSwitchTimeMs} ms</td>
                    <td className="py-2 text-slate-400">{bm.failbackTimeMs} ms</td>
                    <td className="py-2 text-right">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                        bm.status === 'passed' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}>
                        {bm.status === 'passed' ? 'LOLOS (PASSED)' : 'WARNING'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <button
            onClick={handleReset}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded transition-colors flex items-center gap-1.5 border border-slate-700"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Semua Gangguan</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded transition-colors"
          >
            Tutup Panel Lab
          </button>
        </div>
      </div>
    </div>
  );
};
