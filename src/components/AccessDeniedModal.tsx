import React from 'react';
import { ShieldAlert, X, ArrowRight, KeyRound, Lock } from 'lucide-react';
import { authService } from '../services/authService';

interface AccessDeniedModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionTitle?: string;
  onOpenLoginModal: () => void;
}

export const AccessDeniedModal: React.FC<AccessDeniedModalProps> = ({
  isOpen,
  onClose,
  actionTitle = 'Melakukan Aksi Ini',
  onOpenLoginModal,
}) => {
  if (!isOpen) return null;

  const currentUser = authService.getCurrentUser();

  const handleOpenLogin = () => {
    onClose();
    onOpenLoginModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-rose-500/40 rounded-2xl shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Akses Khusus Administrator
            </h3>
            <span className="text-[11px] font-mono text-rose-400">
              {currentUser ? currentUser.roleTitle : 'Status: Tamu (Belum Login)'}
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Tindakan <strong className="text-white">"{actionTitle}"</strong> memerlukan hak akses root <strong className="text-rose-400">Administrator Gateway</strong>.
        </p>

        <div className="mt-3 p-3 rounded-lg bg-amber-950/30 border border-amber-800/40 text-[11px] text-amber-300/90 leading-relaxed">
          Akses untuk user/pengguna lain belum tersedia pada sistem ini. Silakan masukkan nama dan password administrator untuk melanjutkan.
        </div>

        <div className="mt-5 space-y-2">
          <button
            onClick={handleOpenLogin}
            className="w-full py-2.5 px-4 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-md border border-rose-400/40"
          >
            <Lock className="w-4 h-4" />
            <span>Buka Form Login Administrator</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="mt-4 flex items-center justify-end pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 rounded-lg transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
