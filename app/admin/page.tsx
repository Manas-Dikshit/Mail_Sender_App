import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import ToastProvider from '@/components/Toast';
import SignOutButton from '@/components/SignOutButton';
import Dashboard from '@/components/Dashboard';

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  return (
    <ToastProvider>
      <main className="min-h-screen">
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Internal Bulk Email Sender</h1>
              <p className="text-sm text-gray-500">Signed in as {session?.user?.name}</p>
            </div>
            <SignOutButton />
          </div>
        </header>

        <div className="mx-auto max-w-4xl px-4 py-6">
          <Dashboard />
        </div>
      </main>
    </ToastProvider>
  );
}
