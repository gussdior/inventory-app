import Sidebar from "@/components/layout/Sidebar";
import DailyReminderBanner from "@/components/DailyReminderBanner";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <main className="flex-1 ml-60 min-h-screen flex flex-col">
        <DailyReminderBanner />
        <div className="max-w-7xl mx-auto w-full px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
