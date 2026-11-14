import { Suspense } from "react";
import { BookingView } from "./BookingView";

export const metadata = { title: "Your booking" };
export default function Page({ params }: PageProps<"/booking/[code]">) {
  return <Suspense fallback={<div className="container section"><div className="skeleton" style={{ height: 320 }} /></div>}><Inner params={params} /></Suspense>;
}
async function Inner({ params }: { params: PageProps<"/booking/[code]">["params"] }) {
  const { code } = await params;
  return <BookingView code={code} />;
}
