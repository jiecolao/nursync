// src/components/app-sidebar.tsx
import {
  ChevronRight,
  GraduationCap,
  History,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  UserCog,
  UserRound,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"
import Logo from "@/assets/icons/logo-transp-w.png"
import { useState, useEffect } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom";
/* -------------------------------------------------------------------------- */
/*  Data                                                                       */
/* -------------------------------------------------------------------------- */

type NavItem = {
  title: string
  url: string
  icon: LucideIcon
  items?: { title: string; url: string }[]
}

// Replace the urls with your real routes. The item whose url matches the
// current path becomes the cream "tab".
const items1: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  {
    title: "Student Records",
    url: "/students",
    icon: GraduationCap,
    items: [
      { title: "Records", url: "/students" },
      { title: "Add Record", url: "/students/create" },
      { title: "Recently Deleted", url: "/students/recently-deleted" },
    ],
  },
]

const items2: NavItem[] = [
  {
    title: "User Management",
    url: "/users",
    icon: UserCog,
    items: [
      { title: "Users", url: "/users" },
      { title: "Add User", url: "/users/create" },
    ],
  },
  { title: "File Logs", url: "/file-logs", icon: History },
  { title: "Activity Logs", url: "/activity-logs", icon: History },
]

const items3: NavItem[] = [
  {
    title: "Account",
    url: "/profile",
    icon: UserRound,
    items: [
      { title: "Profile Details", url: "/profile" },
      { title: "Change Password", url: "/profile/change-password" },
    ],
  },
  { title: "Help", url: "/help", icon: LifeBuoy },
]

// Replace with the signed-in user from your auth state.
const user = { name: "Maria Santos", role: "Registrar" }

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

// Replace with your router hook (useLocation / usePathname).
// To preview the tab before routing exists, return "/students/enrollment".
// const getPathname = () =>
//   typeof window === "undefined" ? "" : window.location.pathname

const handleLogout = async () => {
  // await fetch("/api/auth/logout", { method: "POST", credentials: "include" })
  window.location.href = "/login"
}

/* -------------------------------------------------------------------------- */
/*  The cream tab                                                              */
/* -------------------------------------------------------------------------- */

/**
 * The active page is drawn as a cream tab that runs to the sidebar's right
 * edge and flows into the cream page. Three decorative layers sit behind the
 * label (-z-10 inside the button's own stacking context):
 *   1. the bar, which extends 8px past the button (the group padding)
 *   2. + 3. two 12px fillets that curve the tab into the page edge
 * The page background must be the same cream (see sidebar-theme.css).
 */
function ActiveTab() {
  return (
    <>
      {/* <span
        aria-hidden
        className="absolute inset-y-0 left-0 -right-2 -z-10 rounded-l-[10px] bg-sidebar-primary"
      />
      <span
        aria-hidden
        className="absolute -right-2 -top-3 -z-10 size-3 rounded-br-[12px] shadow-[6px_6px_0_6px_var(--sidebar-primary)]"
      />
      <span
        aria-hidden
        className="absolute -bottom-3 -right-2 -z-10 size-3 rounded-tr-[12px] shadow-[6px_-6px_0_6px_var(--sidebar-primary)]"
      /> */}
    </>
  )
}

const navButton =
  "h-9 rounded-lg text-sidebar-foreground/75 hover:text-sidebar-foreground"

// overflow-visible lets the tab layers draw outside the button; isolate keeps
// them behind the label but above the sidebar background.
const tabButton =
  navButton +
  " relative isolate overflow-visible" +
  " data-[active=true]:bg-transparent data-[active=true]:hover:bg-transparent" +
  " data-[active=true]:font-medium data-[active=true]:text-sidebar-primary-foreground" +
  " data-[active=true]:hover:text-sidebar-primary-foreground"

const subButton =
  "h-8 relative isolate overflow-visible text-sidebar-foreground/70 hover:text-sidebar-foreground" +
  " data-[active=true]:bg-transparent data-[active=true]:hover:bg-transparent" +
  " data-[active=true]:font-medium data-[active=true]:text-sidebar-primary-foreground" +
  " data-[active=true]:hover:text-sidebar-primary-foreground"

// An active item gets 8px of extra vertical room so the 12px fillets sit in
// the gaps instead of overlapping the neighbouring rows.
const activeRoom = ""

/* -------------------------------------------------------------------------- */
/*  Navigation                                                                 */
/* -------------------------------------------------------------------------- */

