import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  ChevronDown,
  LogOut,
  KeyRound,
  Server,
  Lock,
  UserX,
  AlertCircle
} from 'lucide-react';
import { authService } from '../services/authService';
import { AuthUser } from '../types/auth';

interface UserProfileBadgeProps {
  onOpenLoginModal: () => void;
  compact?: boolean;
}

export const UserProfileBadge: React.FC<UserProfileBadgeProps> = ({
  onOpenLoginModal
}) => {
  const [user, setUser] = useState<AuthUser | null>(authService.getCurrentUser());
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = authService.subscribe(() => {
      setUser(authService.getCurrentUser());
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    authService.logout();
    setDropdownOpen(false);
  };

  if (!user || user.role !== 'admin') {
    return (
      <button
        onClick={onOpenLoginModal}
        className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/80 transition-all cursor-pointer group shadow-sm"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-cyan-400 group-hover:border-cyan-500/30 transition-colors">
            <Lock className="w-4 h-4" />
          </div>
          <div className="text-left">
            <div className="text-xs font-semibold text-slate-300 group-hover:text-cyan-300 transition-colors">
              Mode Tamu
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              Akses Admin Terkunci
            </div>
          </div>
        </div>
        <div className="p-1 rounded bg-slate-800/80 text-slate-500 group-hover:text-cyan-400 group-hover:bg-cyan-950/40 transition-colors">
          <KeyRound className="w-3.5 h-3.5" />
        </div>
      </button>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/80 transition-all cursor-pointer select-none group"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center text-white text-xs font-black shadow-sm shrink-0">
            AD
          </div>
          <div className="truncate text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white truncate group-hover:text-rose-300 transition-colors">
                {user.fullName}
              </span>
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded border bg-rose-950/80 text-rose-300 border-rose-700/60">
                Admin Gateway
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Root
              </span>
            </div>
          </div>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform shrink-0 ${
            dropdownOpen ? 'rotate-180 text-rose-400' : 'group-hover:text-slate-200'
          }`}
        />
      </div>

      {/* Admin Dropdown Popover */}
      {dropdownOpen && (
        <div className="absolute left-0 bottom-full mb-2 w-72 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-bottom-2">
          {/* User Details */}
          <div className="pb-2.5 mb-2.5 border-b border-slate-800">
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-rose-400" />
              <span>{user.fullName}</span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">{user.email}</div>
            <div className="mt-1 text-[10px] text-rose-300 font-mono bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/50 inline-block">
              Peran: Administrator (CCR2004 Gateway)
            </div>
          </div>

          {/* Note about other users */}
          <div className="mb-2.5 p-2 rounded-lg bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-[10px] uppercase tracking-wide">
              <AlertCircle className="w-3 h-3" />
              <span>Pengguna Lain Belum Tersedia</span>
            </div>
            <p className="text-[10px] text-slate-500 leading-normal">
              Akses akun umum/mahasiswa belum dibuka. Sistem saat ini hanya untuk Administrator.
            </p>
          </div>

          {/* Action Links */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={() => {
                setDropdownOpen(false);
                onOpenLoginModal();
              }}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
            >
              <KeyRound className="w-3 h-3" />
              <span>Kelola Login Admin</span>
            </button>

            <button
              onClick={handleLogout}
              className="text-[11px] text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1"
            >
              <LogOut className="w-3 h-3" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
