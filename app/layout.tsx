import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Widget CMS",
  description: "Create and embed website widgets — hero sliders, news, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
