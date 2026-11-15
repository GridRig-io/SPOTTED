import { Suspense } from "react";
import { HostDashboard } from "@/components/host/HostDashboard";
export const metadata = { title: "Host dashboard" };
export default function Page() { return <Suspense fallback={null}><HostDashboard /></Suspense>; }
