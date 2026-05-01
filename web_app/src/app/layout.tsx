import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "MNIST Edge Inference | Deep Vision Explorer",
  description: "Real-time, interactive, zero-latency browser-based digit recognition model (CNN) converted to ONNX and deployed on the Edge.",
  keywords: ["MNIST", "Neural Network", "Machine Learning", "ONNX Web", "Edge Inference", "React", "Next.js", "CNN"],
  authors: [{ name: "Obasi Agbai (Longman)" }],
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
    ],
    apple: [
      { url: "/icon.png", type: "image/png" },
    ],
  },
  openGraph: {
    title: "MNIST Edge Inference | Deep Vision Explorer",
    description: "Real-time, interactive, zero-latency browser-based digit recognition model (CNN) converted to ONNX and deployed on the Edge.",
    url: "https://mnist-edge-inference.vercel.app",
    siteName: "MNIST Edge Inference",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "MNIST Edge Inference Dashboard",
      },
    ],
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased bg-neutral-950`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-neutral-950">
        {children}
      </body>
    </html>
  );
}
