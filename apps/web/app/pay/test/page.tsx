import { Suspense } from "react";
import { TestPay } from "./TestPay";

export const metadata = { title: "Test payment" };
export default function Page() {
  return <Suspense fallback={<div className="container section"><div className="skeleton" style={{ height: 240, maxWidth: 480 }} /></div>}><TestPay /></Suspense>;
}
