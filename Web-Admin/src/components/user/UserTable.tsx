'use client';

import { Loader2, Users, Shield, ShieldOff, KeyRound } from 'lucide-react';

// ─────────────────────────────────────────────────────
// Types — mirrors the backend User model (auth.types → AuthUserResponse).
// ─────────────────────────────────────────────────────

export interface UserRow {
  id: string;
  phone: string | null;
  display_name: string | null;
  role: string;
  cooperative_id: string | null;
  cooperative: { id: string; name: string; htx_code: string } | null;
  is_active: boolean;
  is_first_login: boolean;
  last_login_at: string | null;
  created_at: string;
}

interface UserTableProps {
  users: UserRow[];
  loading: boolean;
  isSuperAdmin: boolean;
  onToggleStatus: (user: UserRow) => void;
  onResetPassword: (user: UserRow) => void;
}

// ─────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────

const ROLE_STYLES: Record<string, string> = {
  SUPER_ADMIN:     'bg-amber-50 text-amber-700 border-amber-200',
  HTX_MANAGER:     'bg-emerald-50 text-emerald-700 border-emerald-200',
  WAREHOUSE_KEEPER: 'bg-slate-50 text-slate-700 border-slate-200',
  GOV_VIEWER:      'bg-blue-50 text-blue-700 border-blue-200',
  FARMER:          'bg-stone-50 text-stone-600 border-stone-200',
};

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN:     'Quản trị viên',
  HTX_MANAGER:     'Quản lý HTX',
  WAREHOUSE_KEEPER: 'Thủ kho',
  GOV_VIEWER:      'Cơ quan NN',
  FARMER:          'Nông dân',
};

function formatDateFull(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────

export function UserTable({ users, loading, isSuperAdmin, onToggleStatus, onResetPassword }: UserTableProps) {
  // ── Loading ──
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#e6ebe3] shadow-sm p-12 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#1b4332]" />
        <p className="text-sm text-stone-500 font-medium">Đang tải danh sách tài khoản…</p>
      </div>
    );
  }

  // ── Empty ──
  if (users.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#e6ebe3] shadow-sm p-12 flex flex-col items-center justify-center gap-3">
        <Users className="h-10 w-10 text-stone-300" />
        <p className="text-sm text-stone-500 font-medium">Không tìm thấy tài khoản nào</p>
        <p className="text-xs text-stone-400">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
      </div>
    );
  }

  // ── Table ──
  return (
    <div className="bg-white rounded-2xl border border-[#e6ebe3] shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          {/* Head */}
          <thead>
            <tr className="bg-[#fcfdfa] border-b border-[#e6ebe3] text-stone-500 font-semibold text-xs uppercase tracking-wider">
              <th className="p-4 pl-6">Tài khoản</th>
              <th className="p-4">Vai trò</th>
              <th className="p-4">Hợp tác xã</th>
              <th className="p-4">Trạng thái</th>
              <th className="p-4">Đăng nhập gần nhất</th>
              {isSuperAdmin && <th className="p-4 pr-6 text-right">Hành động</th>}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-[#f0f3ee] text-sm text-stone-700">
            {users.map((user) => {
              const roleClass = ROLE_STYLES[user.role] || ROLE_STYLES.FARMER;
              const roleLabel = ROLE_LABELS[user.role] || user.role;

              return (
                <tr
                  key={user.id}
                  className="hover:bg-[#fbfcf9] transition-colors"
                >
                  {/* Account */}
                  <td className="p-4 pl-6">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-stone-800">
                        {user.display_name || '—'}
                      </span>
                      <span className="font-mono text-xs text-stone-400">
                        {user.phone || '—'}
                      </span>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${roleClass}`}>
                      {roleLabel}
                    </span>
                  </td>

                  {/* Cooperative */}
                  <td className="p-4">
                    <span className="text-stone-600">
                      {user.cooperative?.name ?? <span className="text-stone-400">—</span>}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="p-4">
                    {user.is_active ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Hoạt động
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        Đã khóa
                      </span>
                    )}
                  </td>

                  {/* Last login */}
                  <td className="p-4">
                    <span className="text-stone-500 text-xs">
                      {formatDateFull(user.last_login_at)}
                    </span>
                  </td>

                  {/* Actions */}
                  {isSuperAdmin && (
                    <td className="p-4 pr-6">
                      <div className="flex items-center justify-end gap-1">
                        {/* Lock / Unlock toggle */}
                        <button
                          onClick={() => onToggleStatus(user)}
                          title={user.is_active ? 'Khóa tài khoản' : 'Mở tài khoản'}
                          className={`p-1.5 rounded-lg transition-all ${
                            user.is_active
                              ? 'text-stone-400 hover:text-red-600 hover:bg-red-50'
                              : 'text-stone-400 hover:text-blue-600 hover:bg-blue-50'
                          }`}
                        >
                          {user.is_active ? (
                            <ShieldOff className="h-4 w-4" />
                          ) : (
                            <Shield className="h-4 w-4" />
                          )}
                        </button>

                        {/* Reset password */}
                        <button
                          onClick={() => onResetPassword(user)}
                          title="Đặt lại mật khẩu"
                          className="p-1.5 rounded-lg text-stone-400 hover:text-amber-600 hover:bg-amber-50 transition-all"
                        >
                          <KeyRound className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
