import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { getLocale } from "@/lib/i18n";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EmVolt Dashboard",
  description: "Internal dashboard for EmVolt — leads, clients, trainers, calendar, and KPIs.",
};

// Staff fill these forms on phones and tablets, so the on-screen keyboard is
// part of the layout. The browser default (`resizes-visual`) shrinks only the
// visual viewport: a centred `position: fixed` dialog keeps its full-screen
// height, its lower half sits behind the keyboard, and `dvh` doesn't shrink
// either, so a height cap never engages. `resizes-content` shrinks the layout
// viewport instead, which lets the dialog cap itself and scroll to whatever is
// still visible. Zoom is deliberately left enabled.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      className={`dark ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
