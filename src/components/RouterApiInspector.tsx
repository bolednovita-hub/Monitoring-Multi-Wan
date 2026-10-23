import React, { useState } from 'react';
import {
  Cpu,
  Send,
  Code2,
  Settings,
  CheckCircle2,
  Clock,
  ArrowRight,
  Shield,
  Key,
  Globe,
  Terminal,
  Copy,
  Check
} from 'lucide-react';
import { RouterApiConfig, RouterApiLog } from '../types/network';

interface RouterApiInspectorProps {
  apiConfig: RouterApiConfig;
  apiLogs: RouterApiLog[];
  onUpdateConfig: (cfg: Partial<RouterApiConfig>) => void;
  onExecuteTest: (endpoint: string) => { status: number; duration: number; response: string };
}

export const RouterApiInspector: React.FC<RouterApiInspectorProps> = ({
  apiConfig,
  apiLogs,
  onUpdateConfig,
  onExecuteTest
}) => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('/rest/interface/monitor-traffic');
  const [lastResponse, setLastResponse] = useState<string | null>(null);
  const [lastStatus, setLastStatus] = useState<number | null>(null);
  const [lastDuration, setLastDuration] = useState<number | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);

  // Form state for config
  const [cfgForm, setCfgForm] = useState({
    endpointUrl: apiConfig.endpointUrl,
    username: apiConfig.username,
    token: 'admin123'
  });

  const availableEndpoints = [
    {
      path: '/rest/interface/monitor-traffic',
      method: 'POST',
      desc: 'Mengambil throughput real-time (rx/tx bits-per-second, fp-rx/tx) per antarmuka WAN',
      category: 'Kinerja Bandwidth'
    },
    {
      path: '/rest/interface',
      method: 'GET',
      desc: 'Membaca status fisik antarmuka, MTU, running state, dan properti link',
      category: 'Status Interface'
    },
    {
      path: '/rest/ip/route',
      method: 'GET',
      desc: 'Membaca tabel routing aktif, gateway target, routing-mark PCC, dan distance failover',
      category: 'Routing & Failover'
    },
    {
      path: '/rest/system/resource',
      method: 'GET',
      desc: 'Memantau beban CPU, sisa memori RAM, suhu board, dan uptime RouterOS',
      category: 'Kesehatan Router'
    },
    {
      path: '/rest/tool/ping',
      method: 'POST',
      desc: 'Melakukan ICMP ping probe ke gateway ISP untuk kalkulasi RTT, jitter, dan packet loss',
      category: 'Pengujian QoS'
    }
  ];

  const handleSendRequest = () => {
    const res = onExecuteTest(selectedEndpoint);
    setLastStatus(res.status);
    setLastDuration(res.duration);
    setLastResponse(res.response);
  };

  const handleCopyResponse = () => {
    if (!lastResponse) return;
    navigator.clipboard.writeText(lastResponse);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSaveConfig = () => {
    onUpdateConfig({
      endpointUrl: cfgForm.endpointUrl,
      username: cfgForm.username,
      isConnected: true,
      lastSyncTimestamp: Date.now()
    });
    setShowConfigModal(false);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner: Router API Architecture */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-cyan-400" />
              <h2 className="text-base font-bold text-white tracking-tight">
                Integrasi MikroTik RouterOS v7 REST API
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Konsol inspeksi interaktif untuk menguji query data telemetri Multi-WAN melalui protokol HTTP/REST API resmi RouterOS
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">
              Mode: <span className="text-cyan-400 font-semibold">{apiConfig.mode === 'simulator' ? 'Simulasi Presisi MikroTik v7' : 'Koneksi Router Fisik'}</span>
            </span>
            <button
              onClick={() => setShowConfigModal(true)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-md transition-colors flex items-center gap-1.5 border border-slate-700"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Konfigurasi Router</span>
            </button>
          </div>
        </div>

        {/* API Test Request Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4">
          {/* Endpoint List Selector */}
          <div className="lg:col-span-5 space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">
              Pilih Endpoint REST API Router:
            </label>
            <div className="space-y-1.5">
              {availableEndpoints.map(ep => (
                <div
                  key={ep.path}
                  onClick={() => {
                    setSelectedEndpoint(ep.path);
                    setLastResponse(null);
                  }}
                  className={`p-2.5 rounded-lg border text-left cursor-pointer transition-colors ${
                    selectedEndpoint === ep.path
                      ? 'bg-slate-800 border-cyan-500/60 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-cyan-400">
                      {ep.method} {ep.path}
                    </span>
                    <span className="text-[10px] text-slate-400">{ep.category}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-1">{ep.desc}</p>
                </div>
              ))}
            </div>

            <button
              onClick={handleSendRequest}
              className="w-full mt-3 py-2 px-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Kirim Request API Sekarang</span>
            </button>
          </div>

          {/* Request Details & Response Inspector */}
          <div className="lg:col-span-7 bg-slate-950/80 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between">
            <div>
              {/* Header Info */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 text-xs">
                <div className="flex items-center gap-2 font-mono text-slate-300">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Request Inspector</span>
                </div>
                {lastStatus !== null && (
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-emerald-400 font-bold">Status: {lastStatus} OK</span>
                    <span>·</span>
                    <span className="text-slate-400">Durasi: {lastDuration} ms</span>
                  </div>
                )}
              </div>

              {/* Endpoint URL & Auth Details */}
              <div className="mt-2.5 space-y-1 font-mono text-xs text-slate-400">
                <div className="flex items-center gap-2 bg-slate-900/80 p-2 rounded border border-slate-800 text-[11px] break-all">
                  <span className="text-cyan-400 font-bold">URL:</span>
                  <span className="text-slate-200">{apiConfig.endpointUrl}{selectedEndpoint}</span>
                </div>
                <div className="text-[11px] text-slate-500 px-1">
                  Header: Authorization: Basic [Base64: admin] · Content-Type: application/json
                </div>
              </div>

              {/* JSON Response Preview */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>Payload Response JSON:</span>
                  {lastResponse && (
                    <button
                      onClick={handleCopyResponse}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                    >
                      {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{isCopied ? 'Tersalin' : 'Salin JSON'}</span>
                    </button>
                  )}
                </div>

                <div className="bg-slate-900/90 border border-slate-800 rounded-md p-3 h-64 overflow-y-auto text-xs font-mono text-slate-300">
                  {lastResponse ? (
                    <pre className="text-cyan-300 whitespace-pre-wrap">{lastResponse}</pre>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center py-8">
                      <Code2 className="w-8 h-8 mb-2 opacity-50" />
                      <p>Klik tombol "Kirim Request API Sekarang" untuk memicu pemanggilan REST API ke RouterOS</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-800/60 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Autentikasi: HTTP Basic Auth (Port 443 / 80)</span>
              <span className="font-mono text-emerald-400">REST API v7 Native</span>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Log Table of Recent API Calls */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              Log Riwayat Pemanggilan API (Audit Trail)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Catatan telemetri request dari sistem monitoring ke RouterOS
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">{apiLogs.length} Entri Tercatat</span>
        </div>

        <div className="overflow-x-auto mt-3">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                <th className="pb-2 font-normal">Waktu</th>
                <th className="pb-2 font-normal">Metode</th>
                <th className="pb-2 font-normal">Endpoint</th>
                <th className="pb-2 font-normal">Status HTTP</th>
                <th className="pb-2 font-normal">Durasi Respon</th>
                <th className="pb-2 font-normal text-right">Ukuran Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {apiLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-800/40">
                  <td className="py-2 text-slate-400">{log.timestamp}</td>
                  <td className="py-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      log.method === 'POST' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-cyan-500/20 text-cyan-300'
                    }`}>
                      {log.method}
                    </span>
                  </td>
                  <td className="py-2 text-slate-200">{log.endpoint}</td>
                  <td className="py-2">
                    <span className="text-emerald-400">{log.statusCode} OK</span>
                  </td>
                  <td className="py-2 text-slate-300">{log.durationMs} ms</td>
                  <td className="py-2 text-right text-slate-400">
                    {Math.round(log.responsePayload.length / 1024 * 10) / 10} KB
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Router Connection Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Konfigurasi Koneksi RouterOS API</h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 mt-4 text-xs">
              <div>
                <label className="text-slate-300 block mb-1 font-medium">Endpoint URL RouterOS:</label>
                <input
                  type="text"
                  value={cfgForm.endpointUrl}
                  onChange={e => setCfgForm({ ...cfgForm, endpointUrl: e.target.value })}
                  placeholder="https://192.168.88.1/rest"
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-cyan-400 focus:outline-none"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  RouterOS v7 mendukung REST API native di port 443 (HTTPS) atau 80 (HTTP).
                </span>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">Username Router:</label>
                <input
                  type="text"
                  value={cfgForm.username}
                  onChange={e => setCfgForm({ ...cfgForm, username: e.target.value })}
                  placeholder="admin"
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">Password / API Token:</label>
                <input
                  type="password"
                  value={cfgForm.token}
                  onChange={e => setCfgForm({ ...cfgForm, token: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <div className="bg-slate-950/80 p-2.5 rounded border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <div className="text-cyan-400 font-semibold">Catatan Pengujian Skripsi:</div>
                  <p>
                    Aplikasi menyertakan mesin emulator MikroTik RouterOS v7 lengkap. Jika tidak terhubung ke router fisik di jaringan lokal, emulator menyediakan telemetri deterministik untuk presentasi skripsi.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSaveConfig}
                className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded transition-colors"
              >
                Simpan Konfigurasi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
