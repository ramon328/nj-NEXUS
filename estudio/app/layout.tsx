import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ForjaGuard } from "../auth/ForjaGuard";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Estudio de Contenido — Drive + IA + Instagram",
  description:
    "Fábrica de contenido: sincroniza videos desde Google Drive, genera captions y planes de edición con IA y publica en Instagram.",
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
        <ForjaGuard>{children}</ForjaGuard>
      </body>
    </html>
  );
}
