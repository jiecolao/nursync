import { Outlet, useLocation, useNavigate, matchPath } from "react-router-dom";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import AppSidebar from "../components/layout/AppSideBar";
import { Undo2 } from "lucide-react";
import { DialogBox } from "@/components/layout/DialogBox";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import Shepherd from "shepherd.js";
import "shepherd.js/dist/css/shepherd.css";
import { useAuth } from "@/components/auth/ProtectedRoute";

export const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/students": "Student Records",
  
  "/records/": "Students",
  "/records/:batchNo": "Batch",
  "/records/NON-GRADUATE": "Batch",
  "/records/:batchNo/:studentUuid": "Student Profile",
  "/records/NON-GRADUATE/:studentUuid": "Student Profile",

  "/trash": "Trash",
  "/student-archive": "Student Archive",
  "/student-archive/:studentUuid": "Student Archive",
  "/system-users": "System Users",
  "/system-users/:userId": "User Profile",
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

type TourStep = {
  title: string;
  text: string;
  selector?: string;
};

export default function MainLayout() {
  const [isOpen, setIsOpen] = useState(false);
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(search);
    if (params.get("tour") !== "1" || pathname === "/help") return;
    const requiredPermission: Record<string, string> = {
      "/directory": "students_read", "/students": "students_read", "/trash": "students_read",
      "/system-users": "user_read", "/file-logs": "logs_read", "/activity-logs": "logs_read",
    };
    const permission = requiredPermission[pathname];
    if (permission && !user?.permissions?.[permission]) {
      navigate(pathname, { replace: true });
      return;
    }
    const storageKey = `nursync-tour-completed:${pathname}`;
    const pageName = pageTitles[pathname] ?? "NurSync";
    const routeLink = `a[href="${pathname}"]`;
    const commonSteps: TourStep[] = [
      { title: `${pageName} navigation`, text: `This is the ${pageName} tab in the Nursync sidebar. Use it to return to this module whenever you need it.`, selector: routeLink },
      { title: "Find what you need", text: "Use the page's search field to narrow the list by a name, identifier, or keyword.", selector: '[data-tour="table-search"]' },
      { title: "Review the results", text: "Your records appear here. Column headings can often be used to sort results, and the controls below help you move between pages.", selector: '[data-tour="table-results"]' },
      { title: "More tools", text: "Use the available date filters, column options, and export actions to tailor or download the information shown.", selector: '[data-tour="table-tools"]' },
    ];
    const pageSteps: Record<string, TourStep[]> = {
      "/dashboard": [
        { title: "Dashboard", text: "Review student and document totals, then use recent activity to see the latest file changes.", selector: '#main' },
        { title: "Student and document overview", text: "These cards summarize student totals, graduation groups, and document categories available to your account.", selector: '#dashboard-cards' },
        { title: "Recent activity", text: "Review the latest file changes here. Search the table or use its date filter to find a specific event.", selector: '#recent-table' },
        { title: "Explore the activity table", text: "Use the table to inspect events, sort columns, move between pages, and export the visible data.", selector: '#recent-table' },
      ],
      "/records": [
        { title: "Student Records", text: "Browse the student document directory, open folders, search files, and use the available file actions.", selector: '#main' },
        { title: "Browse student folders", text: "Open a folder to browse its files. Use the Database breadcrumb or path segments to move back to an earlier location.", selector: '#students-page' },
        { title: "Navigate the directory", text: "Use Database to return to the root, or select a breadcrumb segment to jump to that folder.", selector: '#students-breadcrumb' },
        { title: "Search the directory", text: "Search for files and folders by name, then switch between grid and list views to change how results are displayed.", selector: '[aria-label="Search files and folders"]' },
        { title: "Import student data", text: "Import either student records from a structured CSV or spreadsheet, or student documents from a folder. Choose the workflow that matches what you are importing.", selector: '#students-import' },
      ],
      "/trash": [
        { title: "Trash", text: "Review deleted student documents here, restore them when needed, or permanently remove them.", selector: '#main' },
        { title: "Find a deleted document", text: "Search by filename, path, student, or category to locate a deleted document.", selector: '#trash-search' },
        { title: "Trash actions", text: "Refresh the list to retrieve the latest changes. Restore a document when it should return to active storage, or empty Trash to permanently remove all deleted documents.", selector: '#trash-actions' },
      ],
      "/student-archive": [
        { title: "Student Archive", text: "Review inactive student records and either reactivate them or permanently delete them.", selector: '#main' },
        { title: "Archived students", text: "This table lists inactive student records and their profile information.", selector: '#archive-table' },
        { title: "Search archived students", text: "Search the table to find an inactive student by the available record details.", selector: '[data-tour="table-search"]' },
        { title: "Archive actions", text: "Use Reactivate to return a student to the active records, or Permanently Delete to remove the record and its data. Permanent deletion cannot be undone.", selector: '#archive-table' },
        { title: "Table tools", text: "Use the table controls to sort, choose visible columns, move between pages, or export the archive.", selector: '[data-tour="table-tools"]' },
      ],
      "/system-users": [
        { title: "System Users", text: "Review user accounts, roles, and access details here. Only authorized users can manage this area.", selector: '#main' },
        { title: "Find an account", text: "Search the list to locate a user account by the information available in the table.", selector: '[data-tour="table-search"]' },
        { title: "Review user access", text: "Review the account details and assigned role before making access changes.", selector: '[data-tour="table-results"]' },
        { title: "Table tools", text: "Use the available table controls to refine, sort, or export the account list.", selector: '[data-tour="table-tools"]' },
      ],
      "/file-logs": [
        { title: "File History tab", text: "This tab records file-related changes across the system, including who made a change and when.", selector: routeLink },
        { title: "Search file events", text: "Search by user, student, action, or file details to narrow down events.", selector: '[data-tour="table-search"]' },
        { title: "Read an event", text: "Use the event columns and timestamps to understand what changed and when.", selector: '[data-tour="table-results"]' },
        { title: "Filter or export", text: "Use date filters and export tools to focus on a time period or save the results.", selector: '[data-tour="table-tools"]' },
      ],
      "/activity-logs": [
        { title: "Activity Log tab", text: "This tab records broader system activity, such as account and administrative actions.", selector: routeLink },
        { title: "Find an activity", text: "Search for a user or action to narrow down the activity entries.", selector: '[data-tour="table-search"]' },
        { title: "Review the event details", text: "Read the action and timestamp columns to help investigate unexpected behavior.", selector: '[data-tour="table-results"]' },
        { title: "Use table controls", text: "Sort columns, move through result pages, or export the activity list where available.", selector: '[data-tour="table-tools"]' },
      ],
      "/my-account": [
        { title: "My Account tab", text: "This is your personal account area.", selector: '#main' },
        { title: "Review your information", text: "Review the profile details and settings shown on this page.", selector: '#account-info' },
        { title: "Account settings", text: "You can edit your personal information or change your password.", selector: '#account-settings' },
      ],
    };
    const steps = pageSteps[pathname] ?? commonSteps;
    const tour = new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        cancelIcon: { enabled: true },
        scrollTo: { behavior: "smooth", block: "center" },
        classes: "nursync-tour",
        modalOverlayOpeningPadding: 8,
        modalOverlayOpeningRadius: 12,
      },
    });
    const availableSteps = steps.filter((step) => {
      if (!step.selector) return true;
      return Boolean(document.querySelector(step.selector));
    });
    const tourSteps = availableSteps.length ? availableSteps : [
      { title: `Welcome to ${pageName}`, text: `Explore the ${pageName} page and the controls available to your account.` },
    ];
    tourSteps.forEach((step, index) => tour.addStep({
      title: step.title,
      text: step.text,
      ...(step.selector ? { attachTo: { element: step.selector, on: "bottom" as const } } : {}),
      buttons: [
        { text: "Exit tour", action: () => tour.cancel(), classes: "nursync-tour__button nursync-tour__button--quiet" },
        ...(index > 0 ? [{ text: "Previous", action: () => tour.back(), secondary: true, classes: "nursync-tour__button nursync-tour__button--secondary" }] : []),
        { text: index === tourSteps.length - 1 ? "Finish tour" : "Next step", action: () => tour.next(), classes: "nursync-tour__button nursync-tour__button--primary" },
      ],
    }));
    tour.on("complete", () => {
      try { window.localStorage.setItem(storageKey, "true"); } catch { /* storage may be unavailable */ }
      navigate(pathname, { replace: true });
    });
    let isCleaningUp = false;
    tour.on("cancel", () => {
      if (!isCleaningUp) navigate(pathname, { replace: true });
    });
    tour.start();
    return () => {
      // StrictMode runs an effect setup/cleanup cycle on mount in development.
      // Do not let that internal cancellation consume the ?tour=1 request.
      isCleaningUp = true;
      if (tour.isActive()) tour.cancel();
    };
  }, [pathname, search, navigate, user?.permissions]);

  // Resolve page title dynamically
  const pageTitle = getPageTitle(pathname);
  const studentProfileMatch = matchPath(
    { path: "/records/:batchNo/:studentUuid", end: true },
    pathname
  );
  const batchMatch = matchPath(
    { path: "/records/:batchNo", end: true },
    pathname
  );
  const archivedStudentMatch = matchPath(
    { path: "/student-archive/:studentUuid", end: true },
    pathname
  );
  const userProfileMatch = matchPath(
    { path: "/system-users/:userId", end: true },
    pathname
  );
  const isStudentProfilePath = Boolean(studentProfileMatch);
  const isArchivedStudentPath = Boolean(archivedStudentMatch);
  const isBatchPath = Boolean(batchMatch);
  const isUserProfilePath = Boolean(userProfileMatch);
  const hasUndoAction = isStudentProfilePath || isArchivedStudentPath || isBatchPath || isUserProfilePath;
  const profileBackPath = studentProfileMatch?.params.batchNo
    ? `/records/${encodeURIComponent(studentProfileMatch.params.batchNo)}`
    : "/records";
  const backPath = isArchivedStudentPath
    ? "/student-archive"
    : isUserProfilePath
      ? "/system-users"
      : "/records";

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col flex-1 min-h-screen min-w-0 w-full">
        <header className="flex h-14 items-center gap-4 border-b bg-background px-6">
          <SidebarTrigger className="cursor-pointer text-muted-foreground transition-all duration-200 hover:scale-110 hover:text-primary hover:drop-shadow-sm hover:bg-transparent" />
          <div className="font-bold text-sm text-primary">{pageTitle}</div>

          {hasUndoAction && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="ml-auto text-muted-foreground transition-all duration-200 hover:scale-110 hover:text-primary hover:drop-shadow-sm"
              aria-label="Go back"
              onClick={() => {
                if (isStudentProfilePath) {
                  setIsOpen(true);
                } else {
                  navigate(backPath);
                }
              }}
            >
              <Undo2 className="size-5" />
            </Button>
          )}

          {isStudentProfilePath && (
            <DialogBox
              title="Proceed?"
              open={isOpen}
              onOpenChange={setIsOpen}
              onClick={() => navigate(profileBackPath)}
              yesBtnName="Discard"
              yesBtnStyle="bg-red-700 hover:bg-red-600"
            >
              <p>If you leave this page, any unsaved changes will be lost.</p>
            </DialogBox>
          )}
        </header>

        <main id="main" className="flex-1 min-w-0 w-full max-w-full px-6 py-5">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
