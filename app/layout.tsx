import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Open Data — Regional Budget Dashboard",
  description:
    "Explore yearly regional budget allocation data across the Philippines.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      // className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
