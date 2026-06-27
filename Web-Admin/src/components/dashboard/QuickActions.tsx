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
  ArrowUpRight,
} from 'lucide-react';
import { type User } from '@/store/auth';
import { cn } from '@/lib/cn';

interface QuickAction {
  href?: string;
  icon: LucideIcon;
  title: string;
  description: string;
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
      description: 'Cấu hình định mức phát thải CO₂ cho các nguyên vật liệu canh tác.',
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
      description: 'Khai báo vụ mùa nông sản, ghi chép nhật ký và đóng vụ mùa.',
    },
  ],
  WAREHOUSE_KEEPER: [
    {
      icon: Package,
      title: 'Nhập xuất vật tư',
      description: 'Lập phiếu kho phân đạm, hạt giống, hóa đơn nhà cung cấp.',
      badge: 'Phase 3',
    },
    {
      icon: TrendingUp,
      title: 'Cảnh báo hết hạn',
      description: 'Cảnh báo vật tư nông nghiệp gần hết hạn sử dụng.',
      badge: 'Phase 3',
    },
  ],
  GOV_VIEWER: [
    {
      icon: BarChart3,
      title: 'Thống kê phát thải vĩ mô',
      description: 'Xem bản đồ phát thải carbon vùng và xuất báo cáo.',
      badge: 'Phase 5',
    },
  ],
};

interface QuickActionsProps {
  role: User['role'];
}

export function QuickActions({ role }: QuickActionsProps) {
  const actions = QUICK_ACTIONS[role];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-stone-800 tracking-tight">Bàn làm việc của bạn</h2>

      {!actions || actions.length === 0 ? (
        <div className="bg-[#f8faf8]/80 p-8 rounded-3xl text-center">
          <p className="text-sm text-stone-500 font-medium">Chưa có thao tác nhanh cho vai trò này.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
        <span className="absolute top-5 right-5 bg-amber-50 text-amber-700 text-[10px] font-semibold px-2.5 py-0.5 rounded-full tracking-wide">
          {badge}
        </span>
      )}
      <div
        className={cn(
          'p-3 rounded-2xl w-fit',
          disabled
            ? 'bg-stone-100 text-stone-400'
            : 'bg-emerald-50 text-[#1b4332]'
        )}
      >
        <Icon className="h-6 w-6" strokeWidth={1.8} />
      </div>
      <h3
        className={cn(
          'text-[15px] font-bold text-stone-800 mt-5'
        )}
      >
        {title}
      </h3>
      <p className="text-stone-500 text-[13px] mt-1.5 leading-relaxed">{description}</p>
      {!disabled && (
        <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-emerald-700">
          Mở
          <ArrowUpRight className="h-3.5 w-3.5" />
        </div>
      )}
    </>
  );

  if (disabled) {
    return (
      <div className="bg-[#fcfdfc] p-6 rounded-xl opacity-65 relative shadow-[0_4px_24px_rgba(0,0,0,0.005)]">
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href!}
      className="bg-white p-6 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.015)] relative block"
    >
      {content}
    </Link>
  );
}
