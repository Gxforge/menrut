import type { Metadata, Viewport } from "next";
import { Manrope, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

// preload: false — la app se pinta en el cliente; el título (Manrope) aparece
// después de hidratar y el navegador avisaba de precargas sin usar.
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "MENRUT · Conectamos caminos.",
  description:
    "Encuentra mensajeros que cubran tu ruta en Cuba. Conecta clientes, mensajeros y negocios por origen, destino y confianza verificable.",
  applicationName: "MENRUT",
  manifest: "/menrut/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/menrut/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/menrut/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/menrut/icons/apple-touch-icon.png",
  },
  openGraph: {
    title: "MENRUT · Conectamos caminos.",
    description: "Encuentra mensajeros que cubran tu ruta en Cuba.",
    siteName: "MENRUT",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b2b60",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${manrope.variable} ${inter.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
