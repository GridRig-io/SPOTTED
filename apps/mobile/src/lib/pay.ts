import { API_URL } from "./env";

/** Payments never happen inside the app. The app asks the website's API for a payment page and opens it in the browser. */
async function call<T>(path: string, token: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  } catch {
    throw new Error("Could not reach Spotted. Check your internet and try again.");
  }
  const j = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(j.error ?? "Something went wrong with the payment.");
  return j;
}

export const startPayment = (token: string, code: string) => call<{ url: string; provider: string }>("/api/pay/initialize", token, { code, source: "app" });
export const verifyPayment = (token: string, code: string, reference?: string) => call<{ status: string }>("/api/pay/verify", token, { code, reference });
export const testConfirm = (token: string, reference: string) => call<{ ok?: boolean }>("/api/pay/test-confirm", token, { reference });
