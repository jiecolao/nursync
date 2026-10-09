// MainLayout.tsx
import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import AppSidebar from "../components/layout/AppSideBar";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/directory": "Directory",
  "/students": "Student Records",
  "/trash": "Trash",
  "/system-users": "System Users",
  "/file-logs": "File History",
  "/activity-logs": "Activity Log",
  "/profile": "Profile Details",
  "/help": "Help",
};

export default function MainLayout() {
  const { pathname } = useLocation();
  const pageTitle = pageTitles[pathname] ?? "Dashboard";

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col flex-1 min-h-screen min-w-0 w-full">
        <header className="flex h-14 items-center gap-4 border-b bg-background px-6">
          <SidebarTrigger />
          <div className="font-bold text-sm text-primary">{pageTitle}</div>
        </header>

        <main className="flex-1 min-w-0 w-full max-w-full px-6 py-5 overflow-x-auto">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}