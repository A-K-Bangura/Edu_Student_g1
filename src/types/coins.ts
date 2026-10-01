// Vybe Coins (Round 5) — a second reward currency, separate from XP.
// See docs/STUDENT_API_PAYLOADS.md §66-69 and docs/STUDENT_FRONTEND_API_CHANGES.md Round 5.

export interface CoinBalance {
  available: number;
  reserved: number;
  redeemed: number;
  total_earned: number;
}

export interface ExchangeRate {
  coins: number;
  leones: number;
  currency: string;
}

export interface Wallet {
  balance: CoinBalance;
  exchange: {
    /** false until an admin has set a rate — show "Exchange coming soon" */
    available: boolean;
    payout_method: string;
    rate: ExchangeRate | null;
    min_exchange_coins: number | null;
  };
  open_exchanges_count: number;
}

export type CoinTransactionType =
  | "course_reward"
  | "exchange_reserve"
  | "exchange_release"
  | "exchange_redeem";

export interface CoinTransaction {
  id: string;
  type: CoinTransactionType;
  direction: "credit" | "debit" | "neutral";
  amount: number;
  available_delta: number;
  reserved_delta: number;
  redeemed_delta: number;
  balance_after: CoinBalance;
  description: string;
  course: { id: number; title: string; slug: string } | null;
  exchange: {
    id: string;
    status: string;
    coins: number;
    leone_amount: number;
    currency: string;
  } | null;
  created_at: string;
}

/**
 * This endpoint's pagination is a sibling `{data, meta}` shape, distinct from
 * `PaginatedResponse<T>` (types/index.ts), which models the raw Laravel
 * paginator used by courses/feed/enrolled-courses.
 */
export interface PageMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

export interface CoinTransactionList {
  data: CoinTransaction[];
  meta: PageMeta;
}

export type ExchangeStatus =
  | "pending"
  | "processing"
  | "completed"
  | "rejected"
  | "failed";

export interface CoinExchange {
  id: string;
  coins: number;
  /** Frozen at the moment of the request — a later admin rate change never alters this. */
  rate: { coins: number; leones: number };
  leone_amount: number;
  currency: string;
  payout_method: string;
  mobile_money_number: string;
  status: ExchangeStatus;
  coins_reserved: boolean;
  rejection_reason: string | null;
  payout_reference: string | null;
  processed_at: string | null;
  created_at: string;
  history: Array<{ status: string; at: string }>;
}

export interface SubmitExchangeResult {
  exchange: CoinExchange;
  balance: CoinBalance;
  idempotent_replay: boolean;
}

export interface ExchangeList {
  data: CoinExchange[];
  meta: PageMeta;
}

/** Only present on POST .../progress when that request completes a paid course with a reward. */
export interface CoinsAwarded {
  amount: number;
  balance: CoinBalance;
}
