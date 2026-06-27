import { Sidebar } from '@/components/shared/Sidebar';
import { Header } from '@/components/shared/Header';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-8 pb-12 bg-[#f4f6f3]">{children}</main>
      </div>
    </div>
  );
}
