import { redirect } from 'next/navigation';
import { Mail, ShieldCheck, Gauge, FileSpreadsheet } from 'lucide-react';
import { auth } from '@/auth';
import LoginForm from '@/components/LoginForm';

const HIGHLIGHTS = [
  { icon: ShieldCheck, text: 'Four-stage local email validation, no third-party lookups' },
  { icon: Gauge, text: 'Rate-limited sending tuned safely under Zoho\u2019s SMTP limits' },
  { icon: FileSpreadsheet, text: 'Full Excel, CSV, HTML, JSON and log reports for every run' },
];

export default async function LoginPage() {
  const session = await auth();
  if (session) {
    redirect('/admin');
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" />
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-accent-200/50 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-secondary-200/40 blur-3xl" />

      <div className="relative grid w-full max-w-4xl overflow-hidden rounded-xl3 shadow-lifted md:grid-cols-2">
        {/* Brand / highlights panel */}
        <div className="hidden flex-col justify-between bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 p-10 text-canvas-soft md:flex">
          <div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl2 bg-white/10 backdrop-blur">
              <Mail className="h-5 w-5" aria-hidden="true" />
            </div>
            <h1 className="mt-6 font-heading text-3xl leading-tight">
              Internal Bulk
              <br /> Email Sender
            </h1>
            <p className="mt-3 max-w-xs text-sm text-primary-100/80">
              A focused internal tool for validating and sending campaigns through Zoho Mail.
            </p>
          </div>

          <ul className="space-y-4">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm text-primary-100/90">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* Form panel */}
        <div className="glass-panel flex flex-col justify-center p-8 sm:p-10">
          <div className="mb-8 text-center md:text-left">
            <h2 className="text-xl font-semibold text-primary-900">Welcome back</h2>
            <p className="mt-1 text-sm text-primary-500">Sign in with your administrator account.</p>
          </div>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}