import type { Metadata } from "next";
import Image from "next/image";
import "./globals.css";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
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
          <SidebarInset className="h-svh min-w-0 overflow-hidden">
            {/* Mobile top bar: the sidebar becomes a drawer below 768px */}
            <header className="flex h-12 shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-3 md:hidden">
              <SidebarTrigger className="-ml-1" />
              <Image src="/philgeps-logo.png" alt="" width={28} height={28} />
              <span className="text-xs font-semibold tracking-wider text-gray-700 uppercase">PSDBM Open Data</span>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto bg-gray-50 p-3 sm:p-5">
              {children}
            </div>
          </SidebarInset>
        </SidebarProvider>
      </body>
    </html>
  );
}
