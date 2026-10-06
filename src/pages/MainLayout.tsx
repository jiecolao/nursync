// MainLayout.tsx
import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import AppSidebar from "../components/layout/AppSideBar";

export default function MainLayout() {
  return (
    <SidebarProvider>
      <AppSidebar/>
      <SidebarInset className="flex flex-col flex-1 min-h-screen">
        {/* Top Navbar / Header */}
        <header className="flex h-14 items-center gap-4 border-b bg-background px-6">
          <SidebarTrigger />
          <div className="font-medium text-sm">Dashboard</div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}