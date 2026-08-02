import { auth } from '@/auth';
import ToastProvider from '@/components/Toast';
import DashboardShell from '@/components/DashboardShell';
import Dashboard from '@/components/Dashboard';

export default async function AdminPage() {
  const session = await auth();

  return (
    <ToastProvider>
      <DashboardShell userName={session?.user?.name ?? 'Admin'}>
        <Dashboard />
      </DashboardShell>
    </ToastProvider>
  );
}