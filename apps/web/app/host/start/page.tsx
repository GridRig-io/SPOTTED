import { Suspense } from "react";
import { HostStart } from "@/components/host/HostStart";
export const metadata = { title: "Become a host" };
export default function Page() { return <Suspense fallback={null}><HostStart /></Suspense>; }
