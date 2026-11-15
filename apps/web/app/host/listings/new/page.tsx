import { Suspense } from "react";
import { NewListing } from "@/components/host/NewListing";
export const metadata = { title: "Add a place" };
export default function Page() { return <Suspense fallback={null}><NewListing /></Suspense>; }
