import React, { useState, useRef, useEffect } from 'react';
import {
  Terminal as TerminalIcon,
  Play,
  RotateCcw,
  Copy,
  Check,
  Cpu,
  Activity,
  Layers,
  ShieldCheck,
  HelpCircle,
  Clock
} from 'lucide-react';
import { NetwatchTarget, TerminalHistoryItem } from '../types/network';
import { authService } from '../services/authService';

interface RouterCliTerminalProps {
  onExecuteCommand: (cmd: string) => string;
  netwatchTargets: NetwatchTarget[];
}

const QUICK_COMMANDS = [
  { label: '/ip route print detail', cmd: '/ip route print detail', desc: 'Tabel perutean PCC & distance failover' },
  { label: '/ip firewall mangle print', cmd: '/ip firewall mangle print', desc: 'Aturan hashing PCC 3/0, 3/1, 3/2' },
  { label: '/ip firewall connection print', cmd: '/ip firewall connection print', desc: 'Tabel sesi koneksi klien aktif' },
  { label: '/tool netwatch print', cmd: '/tool netwatch print', desc: 'Probe deteksi kegagalan link ICMP' },
  { label: '/system resource print', cmd: '/system resource print', desc: 'CPU, RAM, dan hardware CCR2004' },
  { label: '/system clock print', cmd: '/system clock print', desc: 'Jam sistem sinkronisasi mikroTik' },
  { label: '/interface monitor-traffic', cmd: '/interface monitor-traffic ether1,ether2,ether3 once', desc: 'Throughput riil ketiga antarmuka' },
  { label: '/tool ping 8.8.8.8', cmd: '/tool ping 8.8.8.8 count=4', desc: 'Uji latensi ke DNS publik' },
  { label: '/tool traceroute 1.1.1.1', cmd: '/tool traceroute 1.1.1.1', desc: 'Uji loncatan hop gerbang' }
];

