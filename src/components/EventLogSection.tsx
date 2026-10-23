import React, { useState } from 'react';
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  Info,
  XCircle,
  Filter,
  Trash2
} from 'lucide-react';
import { NetworkEvent } from '../types/network';

interface EventLogSectionProps {
  events: NetworkEvent[];
}

export const EventLogSection: React.FC<EventLogSectionProps> = ({ events }) => {
  const [filter, setFilter] = useState<'all' | 'danger' | 'warning' | 'success'>('all');

  const filteredEvents = events.filter(e => {
    if (filter === 'all') return true;
    return e.severity === filter;
  });

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'danger':
        return <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />;
      default:
        return <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-white tracking-tight">
            Log Peristiwa Jaringan & Audit Failover Real-Time
          </h3>
          <span className="text-xs font-mono text-slate-500">
            ({events.length} Terdeteksi)
          </span>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-md border border-slate-800 text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded transition-colors ${
              filter === 'all' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setFilter('danger')}
            className={`px-2.5 py-1 rounded transition-colors ${
              filter === 'danger' ? 'bg-rose-950/80 text-rose-300 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Failover & Bahaya
          </button>
          <button
            onClick={() => setFilter('warning')}
            className={`px-2.5 py-1 rounded transition-colors ${
              filter === 'warning' ? 'bg-amber-950/80 text-amber-300 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Peringatan
          </button>
          <button
            onClick={() => setFilter('success')}
            className={`px-2.5 py-1 rounded transition-colors ${
              filter === 'success' ? 'bg-emerald-950/80 text-emerald-300 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Pemulihan
          </button>
        </div>
      </div>

      <div className="mt-3 divide-y divide-slate-800/60 max-h-64 overflow-y-auto">
        {filteredEvents.length > 0 ? (
          filteredEvents.map(evt => (
            <div key={evt.id} className="py-2.5 px-2 hover:bg-slate-800/30 rounded flex items-start gap-3 transition-colors">
              {getSeverityIcon(evt.severity)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-white tracking-tight">{evt.title}</span>
                  <span className="text-[11px] font-mono text-slate-500 shrink-0">{evt.timestamp}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{evt.description}</p>
                {evt.interfaceId && (
                  <span className="inline-block mt-1 text-[10px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 px-1.5 py-0.2 rounded">
                    Antarmuka: {evt.interfaceId}
                  </span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-xs text-slate-500">
            Tidak ada catatan kejadian pada filter ini
          </div>
        )}
      </div>
    </div>
  );
};
