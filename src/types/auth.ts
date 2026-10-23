export type UserRole = 'admin' | 'researcher' | 'examiner';

export interface UserPermissions {
  canInjectChaos: boolean;
  canRebootRouter: boolean;
  canSyncRtc: boolean;
  canExecuteCli: boolean;
  canExportReports: boolean;
  canRunBenchmark: boolean;
  canEditSettings: boolean;
}

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
  roleTitle: string;
  roleBadgeColor: string;
  nim?: string;
  institution?: string;
  avatarSeed: string;
  permissions: UserPermissions;
  lastLoginTime: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}
