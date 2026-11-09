import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "سامانه مدیریت پروژه",
  description: "سامانه مدیریت پروژه، اقساط و پرداخت‌ها — فارسی و تقویم جلالی",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        {/*
          Dark mode (polish §3i): tokens are switched by the `.dark` class, and
          this pre-paint script mirrors the OS preference so the first paint is
          already correct. Runs before React hydrates; suppressHydrationWarning
          on <html> covers the class it toggles. No in-app toggle exists — the
          app follows the system setting.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=window.matchMedia("(prefers-color-scheme: dark)");var apply=function(d){document.documentElement.classList.toggle("dark",!!d);};apply(m.matches);m.addEventListener("change",function(e){apply(e.matches);});}catch(e){}})();`,
          }}
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css"
        />
      </head>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
