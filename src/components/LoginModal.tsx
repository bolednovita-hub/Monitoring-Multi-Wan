import React, { useState } from 'react';
import {
  X,
  Lock,
  User,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  LogOut,
  ArrowRight,
  Server,
  Terminal,
  FileText,
  FlaskConical,
  Clock,
  Info
} from 'lucide-react';
import { authService, ADMIN_ACCOUNT_DEFAULT } from '../services/authService';
import { AuthUser } from '../types/auth';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: AuthUser) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [nama, setNama] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const currentUser = authService.getCurrentUser();

  if (!isOpen) return null;

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!nama.trim()) {
      setErrorMsg('Harap masukkan nama / username admin.');
      return;
    }

    if (!password.trim()) {
      setErrorMsg('Harap masukkan password admin.');
      return;
    }

    const result = authService.login(nama, password);
    if (result.success && result.user) {
      setSuccessMsg(result.message);
      if (onSuccess) onSuccess(result.user);
      setTimeout(() => {
        onClose();
        setSuccessMsg(null);
      }, 700);
    } else {
      setErrorMsg(result.message);
    }
  };

  const handleAutoFillAdmin = () => {
    setNama(ADMIN_ACCOUNT_DEFAULT.nama);
    setPassword(ADMIN_ACCOUNT_DEFAULT.password);
    setErrorMsg(null);
  };

  const handleLogout = () => {
    authService.logout();
    setNama('');
    setPassword('');
    setErrorMsg(null);
    setSuccessMsg('Sesi administrator telah diakhiri. Saat ini berstatus tamu.');
    setTimeout(() => {
      setSuccessMsg(null);
    }, 1500);
  };

  const handleOtherUserClick = (roleName: string) => {
    setErrorMsg(`Akses untuk '${roleName}' belum tersedia pada rilis ini. Sistem saat ini hanya dapat diakses oleh Administrator.`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Login Administrator Gateway
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800">
                  Hanya Admin
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                CCR2004-1G-12S+2XS & Linksys OpenWrt (DS3231 RTC)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Information Callout: Only Admin Available */}
          <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/50 flex items-start gap-3">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed text-slate-300">
              <span className="font-bold text-amber-300">Pemberitahuan Hak Akses:</span>{' '}
              Menu login saat ini <strong className="text-white">hanya dibuka untuk Administrator</strong>. Akun untuk pengguna lain (Mahasiswa, Dosen, Tamu) <span className="text-amber-400 underline decoration-amber-500/50">belum tersedia</span>. Masukkan <strong>nama</strong> dan <strong>password</strong> admin untuk mengelola gateway.
            </div>
          </div>

          {/* Current Session Banner if logged in as Admin */}
          {currentUser?.role === 'admin' ? (
            <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center font-bold text-white text-sm shadow-md">
                  AD
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{currentUser.fullName}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-rose-950/80 text-rose-300 border-rose-700/60">
                      Aktif (Root Admin)
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Login pukul: <strong className="text-slate-300 font-mono">{currentUser.lastLoginTime || 'Sesi Aktif'}</strong>
                  </div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-xs font-semibold text-rose-300 hover:text-rose-200 bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/60 rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar / Logout</span>
              </button>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span>Status Saat Ini: <strong>Tamu / Belum Login</strong> (Akses modifikasi terbatas)</span>
              </div>
            </div>
          )}

          {/* Main Login Form: Nama & Password */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                <span>Masukkan Nama dan Password Admin</span>
              </h4>
              <button
                type="button"
                onClick={handleAutoFillAdmin}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 font-mono underline cursor-pointer"
              >
                Isi Otomatis Kredensial
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Administrator
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    placeholder="Contoh: admin"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                  />
                  <User className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Nama yang diterima: <code className="text-cyan-400">admin</code> atau <code className="text-cyan-400">administrator</code>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Password Administrator
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password admin (contoh: admin123)"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Password bawaan sistem: <code className="text-cyan-400">admin123</code> (atau <code className="text-cyan-400">admin</code>)
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 rounded-lg transition-colors"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors flex items-center gap-2 shadow-sm"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Masuk sebagai Admin</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>

          {/* Section: User Lain (Belum Tersedia) */}
          <div className="pt-3 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Pengguna Lain (Belum Tersedia)
              </span>
              <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/50">
                Akses Dibatasi
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleOtherUserClick('Mahasiswa / Peneliti')}
                className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/80 text-left opacity-70 hover:opacity-100 hover:border-slate-700 transition-all flex items-center justify-between cursor-not-allowed"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-slate-800 flex items-center justify-center text-slate-400">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-300">Mahasiswa / Klien</div>
                    <div className="text-[10px] text-slate-500">Akses telemetri umum</div>
                  </div>
                </div>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                  Belum Tersedia
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleOtherUserClick('Dosen Penguji / Auditor')}
                className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/80 text-left opacity-70 hover:opacity-100 hover:border-slate-700 transition-all flex items-center justify-between cursor-not-allowed"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-slate-800 flex items-center justify-center text-slate-400">
                    <ShieldAlert className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-300">Dosen Penguji</div>
                    <div className="text-[10px] text-slate-500">Mode auditor ujian</div>
                  </div>
                </div>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                  Belum Tersedia
                </span>
              </button>
            </div>
          </div>

          {/* Admin Privileges Checklist */}
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
              <span>Hak Akses Administrator Gateway</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1.5">
                <FlaskConical className="w-3 h-3 text-cyan-400" />
                <span>Chaos Lab: Full</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1.5">
                <Terminal className="w-3 h-3 text-cyan-400" />
                <span>Terminal: Root CLI</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1.5">
                <Server className="w-3 h-3 text-cyan-400" />
                <span>Hardware: RTC & WAN</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3 h-3 text-cyan-400" />
                <span>Audit Log: Lengkap</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
