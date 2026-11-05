import type { Metadata } from "next";
import "./globals.css";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/app-sidebar";

export const metadata: Metadata = {
  title: "PSDBM Open Data Portal",
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
    >
      <body className="min-h-full flex flex-col">
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
          <div className="bg-gray-200 h-screen overflow-y-scroll p-3">
            {children}
          </div>
        </SidebarInset>
        </SidebarProvider>
      </body>
    </html>
  );
}
