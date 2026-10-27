import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

// Configuración de vista y comportamiento móvil / PWA
export const viewport: Viewport = {
  themeColor: "#07833F",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

// Metadatos y Open Graph completos
export const metadata: Metadata = {
  metadataBase: new URL("https://capellania-confirma-ops.vercel.app"),
  title: {
    default: "Capellanía Ops",
    template: "%s | Capellanía Ops",
  },
  description:
    "Sistema de supervisión logística en tiempo real y listas de verificación para jornadas pastorales.",
  applicationName: "Capellanía Ops",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Capellanía Ops",
  },
  openGraph: {
    title: "Capellanía!",
    description:
      "Trazabilidad operativa, verificación de cajas y coordinación de jornadas.",
    url: "https://capellania-confirma-ops.vercel.app",
    siteName: "Capellanía Ops",
    locale: "es_PE",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#F4F3EF] text-[#211B20]">
        {children}
      </body>
    </html>
  );
}