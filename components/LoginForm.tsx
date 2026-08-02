'use client';

import { useState, FormEvent } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/lib/cn';

function FloatingField({
  id,
  label,
  type,
  value,
  onChange,
  icon: Icon,
  autoComplete,
  trailing,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  icon: typeof User;
  autoComplete: string;
  trailing?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  const floated = focused || value.length > 0;

  return (
    <div className="relative">
      <Icon
        className={cn(
          'pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 transition-colors',
          floated ? 'text-secondary-500' : 'text-primary-300'
        )}
        aria-hidden="true"
      />
      <input
        id={id}
        name={id}
        type={type}
        required
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="peer block w-full rounded-xl2 border-2 border-primary-100 bg-white/80 px-10 pb-2.5 pt-5 text-sm text-primary-900 shadow-soft outline-none transition focus:border-secondary-400"
      />
      <label
        htmlFor={id}
        className={cn(
          'pointer-events-none absolute left-10 transition-all duration-200',
          floated ? 'top-2 text-[11px] font-semibold uppercase tracking-wide text-secondary-600' : 'top-1/2 -translate-y-1/2 text-sm text-primary-400'
        )}
      >
        {label}
      </label>
      {trailing && <div className="absolute right-3 top-1/2 -translate-y-1/2">{trailing}</div>}
    </div>
  );
}

export default function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = await signIn('credentials', {
      username,
      password,
      redirect: false,
    });

    setSubmitting(false);

    if (result?.error) {
      setError('Invalid username or password.');
      return;
    }

    router.push('/admin');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            role="alert"
            className="flex items-center gap-2 overflow-hidden rounded-xl2 border border-primary-200 bg-primary-50 px-3.5 py-2.5 text-sm text-primary-800"
          >
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <FloatingField
        id="username"
        label="Username"
        type="text"
        value={username}
        onChange={setUsername}
        icon={User}
        autoComplete="username"
      />

      <FloatingField
        id="password"
        label="Password"
        type={showPassword ? 'text' : 'password'}
        value={password}
        onChange={setPassword}
        icon={Lock}
        autoComplete="current-password"
        trailing={
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="rounded-md p-1 text-primary-400 hover:bg-primary-50 hover:text-primary-700"
          >
            {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
          </button>
        }
      />

      <Button type="submit" loading={submitting} className="w-full group" size="lg">
        {submitting ? 'Signing in\u2026' : 'Sign in'}
        {!submitting && (
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        )}
      </Button>
    </form>
  );
}