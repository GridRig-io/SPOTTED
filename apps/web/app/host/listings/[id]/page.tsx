import { Suspense } from "react";
import { ListingEditor } from "@/components/host/ListingEditor";
export const metadata = { title: "Edit listing" };

export default function Page({ params }: PageProps<"/host/listings/[id]">) {
  return <Suspense fallback={<div className="container section"><div className="skeleton" style={{ height: 400 }} /></div>}><Inner params={params} /></Suspense>;
}
async function Inner({ params }: { params: PageProps<"/host/listings/[id]">["params"] }) {
  const { id } = await params;
  return <ListingEditor id={id} />;
}
