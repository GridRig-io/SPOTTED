import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "@fontsource/plus-jakarta-sans/800.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "./globals.css";
import { brand, cssVariables, colors } from "@spotted/tokens";
import { AuthProvider } from "@/components/AuthProvider";
import { Footer, Header, TabBar } from "@/components/SiteChrome";

export const metadata: Metadata = {
  title: { default: `${brand.name} · ${brand.tagline}`, template: `%s · ${brand.name}` },
  description: "Find apartments and guest houses in Abuja with the power, water, wifi and security stated plainly before you book.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  openGraph: { title: brand.name, description: brand.tagline, type: "website", locale: "en_NG" },
};
export const viewport: Viewport = { themeColor: colors.forest, width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-NG">
      <head><style dangerouslySetInnerHTML={{ __html: cssVariables() }} /></head>
      <body>
        <AuthProvider>
          <Suspense fallback={<div className="site-header" style={{ height: 65 }} />}><Header /></Suspense>
          <main id="main">{children}</main>
          <Footer />
          <Suspense fallback={null}><TabBar /></Suspense>
        </AuthProvider>
      </body>
    </html>
  );
}
