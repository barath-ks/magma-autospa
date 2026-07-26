import type { Metadata } from "next";
import { Fraunces, Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "../components/Providers";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Magma Autospa",
  description: "Technical Operations Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-body bg-bg-base text-text-primary selection:bg-accent-copper/30">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
