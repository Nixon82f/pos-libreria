import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "POS Librería",
  description: "Punto de venta e inventario para librería de barrio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-stone-50 text-stone-900 antialiased">
        {children}
      </body>
    </html>
  );
}
