import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "StudyBuddy - Talk Your Way to SAT Vocab Mastery",
    template: "%s | StudyBuddy",
  },
  description:
    "Master SAT vocabulary with voice-based testing. Review flashcards, speak definitions, and get instant AI-powered feedback with smart spaced repetition.",
  keywords: [
    "SAT",
    "vocabulary",
    "study",
    "flashcards",
    "voice",
    "AI",
    "education",
    "spaced repetition",
    "test prep",
    "SAT prep",
  ],
  authors: [{ name: "StudyBuddy" }],
  creator: "StudyBuddy",
  publisher: "StudyBuddy",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"),
  openGraph: {
    title: "StudyBuddy - Talk Your Way to SAT Vocab Mastery",
    description:
      "Master SAT vocabulary with voice-based testing and AI-powered feedback.",
    type: "website",
    locale: "en_US",
    siteName: "StudyBuddy",
  },
  twitter: {
    card: "summary_large_image",
    title: "StudyBuddy - Talk Your Way to SAT Vocab Mastery",
    description:
      "Master SAT vocabulary with voice-based testing and AI-powered feedback.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        layout: {
          unsafe_disableDevelopmentModeWarnings: true,
        },
      }}
    >
      <html lang="en" suppressHydrationWarning>
        <head>
          {/* PWA Meta Tags */}
          <meta name="application-name" content="StudyBuddy" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          <meta name="apple-mobile-web-app-title" content="StudyBuddy" />
          <meta name="format-detection" content="telephone=no" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="theme-color" content="#2563eb" />
        </head>
        <body className={inter.className} suppressHydrationWarning>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
