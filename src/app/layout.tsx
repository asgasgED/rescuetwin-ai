import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RescueTwin AI | SYNAPSE",
  description:
    "Explora escenarios de cierre de vías en Catacaos, calcula rutas alternativas y genera planes de preparación familiar.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
