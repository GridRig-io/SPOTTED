import Link from "next/link";
import { PinMark } from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="container section">
      <div className="empty">
        <PinMark size={72} />
        <h1>We could not spot that page</h1>
        <p className="muted">The link may be old, or the place may no longer be listed.</p>
        <Link href="/" className="btn">Back to Explore</Link>
      </div>
    </div>
  );
}
