import { Suspense } from "react";
import { Checkout } from "./Checkout";

export const metadata = { title: "Checkout" };
export default function Page({ params }: PageProps<"/checkout/[code]">) {
  return <Suspense fallback={<div className="container section"><div className="skeleton" style={{ height: 320 }} /></div>}><Inner params={params} /></Suspense>;
}
async function Inner({ params }: { params: PageProps<"/checkout/[code]">["params"] }) {
  const { code } = await params;
  return <Checkout code={code} />;
}
