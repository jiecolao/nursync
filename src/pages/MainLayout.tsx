import { Outlet, useLocation, useNavigate, matchPath } from "react-router-dom";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import AppSidebar from "../components/layout/AppSideBar";
import { Undo2 } from "lucide-react";
import { DialogBox } from "@/components/layout/DialogBox";
import { useState } from "react";

export const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/directory": "Directory",
  "/students": "Student Records",
  "/students/profile/:studentUuid": "Student Profile",
  "/add-student": "Add Student Record",
  "/trash": "Trash",
  "/system-users": "System Users",
  "/file-logs": "File History",
  "/activity-logs": "Activity Log",
  "/my-account": "My Account",
  "/help": "Help",
};

// Helper function to resolve the title using matchPath
function getPageTitle(pathname: string): string {
  // 1. First try an exact key lookup for performance
  if (pageTitles[pathname]) {
    return pageTitles[pathname];
  }

  // 2. Fall back to checking pattern matches
  const matchedPattern = Object.keys(pageTitles).find((pattern) =>
    matchPath({ path: pattern, end: true }, pathname)
  );

  return matchedPattern ? pageTitles[matchedPattern] : "Dashboard";
}

export default function MainLayout() {
  const [isOpen, setIsOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // Resolve page title dynamically
  const pageTitle = getPageTitle(pathname);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col flex-1 min-h-screen min-w-0 w-full">
        <header className="flex h-14 items-center gap-4 border-b bg-background px-6">
          <SidebarTrigger className="cursor-pointer text-muted-foreground transition-all duration-200 hover:scale-110 hover:text-primary hover:drop-shadow-sm hover:bg-transparent" />
          <div className="font-bold text-sm text-primary">{pageTitle}</div>

          {pageTitle === "Dashboard" && (
            <Undo2
              className="size-5 ml-auto cursor-pointer text-muted-foreground transition-all duration-200 hover:scale-110 hover:text-primary hover:drop-shadow-sm"
              onClick={() => navigate("/login")}
            />
          )}

          {pageTitle === "Student Profile" && (
            <Undo2
              className="size-5 ml-auto cursor-pointer text-muted-foreground transition-all duration-200 hover:scale-110 hover:text-primary hover:drop-shadow-sm"
              onClick={() => setIsOpen(true)}
            />
          )}

          {pathname.startsWith("/students/profile") && (
            <DialogBox
              title="Proceed?"
              open={isOpen}
              onOpenChange={setIsOpen}
              onClick={() => navigate("/students")}
              yesBtnName="Discard"
              yesBtnStyle="bg-red-700 hover:bg-red-600"
            >
              <p>If you leave this page, any unsaved changes will be lost.</p>
            </DialogBox>
          )}
          
          {pageTitle === "Help" && (
            <Undo2
              className="size-5 ml-auto cursor-pointer text-muted-foreground transition-all duration-200 hover:scale-110 hover:text-primary hover:drop-shadow-sm"
              onClick={() => setIsOpen(true)}
            />
          )}
          
          {pathname === "/help" && (
            <DialogBox
              title="Discard input?"
              open={isOpen}
              onOpenChange={setIsOpen}
              onClick={() => navigate("/students")}
              yesBtnName="Discard"
              yesBtnStyle="bg-red-700 hover:bg-red-600"
            >
              <p>If you leave this page, the information you entered won't be saved.</p>
            </DialogBox>
          )}
        </header>

        <main className="flex-1 min-w-0 w-full max-w-full px-6 py-5 overflow-x-auto">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}