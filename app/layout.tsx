import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter-tight";
import "./globals.css";
import { StudyProvider } from "@/lib/study-store";

export const metadata: Metadata = {
  title: "Stoke — Study, Remember, Focus",
  description:
    "Stoke is a minimal personal study command center: spaced repetition, Pomodoro focus, study planning and progress tracking.",
  icons: { icon: "/logo.jpeg", apple: "/logo.jpeg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

const themeInit = `(function(){try{var t=localStorage.getItem('stoke-theme')||'light';document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='light';}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-full font-sans">
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <StudyProvider>{children}</StudyProvider>
      </body>
    </html>
  );
}
