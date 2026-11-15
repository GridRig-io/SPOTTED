import { Suspense } from "react";
import { AdminReview } from "@/components/host/AdminReview";
export const metadata = { title: "Review listings", robots: { index: false } };
export default function Page() { return <Suspense fallback={null}><AdminReview /></Suspense>; }
