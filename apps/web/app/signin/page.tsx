import { Suspense } from "react";
import { SignInForm } from "./SignInForm";

export const metadata = { title: "Sign in" };
export default function Page() {
  return <Suspense fallback={<div className="container section"><div className="skeleton" style={{ height: 360, maxWidth: 440 }} /></div>}><SignInForm /></Suspense>;
}
