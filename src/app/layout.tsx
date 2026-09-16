import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ControlTaxi — Ingresos, gastos y facturas de tu taxi",
  description:
    "Controla ingresos, gastos y turnos de tu taxi, guarda la documentación y crea facturas con IVA del 10% desde el móvil.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    type: "website",
    title: "ControlTaxi — Ingresos, gastos y facturas de tu taxi",
    description:
      "Controla ingresos, gastos y turnos de tu taxi, guarda la documentación y crea facturas con IVA del 10%.",
  },
  twitter: {
    card: "summary",
    title: "ControlTaxi — Ingresos, gastos y facturas de tu taxi",
    description:
      "Controla ingresos, gastos y turnos de tu taxi, guarda la documentación y crea facturas con IVA del 10%.",
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
      <body className="min-h-full flex flex-col">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}