function NavMenuItem({ item }: { item: NavItem }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { state, setOpen } = useSidebar();

  // No children -> plain button
  if (!item.items?.length) {
    const active = pathname === item.url;

    return (
      <SidebarMenuItem className={cn(active && activeRoom)}>
        <SidebarMenuButton
          tooltip={item.title}
          isActive={active}
          className={tabButton}
          onClick={() => navigate(item.url)} // ✅ Client-side SPA navigation
        >
          {active && <ActiveTab />}
          <item.icon />
          <span className="group-data-[collapsible=icon]:hidden">
            {item.title}
          </span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  // Has children -> collapsible
  const hasActiveChild = item.items.some((sub) => sub.url === pathname);
  const [expanded, setExpanded] = useState(hasActiveChild);

  // Sync expanded state when navigating to a child page
  useEffect(() => {
    if (hasActiveChild) {
      setExpanded(true);
    }
  }, [hasActiveChild]);

  return (
    <Collapsible
      open={expanded}
      onOpenChange={setExpanded}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <CollapsibleTrigger className="w-full">
          <SidebarMenuButton
            tooltip={item.title}
            className={cn(tabButton, "data-[state=open]:text-sidebar-foreground")}
            onClick={() => state === "collapsed" && setOpen(true)}
          >
            <item.icon />
            <span className="group-data-[collapsible=icon]:hidden">
              {item.title}
            </span>
            <ChevronRight
              className={cn(
                "ml-auto transition-transform duration-200 group-data-[collapsible=icon]:hidden",
                expanded && "rotate-90"
              )}
            />
          </SidebarMenuButton>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <SidebarMenuSub className="mr-0 border-sidebar-border pr-0">
            {item.items.map((sub) => {
              const active = pathname === sub.url;

              return (
                <SidebarMenuSubItem
                  key={sub.title}
                  className={cn(active && activeRoom)}
                >
                  {/* ✅ asChild delegates rendering to React Router's <Link> */}
                  <SidebarMenuSubButton
                    // asChild
                    isActive={active}
                    className={subButton}
                  >
                    <Link to={sub.url}>
                      {active && <ActiveTab />}
                      <span>{sub.title}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

function NavGroup({ label, items }: { label?: string; items: NavItem[] }) {
  return (
    <>
      {/* In icon mode the labels disappear, so a hairline separates groups */}
      {label && (
        <SidebarSeparator className="hidden group-data-[collapsible=icon]:block" />
      )}
      <SidebarGroup>
        {label && (
          <SidebarGroupLabel className="text-sidebar-foreground/60">
            {label}
          </SidebarGroupLabel>
        )}
        <SidebarGroupContent>
          <SidebarMenu className="gap-1">
            {items.map((item) => (
              <NavMenuItem key={item.title} item={item} />
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  )
}

/* -------------------------------------------------------------------------- */
/*  Sidebar                                                                    */
/* -------------------------------------------------------------------------- */

export default function AppSidebar() {
  return (
    // border-r-0 removes shadcn's 1px right border, which would otherwise cut
    // a line between the tab and the page.
    <Sidebar
      collapsible="icon"
      className="group-data-[side=left]:border-r-0"
    >
      <SidebarHeader className="overflow-hidden p-2">
        <div className="flex h-11 min-w-0 items-center gap-2">
          <img
            src={Logo}
            alt="Nursync logo"
            className="size-8 shrink-0 rounded-lg object-contain"
          />
          <div className="flex min-w-0 flex-col group-data-[collapsible=icon]:hidden">
            <span className="truncate font-serif text-lg leading-tight tracking-tight">
              Nursync
            </span>
            <span className="truncate font-header text-xs leading-tight tracking-tight text-mustard">
              File Management System
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <NavGroup items={items1} />
        <NavGroup label="Administrators" items={items2} />
        <NavGroup label="Account" items={items3} />
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <div className="flex items-center gap-2 pb-1">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-xs font-medium">
            {initials(user.name)}
          </div>
          <div className="min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm">{user.name}</p>
            <p className="truncate text-xs text-sidebar-foreground/60">
              {user.role}
            </p>
          </div>
        </div>

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Log out"
              className={cn(
                navButton,
                "text-red-300 hover:bg-red-400/15 hover:text-red-200 cursor-pointer"
              )}
              onClick={handleLogout}
            >
              <LogOut />
              <span className="group-data-[collapsible=icon]:hidden">Log out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