export const RouterCliTerminal: React.FC<RouterCliTerminalProps> = ({
  onExecuteCommand,
  netwatchTargets
}) => {
  const [inputVal, setInputVal] = useState('');
  const [history, setHistory] = useState<TerminalHistoryItem[]>([
    {
      id: 'init-1',
      timestamp: new Date().toLocaleTimeString('id-ID'),
      command: '',
      output: `  MMM      MMM       KKK                          TTTTTTTTTTT      KKK
  MMMM    MMMM       KKK                          TTTTTTTTTTT      KKK
  MMM MMMM MMM  III  KKK  KKK  RRRRRR     OOOOOO      TTT     III  KKK  KKK
  MMM  MM  MMM  III  KKKKK     RRR  RRR  OOO  OOO     TTT     III  KKKKK
  MMM      MMM  III  KKK KKK   RRRRRR    OOO  OOO     TTT     III  KKK KKK
  MMM      MMM  III  KKK  KKK  RRR  RRR   OOOOOO      TTT     III  KKK  KKK

  MikroTik RouterOS 7.14.3 (c) 1999-2026       https://www.mikrotik.com/
  Terminal Konsol REST Engine Aktif. Ketik 'help' atau klik perintah cepat di bawah.`,
      type: 'system'
    }
  ]);
  const [copied, setCopied] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const currentUser = authService.getCurrentUser();

  const handleSubmit = (cmdToRun?: string) => {
    const command = cmdToRun !== undefined ? cmdToRun : inputVal;
    if (!command.trim()) return;

    let output = '';
    let itemType: 'output' | 'error' = 'output';

    if (!authService.isAdmin()) {
      output = `ERROR: Permission denied. Eksekusi CLI MikroTik RouterOS v7 membutuhkan hak akses Administrator. Pengguna lain belum tersedia. Silakan login melalui menu Administrator dengan memasukkan nama dan password.`;
      itemType = 'error';
    } else {
      output = onExecuteCommand(command);
    }

    const newItems: TerminalHistoryItem[] = [
      {
        id: `cmd-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('id-ID'),
        command: command,
        output: output,
        type: itemType
      }
    ];

    setHistory(prev => [...prev, ...newItems]);
    if (cmdToRun === undefined) {
      setInputVal('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handleClear = () => {
    setHistory([]);
  };

  const handleCopyTerminal = () => {
    const text = history.map(h => `${h.command ? `[admin@MikroTik-CCR2004] > ${h.command}\n` : ''}${h.output}`).join('\n\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Netwatch Probes Status Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <Activity className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-xs font-bold text-white tracking-tight">
                Status Target Netwatch (/tool/netwatch) & Uji Probe Gateway
              </h3>
              <p className="text-[11px] text-slate-400">
                Pemeriksaan periodik gateway ISP untuk memicu skrip pemutus/pengalih rute PCC saat terjadi putus jalur
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
            3 Probe Aktif
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          {netwatchTargets.map((nw) => {
            const isUp = nw.status === 'up';
            return (
              <div
                key={nw.id}
                className={`p-3 rounded-lg border text-xs font-mono space-y-1.5 ${
                  isUp ? 'bg-slate-950/80 border-slate-800' : 'bg-rose-950/30 border-rose-900/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">{nw.targetName.split(' ')[0]} ({nw.host})</span>
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                    isUp ? 'text-emerald-400 bg-emerald-950 border border-emerald-800' : 'text-rose-400 bg-rose-950 border border-rose-800'
                  }`}>
                    {nw.status}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 flex justify-between">
                  <span>Antarmuka:</span>
                  <span className="text-slate-200">{nw.wanName.split(' - ')[0]}</span>
                </div>
                <div className="text-[11px] text-slate-400 flex justify-between">
                  <span>Latensi RTT:</span>
                  <span className={isUp ? 'text-cyan-400 font-bold' : 'text-rose-400'}>
                    {isUp ? `${nw.lastRttMs} ms` : 'RTO (Timeout)'}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 truncate pt-1 border-t border-slate-800/80 font-sans">
                  Action on-down: <code className="text-amber-400 font-mono text-[9px]">{nw.downScript}</code>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive RouterOS CLI Terminal */}
      <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden shadow-2xl flex flex-col font-mono text-xs">
        {/* Terminal Title Bar */}
        <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 mr-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
            </div>
            <TerminalIcon className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-semibold text-slate-200">
              {currentUser?.username || 'admin'}@MikroTik-CCR2004 — RouterOS v7 CLI Console (REST Bridge)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyTerminal}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] transition-colors flex items-center gap-1"
              title="Salin seluruh riwayat terminal"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Tersalin' : 'Salin'}</span>
            </button>
            <button
              onClick={handleClear}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] transition-colors flex items-center gap-1"
              title="Bersihkan layar konsol"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Quick Commands Chip Ribbon */}
        <div className="p-3 bg-slate-900/40 border-b border-slate-800 flex flex-wrap gap-1.5 items-center">
          <span className="text-[10px] text-slate-400 uppercase font-sans font-bold tracking-wider mr-1">
            Eksekusi Cepat Skripsi:
          </span>
          {QUICK_COMMANDS.map((qc, i) => (
            <button
              key={i}
              onClick={() => handleSubmit(qc.cmd)}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white rounded text-[10px] border border-slate-700/80 transition-colors flex items-center gap-1"
              title={qc.desc}
            >
              <Play className="w-2.5 h-2.5 text-cyan-400" />
              <span>{qc.label}</span>
            </button>
          ))}
        </div>

        {/* Terminal Content Screen */}
        <div className="p-4 bg-slate-950 text-slate-200 min-h-[360px] max-h-[500px] overflow-y-auto space-y-3 leading-relaxed selection:bg-cyan-500/30 selection:text-white">
          {history.map((item) => (
            <div key={item.id} className="space-y-1">
              {item.command && (
                <div className="flex items-center gap-2 text-cyan-400 font-bold">
                  <span className="text-slate-500 font-normal">[{item.timestamp}]</span>
                  <span className="text-emerald-400">[{currentUser?.username || 'admin'}@MikroTik-CCR2004] &gt;</span>
                  <span>{item.command}</span>
                </div>
              )}
              <pre className="text-slate-300 whitespace-pre-wrap font-mono text-[11px] pl-4 border-l-2 border-slate-800/80 py-0.5">
                {item.output}
              </pre>
            </div>
          ))}
          <div ref={terminalEndRef} />
        </div>

        {/* Terminal Input Box */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
          <span className="text-emerald-400 font-bold shrink-0 text-xs">
            [admin@MikroTik-CCR2004] &gt;
          </span>
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ketik perintah (contoh: /ip route print atau /ip firewall connection print)..."
            className="flex-1 bg-transparent border-none text-slate-100 text-xs font-mono focus:outline-none placeholder-slate-600"
            autoFocus
          />
          <button
            onClick={() => handleSubmit()}
            className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded transition-colors flex items-center gap-1 shrink-0"
          >
            <Play className="w-3 h-3" />
            <span>Kirim</span>
          </button>
        </div>
      </div>
    </div>
  );
};
