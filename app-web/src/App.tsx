import type { PurchaseResponse, SaleStatus, SaleStatusResponse } from '@flash-sale/shared';
import { type FormEvent, useCallback, useEffect, useState } from 'react';

import { attemptPurchase, fetchSaleStatus, hasExistingPurchase } from './api/sale-client.js';

const STATUS_POLL_MS = 4_000;
const USER_ID_STORAGE_KEY = 'flash-sale-user-id';

type Feedback = {
  tone: 'success' | 'error' | 'info';
  message: string;
};

const STATUS_META: Record<SaleStatus, { label: string; badge: string; hint: string }> = {
  upcoming: {
    label: 'Upcoming',
    badge: 'bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/30',
    hint: 'The sale has not started yet. Check back soon.',
  },
  active: {
    label: 'Live',
    badge: 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/40',
    hint: 'Limited stock — one item per customer.',
  },
  ended: {
    label: 'Ended',
    badge: 'bg-zinc-500/20 text-zinc-300 ring-1 ring-zinc-500/40',
    hint: 'This sale window is closed.',
  },
  sold_out: {
    label: 'Sold out',
    badge: 'bg-rose-500/15 text-rose-200 ring-1 ring-rose-400/30',
    hint: 'Everything is gone. Better luck next time.',
  },
};

function purchaseMessage(result: PurchaseResponse): Feedback {
  switch (result.result) {
    case 'success':
      return { tone: 'success', message: 'You got it! Your purchase is confirmed.' };
    case 'already_purchased':
      return { tone: 'info', message: 'You already claimed your item.' };
    case 'sold_out':
      return { tone: 'error', message: 'Sold out — no stock left.' };
    case 'sale_not_active':
      return {
        tone: 'error',
        message: result.saleStatus === 'upcoming' ? 'Sale has not started yet.' : 'Sale has ended.',
      };
  }
}

function feedbackClasses(tone: Feedback['tone']): string {
  switch (tone) {
    case 'success':
      return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100';
    case 'error':
      return 'border-rose-400/30 bg-rose-500/10 text-rose-100';
    case 'info':
      return 'border-sky-400/30 bg-sky-500/10 text-sky-100';
  }
}

export function App() {
  const [status, setStatus] = useState<SaleStatusResponse | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [userId, setUserId] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [hasPriorPurchase, setHasPriorPurchase] = useState(false);

  const refreshStatus = useCallback(async () => {
    try {
      const nextStatus = await fetchSaleStatus();
      setStatus(nextStatus);
      setStatusError(null);
    } catch {
      setStatusError('Unable to reach the sale API.');
    }
  }, []);

  useEffect(() => {
    const savedUserId = localStorage.getItem(USER_ID_STORAGE_KEY);
    if (savedUserId) {
      setUserId(savedUserId);
    }

    void refreshStatus();
    const timer = window.setInterval(() => {
      void refreshStatus();
    }, STATUS_POLL_MS);

    return () => window.clearInterval(timer);
  }, [refreshStatus]);

  useEffect(() => {
    if (!userId.trim()) {
      setHasPriorPurchase(false);
      return;
    }

    let cancelled = false;

    void hasExistingPurchase(userId.trim())
      .then((exists) => {
        if (!cancelled) {
          setHasPriorPurchase(exists);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHasPriorPurchase(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const canPurchase =
    status?.status === 'active' && !isPurchasing && userId.trim().length > 0 && !hasPriorPurchase;

  async function handlePurchase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedUserId = userId.trim();
    if (!trimmedUserId || status?.status !== 'active') {
      return;
    }

    setIsPurchasing(true);
    setFeedback(null);

    try {
      localStorage.setItem(USER_ID_STORAGE_KEY, trimmedUserId);
      const { body } = await attemptPurchase(trimmedUserId);
      setFeedback(purchaseMessage(body));

      if (body.result === 'success') {
        setHasPriorPurchase(true);
      }

      await refreshStatus();
    } catch {
      setFeedback({
        tone: 'error',
        message: 'Purchase failed. Please try again.',
      });
    } finally {
      setIsPurchasing(false);
    }
  }

  const statusMeta = status ? STATUS_META[status.status] : null;

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-10 text-zinc-100 font-sans">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.12),transparent_55%)]" />

      <div className="relative mx-auto w-full max-w-md">
        <header className="mb-8 text-center">
          <p className="mb-2 text-xs uppercase tracking-[0.35em] text-emerald-300/80">Bookipi</p>
          <h1 className="text-4xl font-semibold tracking-tight">Flash Sale</h1>
          <p className="mt-2 text-sm text-zinc-400">One item. One chance. High demand.</p>
        </header>

        <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/70 p-6 shadow-2xl shadow-black/30 backdrop-blur-sm">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-zinc-500">Status</p>
              {statusMeta ? (
                <span
                  className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-medium ${statusMeta.badge}`}
                >
                  {statusMeta.label}
                </span>
              ) : (
                <span className="mt-2 inline-block h-7 w-24 animate-pulse rounded-full bg-zinc-800" />
              )}
            </div>

            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-zinc-500">In stock</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">
                {status ? status.stockRemaining : '—'}
              </p>
            </div>
          </div>

          {statusError ? (
            <p className="mb-4 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {statusError}
            </p>
          ) : null}

          {statusMeta ? (
            <p className="mb-6 text-sm leading-relaxed text-zinc-400">{statusMeta.hint}</p>
          ) : null}

          {hasPriorPurchase ? (
            <p className="mb-6 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              Welcome back — your purchase is already on record for this ID.
            </p>
          ) : null}

          <form className="space-y-4" onSubmit={handlePurchase}>
            <label className="block">
              <span className="mb-2 block text-sm text-zinc-400">Your ID (email or username)</span>
              <input
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950/80 px-4 py-3 text-zinc-100 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20"
                disabled={isPurchasing}
                onChange={(event) => setUserId(event.target.value)}
                placeholder="you@example.com"
                type="text"
                value={userId}
              />
            </label>

            <button
              className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
              disabled={!canPurchase}
              type="submit"
            >
              {isPurchasing ? 'Processing…' : 'Buy now'}
            </button>
          </form>

          {feedback ? (
            <p
              className={`mt-4 rounded-xl border px-4 py-3 text-sm ${feedbackClasses(feedback.tone)}`}
            >
              {feedback.message}
            </p>
          ) : null}
        </section>

        <p className="mt-6 text-center text-xs text-zinc-600">
          Status refreshes every {STATUS_POLL_MS / 1000}s
        </p>
      </div>
    </main>
  );
}
