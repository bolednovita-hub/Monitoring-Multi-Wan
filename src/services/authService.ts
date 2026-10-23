import { AuthUser, UserRole, UserPermissions } from '../types/auth';

const ADMIN_PERMISSIONS: UserPermissions = {
  canInjectChaos: true,
  canRebootRouter: true,
  canSyncRtc: true,
  canExecuteCli: true,
  canExportReports: true,
  canRunBenchmark: true,
  canEditSettings: true,
};

const GUEST_PERMISSIONS: UserPermissions = {
  canInjectChaos: false,
  canRebootRouter: false,
  canSyncRtc: false,
  canExecuteCli: false,
  canExportReports: true,
  canRunBenchmark: false,
  canEditSettings: false,
};

export const ADMIN_ACCOUNT_DEFAULT = {
  nama: 'admin',
  password: 'admin123',
  passwordAlt: 'admin',
  user: {
    id: 'usr-admin-gateway',
    username: 'admin',
    fullName: 'Administrator Jaringan (CCR2004 Gateway)',
    email: 'admin@routeros.local',
    role: 'admin' as UserRole,
    roleTitle: 'Administrator Gateway (Full Root)',
    roleBadgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
    institution: 'NOC & MikroTik Infrastructure Gateway',
    avatarSeed: 'AD',
    permissions: ADMIN_PERMISSIONS,
    lastLoginTime: '',
  },
};

class AuthService {
  private currentUser: AuthUser | null = null;
  private listeners: Set<() => void> = new Set();
  private storageKey = 'multiwan_auth_session_admin_only_v2';

  constructor() {
    this.loadSession();
  }

  private loadSession() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.role === 'admin') {
          this.currentUser = parsed;
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to parse stored auth session', e);
    }

    // Default: Start as logged in Admin or guest?
    // Let's initialize as logged-in Admin so the user sees the admin state immediately,
    // but can log out and test logging in with nama and password.
    this.currentUser = {
      ...ADMIN_ACCOUNT_DEFAULT.user,
      lastLoginTime: new Date().toLocaleTimeString('id-ID'),
    };
  }

  private persistSession() {
    try {
      if (this.currentUser) {
        localStorage.setItem(this.storageKey, JSON.stringify(this.currentUser));
      } else {
        localStorage.removeItem(this.storageKey);
      }
    } catch (e) {
      console.warn('Failed to save auth session', e);
    }
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  public isAdmin(): boolean {
    return this.currentUser?.role === 'admin';
  }

  public isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  /**
   * Only Admin is supported at this stage. Other users are not available yet.
   */
  public login(namaInput: string, passwordInput: string): { success: boolean; message: string; user?: AuthUser } {
    const trimmedNama = namaInput.trim().toLowerCase();
    const trimmedPass = passwordInput.trim();

    if (!trimmedNama || !trimmedPass) {
      return {
        success: false,
        message: 'Harap masukkan nama dan password administrator.',
      };
    }

    // Check if the user is trying to log in as someone else
    const allowedAdminNames = ['admin', 'administrator', 'admin gateway', 'admin ccr2004', 'root'];
    const isAdminIdentifier = allowedAdminNames.includes(trimmedNama);

    if (!isAdminIdentifier) {
      return {
        success: false,
        message: `Akses untuk user '${namaInput}' belum tersedia. Saat ini sistem hanya terbuka untuk Administrator.`,
      };
    }

    // Validate password
    const validPasswords = ['admin123', 'admin', 'admin@ccr2004', 'mikrotik'];
    if (!validPasswords.includes(trimmedPass)) {
      return {
        success: false,
        message: 'Password administrator salah. Silakan coba kembali (default: admin123).',
      };
    }

    this.currentUser = {
      ...ADMIN_ACCOUNT_DEFAULT.user,
      fullName: namaInput.trim().toLowerCase() === 'admin' ? 'Administrator Jaringan (CCR2004)' : `Admin (${namaInput.trim()})`,
      lastLoginTime: new Date().toLocaleTimeString('id-ID'),
    };

    this.persistSession();
    this.notify();

    return {
      success: true,
      message: `Berhasil masuk sebagai ${this.currentUser.fullName}!`,
      user: this.currentUser,
    };
  }

  public loginAsAdminDirect() {
    this.currentUser = {
      ...ADMIN_ACCOUNT_DEFAULT.user,
      lastLoginTime: new Date().toLocaleTimeString('id-ID'),
    };
    this.persistSession();
    this.notify();
    return this.currentUser;
  }

  public logout() {
    this.currentUser = null;
    this.persistSession();
    this.notify();
  }

  public checkPermission(permissionKey: keyof UserPermissions): boolean {
    if (!this.currentUser) {
      return GUEST_PERMISSIONS[permissionKey];
    }
    return Boolean(this.currentUser.permissions[permissionKey]);
  }
}

export const authService = new AuthService();
