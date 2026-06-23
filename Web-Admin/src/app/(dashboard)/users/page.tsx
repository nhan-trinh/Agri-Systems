'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, UserPlus, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { apiClient } from '@/lib/api/axios';
import { UserTable, UserRow } from '@/components/user/UserTable';
import { CreateManagerModal } from '@/components/user/CreateManagerModal';
import { ResetPasswordModal } from '@/components/user/ResetPasswordModal';

// ─────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────

interface Cooperative {
  id: string;
  name: string;
  htx_code: string;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

interface Toast {
  message: string;
  type: 'success' | 'error';
}

// ─────────────────────────────────────────────────────
// Page Component
// ─────────────────────────────────────────────────────

export default function UsersPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  // ── Role guard ──
  useEffect(() => {
    if (user && user.role !== 'SUPER_ADMIN' && user.role !== 'HTX_MANAGER') {
      router.push('/');
    }
  }, [user, router]);

  // ── Data state ──
  const [users, setUsers] = useState<UserRow[]>([]);
  const [cooperatives, setCooperatives] = useState<Cooperative[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Filters & pagination ──
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: 20, total: 0, total_pages: 0 });

  // ── Modal state ──
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null);

  // ── Toast ──
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Helpers ──
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // ══════════════════════════════════════════════════
  // Data Fetching
  // ══════════════════════════════════════════════════

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (search.trim()) params.set('search', search.trim());
      if (roleFilter) params.set('role', roleFilter);
      if (statusFilter) params.set('is_active', statusFilter);

      const res = await apiClient.get(`/users?${params.toString()}`);
      if (res.data?.success) {
        setUsers(res.data.data);
        setMeta(res.data.meta);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
      showToast('Không thể tải danh sách tài khoản', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, statusFilter]);

  const fetchCooperatives = useCallback(async () => {
    if (!isSuperAdmin) return;
    try {
      const res = await apiClient.get('/cooperatives');
      if (res.data?.success) {
        setCooperatives(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch cooperatives:', err);
    }
  }, [isSuperAdmin]);

  // Fetch on mount and when filters/pagination change
  useEffect(() => {
    if (!user) return;
    fetchUsers();
  }, [user, fetchUsers]);

  useEffect(() => {
    if (!user) return;
    fetchCooperatives();
  }, [user, fetchCooperatives]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, statusFilter]);

  // ══════════════════════════════════════════════════
  // Actions
  // ══════════════════════════════════════════════════

  const handleToggleStatus = async (targetUser: UserRow) => {
    const newStatus = !targetUser.is_active;
    const actionText = newStatus ? 'mở khóa' : 'khóa';

    if (!confirm(`Bạn có chắc chắn muốn ${actionText} tài khoản này?`)) return;

    try {
      const res = await apiClient.patch(`/users/${targetUser.id}/status`, {
        is_active: newStatus,
      });
      if (res.data?.success) {
        showToast(`Đã ${actionText} tài khoản thành công`, 'success');
        fetchUsers();
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      const message =
        error?.response?.data?.error?.message || `Không thể ${actionText} tài khoản`;
      showToast(message, 'error');
    }
  };

  const handleResetPassword = (targetUser: UserRow) => {
    setResetTarget(targetUser);
  };

  const handleCreateSuccess = () => {
    showToast('Đã tạo tài khoản quản lý thành công', 'success');
    fetchUsers();
  };

  const handleResetSuccess = () => {
    showToast('Đã đặt lại mật khẩu thành công', 'success');
    setResetTarget(null);
  };

  // ══════════════════════════════════════════════════
  // Render
  // ══════════════════════════════════════════════════

  if (!user) return null;

  return (
    <div className="space-y-6 font-sans relative">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#1b4332] tracking-tight">
            Quản lý tài khoản
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            Quản lý tài khoản người dùng trong hệ thống
          </p>
        </div>
        {isSuperAdmin && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 bg-[#1b4332] hover:bg-[#143225] text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm transition-all"
          >
            <UserPlus className="h-4 w-4" />
            Tạo quản lý HTX
          </button>
        )}
      </div>

      {/* ── Filter Bar ── */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-2xl border border-[#e6ebe3] shadow-sm">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên hoặc số điện thoại…"
            className="w-full pl-9 pr-4 py-2 bg-[#fbfcf9] border border-[#e6ebe3] rounded-xl text-sm text-stone-700 placeholder:text-stone-400 focus:outline-none focus:border-[#1b4332] focus:ring-1 focus:ring-[#1b4332]/20 transition-all"
          />
        </div>

        {/* Role filter */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 bg-[#fbfcf9] border border-[#e6ebe3] rounded-xl text-sm text-stone-700 focus:outline-none focus:border-[#1b4332] transition-all cursor-pointer"
        >
          <option value="">Tất cả vai trò</option>
          <option value="HTX_MANAGER">Quản lý HTX</option>
          <option value="FARMER">Nông dân</option>
          <option value="WAREHOUSE_KEEPER">Thủ kho</option>
          <option value="GOV_VIEWER">Cơ quan NN</option>
        </select>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-[#fbfcf9] border border-[#e6ebe3] rounded-xl text-sm text-stone-700 focus:outline-none focus:border-[#1b4332] transition-all cursor-pointer"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="true">Hoạt động</option>
          <option value="false">Đã khóa</option>
        </select>
      </div>

      {/* ── Table ── */}
      <UserTable
        users={users}
        loading={loading}
        isSuperAdmin={isSuperAdmin}
        onToggleStatus={handleToggleStatus}
        onResetPassword={handleResetPassword}
      />

      {/* ── Pagination ── */}
      {meta.total_pages > 1 && (
        <div className="flex items-center justify-between bg-white px-4 py-3 rounded-2xl border border-[#e6ebe3] shadow-sm">
          <p className="text-xs text-stone-500 font-medium">
            Trang <span className="font-bold text-stone-700">{meta.page}</span> / {meta.total_pages}
            <span className="ml-2 text-stone-400">({meta.total} tài khoản)</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={meta.page <= 1}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-stone-600 border border-stone-200 rounded-lg hover:bg-stone-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Trước
            </button>
            <button
              onClick={() => setPage((p) => Math.min(meta.total_pages, p + 1))}
              disabled={meta.page >= meta.total_pages}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-stone-600 border border-stone-200 rounded-lg hover:bg-stone-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Sau
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {isSuperAdmin && (
        <>
          <CreateManagerModal
            isOpen={isCreateOpen}
            onClose={() => setIsCreateOpen(false)}
            cooperatives={cooperatives}
            onSuccess={handleCreateSuccess}
          />
          <ResetPasswordModal
            isOpen={resetTarget !== null}
            onClose={() => setResetTarget(null)}
            user={resetTarget}
            onSuccess={handleResetSuccess}
          />
        </>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-[60] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold transition-all animate-in fade-in slide-in-from-top-2 duration-300 ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          {toast.message}
        </div>
      )}
    </div>
  );
}
