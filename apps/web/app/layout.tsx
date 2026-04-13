import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { headers } from "next/headers";
import { AppShell } from "@/components/app-shell";
import { AuditWorkspaceProvider } from "@/components/audit-workspace";
import { ThemeProvider } from "@/components/theme-provider";
import { getInitialThemeFromCookie } from "@/lib/theme-cookie";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Drift Scan",
  description: "A private lifestyle inflation audit for recent income changes.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true
    }
  }
};

const themeInitScript = `
(function() {
  try {
    var savedTheme = window.localStorage.getItem("drift.theme");
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var isDark = savedTheme === "dark" || (!savedTheme && prefersDark);
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  } catch (error) {}
})();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestHeaders = await headers();
  const initialTheme = getInitialThemeFromCookie(requestHeaders.get("cookie"));
  const isInitiallyDark = initialTheme === "dark";

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased${isInitiallyDark ? " dark" : ""}`}
      style={{ colorScheme: isInitiallyDark ? "dark" : "light" }}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <Script
          id="drift-theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
        <ThemeProvider>
          <AuditWorkspaceProvider>
            <AppShell>{children}</AppShell>
          </AuditWorkspaceProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
