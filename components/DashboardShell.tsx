'use client';

import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Mail, LayoutGrid, Menu, X } from 'lucide-react';
import SignOutButton from '@/components/SignOutButton';

const NAV_ITEMS = [{ label: 'Campaigns', icon: LayoutGrid, active: true }];

export default function DashboardShell({ userName, children }: { userName: string; children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-primary-100/70 bg-white/60 backdrop-blur-xl lg:flex">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileNavOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileNavOpen(false)}
              className="fixed inset-0 z-40 bg-primary-900/30 backdrop-blur-sm lg:hidden"
              aria-hidden="true"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 340, damping: 34 }}
              className="glass-panel fixed inset-y-0 left-0 z-50 flex w-72 flex-col lg:hidden"
            >
              <button
                onClick={() => setMobileNavOpen(false)}
                aria-label="Close navigation"
                className="absolute right-3 top-3 rounded-full p-1.5 text-primary-500 hover:bg-primary-50"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-h-screen flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 border-b border-primary-100/70 bg-white/70 px-4 py-3.5 backdrop-blur-xl sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open navigation"
                className="rounded-xl2 border border-primary-100 bg-white/80 p-2 text-primary-600 hover:bg-primary-50 lg:hidden"
              >
                <Menu className="h-[18px] w-[18px]" aria-hidden="true" />
              </button>
              <div>
                <h1 className="font-heading text-lg text-primary-900 sm:text-xl">Campaign Dashboard</h1>
                <p className="text-xs text-primary-500 sm:text-sm">Signed in as {userName}</p>
              </div>
            </div>
            <div className="hidden sm:block">
              <SignOutButton />
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>

        <div className="fixed bottom-4 right-4 sm:hidden">
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}

function SidebarContent() {
  return (
    <>
      <div className="flex items-center gap-2.5 border-b border-primary-100/70 px-6 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl2 bg-secondary-500 text-white shadow-soft">
          <Mail className="h-[18px] w-[18px]" aria-hidden="true" />
        </div>
        <div>
          <p className="font-heading text-sm leading-none text-primary-900">Bulk Sender</p>
          <p className="mt-1 text-[11px] uppercase tracking-wide text-primary-400">Internal tool</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-4 py-6">
        {NAV_ITEMS.map(({ label, icon: Icon, active }) => (
          <div
            key={label}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-3 rounded-xl2 px-3.5 py-2.5 text-sm font-semibold transition-colors ${
              active
                ? 'bg-primary-500 text-white shadow-soft'
                : 'text-primary-500 hover:bg-primary-50'
            }`}
          >
            <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
            {label}
          </div>
        ))}
      </nav>

      <div className="border-t border-primary-100/70 px-6 py-5 text-xs text-primary-400">
        2–3 internal users · No public access
      </div>
    </>
  );
}