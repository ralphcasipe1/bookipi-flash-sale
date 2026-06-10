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
    badge: 'bg-amber-100 text-amber-800 ring-2 ring-amber-200',
    hint: 'The sale has not started yet. Check back soon.',
  },
  active: {
    label: 'Live',
    badge: 'bg-emerald-100 text-emerald-800 ring-2 ring-emerald-200',
    hint: 'Limited stock — one item per customer.',
  },
  ended: {
    label: 'Ended',
    badge: 'bg-stone-200 text-stone-600 ring-2 ring-stone-300',
    hint: 'This sale window is closed.',
  },
  sold_out: {
    label: 'Sold out',
    badge: 'bg-rose-100 text-rose-800 ring-2 ring-rose-200',
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
      return 'border-emerald-300 bg-emerald-50 text-emerald-800';
    case 'error':
      return 'border-rose-300 bg-rose-50 text-rose-800';
    case 'info':
      return 'border-sky-300 bg-sky-50 text-sky-800';
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
    <main className="min-h-screen bg-[#faf6f0] px-4 py-10 text-stone-700">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(254,215,170,0.45),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(167,243,208,0.25),transparent_50%)]" />

      <div className="relative mx-auto w-full max-w-md">
        <header className="mb-8 text-center">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.35em] text-teal-700/80">
            Bookipi
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight text-stone-800">Flash Sale</h1>
          <p className="mt-2 text-sm text-stone-500">One item. One chance. High demand.</p>
        </header>

        <section className="rounded-3xl border-2 border-amber-200/80 bg-white/85 p-6 shadow-lg shadow-amber-900/8 backdrop-blur-sm">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-stone-400">Status</p>
              {statusMeta ? (
                <span
                  className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-bold ${statusMeta.badge}`}
                >
                  {statusMeta.label}
                </span>
              ) : (
                <span className="mt-2 inline-block h-7 w-24 animate-pulse rounded-full bg-amber-100" />
              )}
            </div>

            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-wider text-stone-400">In stock</p>
              <p className="mt-1 text-3xl font-extrabold tabular-nums text-teal-700">
                {status ? status.stockRemaining : '—'}
              </p>
            </div>
          </div>

          {statusError ? (
            <p className="mb-4 rounded-2xl border-2 border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {statusError}
            </p>
          ) : null}

          {statusMeta ? (
            <p className="mb-6 text-sm leading-relaxed text-stone-500">{statusMeta.hint}</p>
          ) : null}

          {hasPriorPurchase ? (
            <p className="mb-6 rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Welcome back — your purchase is already on record for this ID.
            </p>
          ) : null}

          <form className="space-y-4" onSubmit={handlePurchase}>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-stone-500">
                Your ID (email or username)
              </span>
              <input
                className="box-border w-full rounded-2xl border-2 border-amber-200 bg-amber-50/50 px-4 py-3 text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                disabled={isPurchasing}
                onChange={(event) => setUserId(event.target.value)}
                placeholder="you@example.com"
                type="text"
                value={userId}
              />
            </label>

            <button
              className="box-border w-full rounded-2xl border-b-4 border-teal-700 bg-teal-500 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-teal-400 active:translate-y-0.5 active:border-b-2 disabled:cursor-not-allowed disabled:border-stone-400 disabled:bg-stone-300 disabled:text-stone-500 disabled:active:translate-y-0"
              disabled={!canPurchase}
              type="submit"
            >
              {isPurchasing ? 'Processing…' : 'Buy now'}
            </button>
          </form>

          {feedback ? (
            <p
              className={`mt-4 rounded-2xl border-2 px-4 py-3 text-sm ${feedbackClasses(feedback.tone)}`}
            >
              {feedback.message}
            </p>
          ) : null}
        </section>

        <p className="mt-6 text-center text-xs text-stone-400">
          Status refreshes every {STATUS_POLL_MS / 1000}s
        </p>
      </div>
    </main>
  );
}
