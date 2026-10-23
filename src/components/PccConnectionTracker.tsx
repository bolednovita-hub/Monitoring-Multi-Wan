import React, { useState } from 'react';
import {
  Layers,
  ArrowRight,
  Activity,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Globe,
  Radio,
  Cpu,
  Zap,
  ShieldAlert
} from 'lucide-react';
import { PccConnection, WanInterface, WanId } from '../types/network';

interface PccConnectionTrackerProps {
  connections: PccConnection[];
  wans: WanInterface[];
  onSimulateNewSession?: () => void;
}

export const PccConnectionTracker: React.FC<PccConnectionTrackerProps> = ({
  connections,
  wans
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWan, setSelectedWan] = useState<string>('all');
  const [selectedProtocol, setSelectedProtocol] = useState<string>('all');

  const filteredConnections = connections.filter(conn => {
    const matchesSearch =
      conn.srcIp.includes(searchTerm) ||
      conn.dstIp.includes(searchTerm) ||
      conn.serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conn.dstPort.toString().includes(searchTerm);

    const matchesWan = selectedWan === 'all' || conn.outInterface === selectedWan;
    const matchesProto = selectedProtocol === 'all' || conn.protocol === selectedProtocol;

    return matchesSearch && matchesWan && matchesProto;
  });

  const wan1Conns = connections.filter(c => c.outInterface === 'ether1-wan1').length;
  const wan2Conns = connections.filter(c => c.outInterface === 'ether2-wan2').length;
  const wan3Conns = connections.filter(c => c.outInterface === 'ether3-wan3').length;

  const wan1 = wans.find(w => w.id === 'ether1-wan1');
  const wan2 = wans.find(w => w.id === 'ether2-wan2');
  const wan3 = wans.find(w => w.id === 'ether3-wan3');

  return (
    <div className="space-y-4">
      {/* Header Overview Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                <Layers className="w-4 h-4" />
              </span>
              <h2 className="text-base font-bold text-white tracking-tight">
                Pelacak Sesi Koneksi PCC (Per Connection Classifier) RouterOS v7
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Memantau pemetaan aliran paket soket jaringan klien lab menuju gerbang Multi-WAN berdasarkan algoritma hashing <code className="text-cyan-300 font-mono">both-addresses-and-ports</code>. Jika terjadi failover, sesi aktif secara dinamis dialihkan ke WAN cadangan tanpa pemutusan soket fatal.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-950 text-slate-300 border border-slate-800">
              Total Sesi Aktif: <strong className="text-cyan-400">{connections.length}</strong>
            </span>
          </div>
        </div>

        {/* PCC Distribution Gauges */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          {/* WAN1 PCC Status */}
          <div className={`p-3.5 rounded-lg border ${
            wan1?.status === 'active'
              ? 'bg-slate-950/80 border-slate-800'
              : 'bg-rose-950/20 border-rose-900/50'
          }`}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${wan1?.status === 'active' ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                WAN 1 (IndiHome Fiber)
              </span>
              <span className="text-[10px] font-mono text-cyan-400">PCC 3/0 (Bobot 2)</span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <div className="text-lg font-bold font-mono text-white">
                {wan1Conns} <span className="text-xs font-normal text-slate-400">Sesi</span>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {connections.length > 0 ? Math.round((wan1Conns / connections.length) * 100) : 0}% Distribusi
              </span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-cyan-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${connections.length > 0 ? (wan1Conns / connections.length) * 100 : 0}%` }}
              />
            </div>
            {wan1?.status === 'down' && (
              <span className="text-[10px] text-rose-400 font-semibold block mt-1.5">
                ⚠️ Jalur Down — Seluruh sesi dialihkan ke WAN 2 & WAN 3
              </span>
            )}
          </div>

          {/* WAN2 PCC Status */}
          <div className={`p-3.5 rounded-lg border ${
            wan2?.status === 'active'
              ? 'bg-slate-950/80 border-slate-800'
              : 'bg-rose-950/20 border-rose-900/50'
          }`}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${wan2?.status === 'active' ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                WAN 2 (Biznet Dedicated)
              </span>
              <span className="text-[10px] font-mono text-cyan-400">PCC 3/1 (Bobot 1)</span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <div className="text-lg font-bold font-mono text-white">
                {wan2Conns} <span className="text-xs font-normal text-slate-400">Sesi</span>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {connections.length > 0 ? Math.round((wan2Conns / connections.length) * 100) : 0}% Distribusi
              </span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${connections.length > 0 ? (wan2Conns / connections.length) * 100 : 0}%` }}
              />
            </div>
            {wan1?.status === 'down' && wan2?.status === 'active' && (
              <span className="text-[10px] text-emerald-400 font-semibold block mt-1.5">
                ⚡ Mengakomodasi limpahan trafik failover dari WAN 1
              </span>
            )}
          </div>

          {/* WAN3 PCC Status */}
          <div className={`p-3.5 rounded-lg border ${
            wan3?.status === 'active'
              ? 'bg-amber-950/20 border-amber-800/40'
              : 'bg-slate-950/80 border-slate-800'
          }`}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${wan3?.status === 'active' ? 'bg-amber-400' : 'bg-slate-500'}`} />
                WAN 3 (Telkomsel Orbit)
              </span>
              <span className="text-[10px] font-mono text-amber-400">Standby Failover</span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <div className="text-lg font-bold font-mono text-white">
                {wan3Conns} <span className="text-xs font-normal text-slate-400">Sesi</span>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {connections.length > 0 ? Math.round((wan3Conns / connections.length) * 100) : 0}% Distribusi
              </span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${connections.length > 0 ? (wan3Conns / connections.length) * 100 : 0}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 font-mono block mt-1.5">
              Distance: 3 · Active saat fiber blackout
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 rounded-lg">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari IP, Port, atau Layanan (e.g. YouTube, 443, Zoom)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* WAN Interface Filter */}
          <select
            value={selectedWan}
            onChange={(e) => setSelectedWan(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="all">Semua Jalur WAN</option>
            <option value="ether1-wan1">ether1 - IndiHome</option>
            <option value="ether2-wan2">ether2 - Biznet</option>
            <option value="ether3-wan3">ether3 - Telkomsel Orbit</option>
          </select>

          {/* Protocol Filter */}
          <select
            value={selectedProtocol}
            onChange={(e) => setSelectedProtocol(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="all">Semua Protokol</option>
            <option value="TCP">TCP</option>
            <option value="UDP">UDP</option>
          </select>
        </div>
      </div>

      {/* Connection Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="p-3">Protokol</th>
                <th className="p-3">Sumber (Klien Lab)</th>
                <th className="p-3">Tujuan (Layanan Internet)</th>
                <th className="p-3">Slot Hash PCC</th>
                <th className="p-3">Routing Mark</th>
                <th className="p-3">Antarmuka Keluar</th>
                <th className="p-3 text-right">Laju Rx / Tx</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredConnections.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-500 italic">
                    Tidak ada koneksi yang cocok dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredConnections.map((conn) => {
                  const isWan1 = conn.outInterface === 'ether1-wan1';
                  const isWan2 = conn.outInterface === 'ether2-wan2';
                  const isWan3 = conn.outInterface === 'ether3-wan3';

                  return (
                    <tr key={conn.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          conn.protocol === 'TCP'
                            ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                            : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                        }`}>
                          {conn.protocol}
                        </span>
                      </td>

                      <td className="p-3">
                        <div className="font-semibold text-slate-200">{conn.srcIp}</div>
                        <div className="text-[10px] text-slate-500">Port {conn.srcPort}</div>
                      </td>

                      <td className="p-3">
                        <div className="font-sans font-medium text-white flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span>{conn.serviceName}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {conn.dstIp}:{conn.dstPort}
                        </div>
                      </td>

                      <td className="p-3">
                        <span className="font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">
                          {conn.pccHashSlot}
                        </span>
                      </td>

                      <td className="p-3">
                        <span className="text-[11px] font-mono text-slate-300">
                          {conn.routingMark}
                        </span>
                      </td>

                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1.5 w-max ${
                          isWan1
                            ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30'
                            : isWan2
                            ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/30'
                            : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            isWan1 ? 'bg-cyan-400' : isWan2 ? 'bg-indigo-400' : 'bg-amber-400'
                          }`} />
                          {isWan1 ? 'ether1 (IndiHome)' : isWan2 ? 'ether2 (Biznet)' : 'ether3 (Orbit)'}
                        </span>
                      </td>

                      <td className="p-3 text-right">
                        <div className="font-bold text-white">
                          {(conn.rxRateKbps / 1024).toFixed(2)} MB/s
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {(conn.txRateKbps / 1024).toFixed(2)} MB/s Tx
                        </div>
                      </td>

                      <td className="p-3 text-center">
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/70 border border-emerald-800 px-2 py-0.5 rounded">
                          {conn.tcpState}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
