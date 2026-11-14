import type { PaymentProviderName } from "../types";

export interface InitializeInput {
  reference: string;
  amountNgn: number;
  email: string;
  name?: string | null;
  phone?: string | null;
  callbackUrl: string;           // where the guest lands after paying
  description: string;
  metadata?: Record<string, string>;
}
export interface InitializeResult { url: string; providerReference?: string }

export interface VerifyResult {
  paid: boolean;
  amountNgn: number;
  reference: string;
  raw: unknown;
}

/** Every gateway implements this. The rest of the code never mentions a specific gateway. */
export interface PaymentProvider {
  name: PaymentProviderName;
  initialize(input: InitializeInput): Promise<InitializeResult>;
  /** Ask the gateway directly. Never trust a redirect or a request body as proof of payment. */
  verify(reference: string): Promise<VerifyResult>;
  /** Returns the payment reference if the webhook is genuine and says "paid", otherwise null. Throws on bad signature. */
  parseWebhook(rawBody: string, headers: Headers): { reference: string } | null;
}
