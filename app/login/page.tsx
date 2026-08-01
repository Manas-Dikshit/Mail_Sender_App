import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import LoginForm from '@/components/LoginForm';

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect('/admin');
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold text-gray-900">Internal Bulk Email Sender</h1>
          <p className="mt-1 text-sm text-gray-500">Sign in to continue</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
