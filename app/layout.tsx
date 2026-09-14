import type { Metadata, Viewport } from "next";
import "./globals.css";
import AuthProvider from "./components/AuthProvider";
import { SITE_URL } from "./lib/site";

const siteDescription =
  "Track Amazon prices, review recorded price history, and get notified when products reach your target.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "PricePeek",
  title: {
    default: "PricePeek – Amazon Price Tracker",
    template: "%s | PricePeek",
  },
  description: siteDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "PricePeek",
    title: "PricePeek – Amazon Price Tracker",
    description: siteDescription,
  },
  twitter: {
    card: "summary",
    title: "PricePeek – Amazon Price Tracker",
    description: siteDescription,
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PricePeek",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#020617",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
