import Link from 'next/link';
import { type LucideIcon } from 'lucide-react';
import {
  Building2,
  Leaf,
  Users,
  Map,
  Calendar,
  Package,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import { type User } from '@/store/auth';
import { cn } from '@/lib/cn';

interface QuickAction {
  href?: string;
  icon: LucideIcon;
  title: string;
  description: string;
  /** When set, renders as a disabled placeholder (no link). */
  badge?: string;
}

const QUICK_ACTIONS: Partial<Record<User['role'], QuickAction[]>> = {
  SUPER_ADMIN: [
    {
      href: '/cooperatives',
      icon: Building2,
      title: 'Quản lý Hợp tác xã',
      description: 'Khai báo thông tin, cấp mã số cho các HTX mới liên kết trong hệ thống.',
    },
    {
      href: '/carbon/factors',
      icon: Leaf,
      title: 'Hệ số phát thải',
      description: 'Cấu hình định mức phát thải CO2 cho các nguyên vật liệu canh tác.',
    },
    {
      href: '/farmers',
      icon: Users,
      title: 'Hồ sơ Nông dân',
      description: 'Giám sát toàn bộ hộ nông dân tham gia trên hệ thống AgriTrace.',
    },
  ],
  HTX_MANAGER: [
    {
      href: '/farmers',
      icon: Users,
      title: 'Đăng ký Nông dân',
      description: 'Thêm mới hộ nông dân và cấp mã số định danh HTX-YYYY-NNNN.',
    },
    {
      href: '/farm-zones',
      icon: Map,
      title: 'Bản đồ Vùng trồng',
      description: 'Số hóa polygon ranh giới và đo đạc diện tích thực tế.',
    },
    {
      href: '/seasons',
      icon: Calendar,
      title: 'Theo dõi Vụ mùa',
      description: 'Khai báo vụ mùa nông sản, ghi chép nhật ký bón phân, tưới nước, và đóng vụ mùa.',
    },
  ],
  WAREHOUSE_KEEPER: [
    {
      icon: Package,
      title: 'Nhập xuất vật tư',
      description: 'Lập phiếu kho phân đạm, hạt giống, hóa đơn nhà cung cấp. (Sắp ra mắt)',
      badge: 'Phase 3',
    },
    {
      icon: TrendingUp,
      title: 'Cảnh báo hết hạn',
      description: 'Cảnh báo vật tư nông nghiệp gần hết hạn sử dụng. (Sắp ra mắt)',
      badge: 'Phase 3',
    },
  ],
  GOV_VIEWER: [
    {
      icon: BarChart3,
      title: 'Thống kê phát thải vĩ mô',
      description: 'Xem bản đồ phát thải carbon vùng và xuất báo cáo Excel/PDF ẩn danh. (Sắp ra mắt)',
      badge: 'Phase 5',
    },
  ],
};

interface QuickActionsProps {
  role: User['role'];
}

/**
 * Role-scoped quick-action grid, data-driven from a single config object.
 * Replaces the previous per-role copy-pasted JSX blocks. Active actions render
 * as Link cards; `badge` entries render as disabled placeholders.
 */
export function QuickActions({ role }: QuickActionsProps) {
  const actions = QUICK_ACTIONS[role];

  return (
    <div className="space-y-4">
      <h2 className="font-serif text-xl font-bold text-stone-800">Bàn làm việc của bạn</h2>

      {!actions || actions.length === 0 ? (
        <div className="bg-white p-6 rounded-2xl border border-[#e6ebe3] shadow-sm text-center">
          <p className="text-sm text-stone-500 font-medium">
            Chưa có thao tác nhanh cho vai trò này.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {actions.map((action) => (
            <QuickActionCard key={action.title} action={action} />
          ))}
        </div>
      )}
    </div>
  );
}

function QuickActionCard({ action }: { action: QuickAction }) {
  const { href, icon: Icon, title, description, badge } = action;
  const disabled = !href;

  const content = (
    <>
      {badge && (
        <span className="absolute top-4 right-4 bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-200 uppercase">
          {badge}
        </span>
      )}
      <div
        className={cn(
          'bg-emerald-50 text-[#1b4332] p-3 rounded-xl w-fit',
          !disabled && 'group-hover:bg-[#1b4332] group-hover:text-white transition-all'
        )}
      >
        <Icon className="h-6 w-6" />
      </div>
      <h3
        className={cn(
          'font-serif text-lg font-bold text-stone-800 mt-4',
          !disabled && 'group-hover:text-[#1b4332]'
        )}
      >
        {title}
      </h3>
      <p className="text-stone-500 text-xs mt-1">{description}</p>
    </>
  );

  if (disabled) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-[#e6ebe3] opacity-75 shadow-sm relative">
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href!}
      className="bg-white p-6 rounded-2xl border border-[#e6ebe3] hover:border-emerald-500 shadow-sm transition-all duration-300 hover:shadow-md group relative"
    >
      {content}
    </Link>
  );
}
