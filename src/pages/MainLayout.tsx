// MainLayout.tsx
import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import AppSidebar from "../components/layout/AppSideBar";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/students": "Student Records",
  "/students/create": "Add Student Record",
  "/students/recently-deleted": "Recently Deleted",
  "/users": "Users",
  "/users/create": "Add User",
  "/profile": "Profile Details",
  "/profile/change-password": "Change Password",
  "/file-logs": "File Logs",
  "/activity-logs": "Activity Logs",
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