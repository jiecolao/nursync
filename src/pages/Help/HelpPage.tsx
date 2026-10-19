import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Shepherd from "shepherd.js";
import "shepherd.js/dist/css/shepherd.css";
import {
  Activity, BookOpen, ChevronDown, ChevronRight, Clock3, FileClock,
  Folder, GraduationCap, LayoutDashboard, LifeBuoy, Search, ShieldCheck,
  Trash2, UserRound, Users, X,
} from "lucide-react";
import { useAuth } from "@/components/auth/ProtectedRoute";

type HelpTopic = {
  title: string;
  description: string;
  icon: typeof LayoutDashboard;
  route: string;
  permission?: string;
  keywords: string[];
  guide: { heading: string; body: string }[];
  tour: { title: string; text: string; attachTo?: string }[];
};

const topics: HelpTopic[] = [
  { title: "Dashboard", description: "Get an overview of your workspace and key activity.", icon: LayoutDashboard, route: "/dashboard", keywords: ["overview", "home", "summary", "metrics"], guide: [{ heading: "Your workspace at a glance", body: "The Dashboard is your starting point for navigating Nursync and reviewing the information available to your account." }, { heading: "Find a module", body: "Use the navigation sidebar to open the area you need. Available modules depend on your assigned permissions." }], tour: [{ title: "Welcome to your Dashboard", text: "This is your starting point for the Nursync workspace." }, { title: "Navigation menu", text: "Use the sidebar to move between the modules available to your account.", attachTo: '[data-sidebar="sidebar"]' }] },
  { title: "Directory", description: "Find and browse the student directory.", icon: Folder, route: "/directory", permission: "students_read", keywords: ["search student", "directory", "browse", "find", "records"], guide: [{ heading: "Browse the directory", body: "Open Directory to find student entries available to your account. Use the page's search and filters when available." }, { heading: "Open a record", body: "Select a student entry to review its details. If you cannot access a record, ask your administrator to review your permissions." }], tour: [{ title: "Student directory", text: "Use this module to find student entries and open the records you are allowed to view." }, { title: "Explore the page", text: "Look for the available search and filtering controls to narrow down your results." }] },
  { title: "Students", description: "View and manage student records in one place.", icon: GraduationCap, route: "/students", permission: "students_read", keywords: ["student records", "edit student", "add student", "profile", "enrollment"], guide: [{ heading: "Find student records", body: "Use the Students module to browse records available to your account." }, { heading: "Keep information accurate", body: "Actions such as adding or editing records depend on your account's permissions." }], tour: [{ title: "Student records", text: "This module is where you browse student records." }, { title: "Open a student", text: "Choose a record to view its profile and available actions." }] },
  { title: "Trash", description: "Review deleted records and available recovery actions.", icon: Trash2, route: "/trash", permission: "students_read", keywords: ["deleted", "restore", "remove", "recover", "trash"], guide: [{ heading: "Review deleted records", body: "Trash collects deleted student records that your account is allowed to see." }, { heading: "Restore carefully", body: "Review a record before restoring or permanently removing it. Some actions may be restricted by your role." }], tour: [{ title: "Trash", text: "Review deleted records here and use the available actions carefully." }] },
  { title: "System Users", description: "Understand user accounts, roles, and access permissions.", icon: Users, route: "/system-users", permission: "user_read", keywords: ["account", "roles", "permissions", "invite", "access", "users"], guide: [{ heading: "Review user accounts", body: "System Users lets authorized administrators review user accounts and their assigned roles." }, { heading: "Understand permissions", body: "Permissions determine which modules and actions a user can access. Give users only the access they need." }], tour: [{ title: "System Users", text: "Authorized users can review accounts and assigned access here." }, { title: "Roles and permissions", text: "A user's role and permissions determine which modules and actions are available." }] },
  { title: "File History", description: "Review file-related history and changes.", icon: FileClock, route: "/file-logs", permission: "logs_read", keywords: ["file management", "history", "upload", "download", "changes", "logs"], guide: [{ heading: "Review file history", body: "File History helps authorized users review available file-related activity." }, { heading: "Troubleshoot a file issue", body: "Use the event details and timestamps shown on the page to help identify what happened. Share relevant details with your administrator if you need help." }], tour: [{ title: "File History", text: "Review the file-related events available to your account." }, { title: "Investigate an event", text: "Use the available details and timestamps to help troubleshoot file activity." }] },
  { title: "Activity Log", description: "Understand recent activity recorded by the system.", icon: Activity, route: "/activity-logs", permission: "logs_read", keywords: ["audit", "events", "system logs", "activity", "troubleshoot"], guide: [{ heading: "Read the activity log", body: "The Activity Log provides a record of system activity available to authorized users." }, { heading: "Use logs for troubleshooting", body: "Narrow your search with available filters and use timestamps to identify relevant events." }], tour: [{ title: "Activity Log", text: "Use this page to review recorded activity and investigate unexpected behavior." }] },
  { title: "My Account", description: "Review your profile and account information.", icon: UserRound, route: "/my-account", keywords: ["profile", "email", "password", "account settings", "personal information"], guide: [{ heading: "Review your account", body: "My Account contains the profile and account information available to you." }, { heading: "Keep your account secure", body: "Use the account and sign-in options provided by Nursync. Contact your administrator if information needs to be changed but the option is unavailable." }], tour: [{ title: "My Account", text: "Review your account information and the profile options available to you." }] },
  { title: "Help Center", description: "Search guides and get answers to common questions.", icon: LifeBuoy, route: "/help", keywords: ["help", "support", "faq", "documentation"], guide: [{ heading: "Search for an answer", body: "Use the search bar to find topics by keyword, or browse the guide cards below." }], tour: [{ title: "Help Center", text: "Search documentation, browse guides, and find answers to common questions." }] },
];

const faqs = [
  { q: "Why can't I see a module?", a: "Nursync only shows modules that your account is allowed to access. If you believe you need a module, contact your administrator to review your role and permissions." },
  { q: "How do I find a student record?", a: "Open Students or Directory and use the search or filtering controls available on the page. Your results depend on your account permissions." },
  { q: "Where can I review file changes or system activity?", a: "Open File History for file-related events or Activity Log for recorded system activity. These pages are available to accounts with log-reading permission." },
  { q: "Can I restore a deleted record?", a: "Open Trash and check the actions available for the record. Recovery options can vary; if no restore action is shown, ask your administrator for help." },
  { q: "How do user roles and permissions work?", a: "Roles group permissions that control which modules and actions an account can use. Administrators can review access in System Users when they have the required permission." },
  { q: "What should I do if something looks wrong?", a: "Try searching this Help Center first. If the issue continues, contact your administrator and include the page, approximate time, and a short description. Avoid sharing passwords or sensitive student information in support messages." },
];

export default function HelpPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [guide, setGuide] = useState<HelpTopic | null>(null);
  const [guideSearch, setGuideSearch] = useState("");

  const visibleTopics = useMemo(
    () => topics.filter((topic) => !topic.permission || Boolean(user?.permissions?.[topic.permission])),
    [user?.permissions],
  );
  const normalizedQuery = query.trim().toLowerCase();
  const filteredTopics = visibleTopics.filter((topic) =>
    [topic.title, topic.description, ...topic.keywords, ...topic.guide.flatMap((item) => [item.heading, item.body])]
      .join(" ").toLowerCase().includes(normalizedQuery),
  );
  const filteredFaqs = faqs.filter((item) => `${item.q} ${item.a}`.toLowerCase().includes(normalizedQuery));

  const startTour = (topic: HelpTopic) => {
    navigate(`${topic.route}?tour=1`);
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("tour") !== "1") return;
    const topic = topics.find((item) => item.route === location.pathname);
    if (!topic || (topic.permission && !user?.permissions?.[topic.permission])) {
      navigate(location.pathname, { replace: true });
      return;
    }
    const storageKey = `nursync-tour-completed:${topic.route}`;
    try {
    } catch { /* Tours remain usable when browser storage is unavailable. */ }

    const tour = new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        cancelIcon: { enabled: true },
        scrollTo: { behavior: "smooth", block: "center" },
        classes: "nursync-tour",
        buttons: [
          { text: "Skip tour", action() { tour.cancel(); } },
          { text: "Previous", action() { tour.back(); }, secondary: true },
          { text: "Next", action() { tour.next(); } },
        ],
      },
    });
    topic.tour.forEach((step, index) => {
      const isLast = index === topic.tour.length - 1;
      tour.addStep({
        title: step.title,
        text: step.text,
        ...(step.attachTo && document.querySelector(step.attachTo)
          ? { attachTo: { element: step.attachTo, on: "right" as const } }
          : {}),
        buttons: [
          { text: "Skip tour", action() { tour.cancel(); } },
          ...(index > 0 ? [{ text: "Previous", action() { tour.back(); }, secondary: true }] : []),
          { text: isLast ? "Finish" : "Next", action() { tour.next(); } },
        ],
      });
    });
    tour.on("complete", () => {
      try { window.localStorage.setItem(storageKey, "true"); } catch { /* no-op */ }
      navigate(location.pathname, { replace: true });
    });
    tour.on("cancel", () => navigate(location.pathname, { replace: true }));
    tour.start();
    return () => tour.cancel();
  }, [location.pathname, location.search, navigate, user?.permissions]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-10 pb-12">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#153e35] via-[#1f5b4d] to-[#347765] px-6 py-12 text-center text-white shadow-sm sm:px-12 sm:py-16">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full border-[38px] border-white/5" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-16 size-80 rounded-full border-[44px] border-white/5" />
        <div className="relative mx-auto max-w-2xl">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium tracking-wide text-emerald-50"><LifeBuoy size={14} /> NURSync Help Center</span>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">How Can We Assist You?</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-emerald-50/85 sm:text-base">Search step-by-step guides, explore modules, and find answers without waiting for support.</p>
          <div className="relative mx-auto mt-8 max-w-xl">
            <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search students, roles, file history..." aria-label="Search help guides and FAQs" className="h-14 w-full rounded-2xl border border-white/30 bg-white pl-12 pr-12 text-left text-sm text-slate-900 shadow-lg outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-200/30" />
            {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={17} /></button>}
          </div>
          <p className="mt-3 text-xs text-emerald-50/75">{normalizedQuery ? `Showing matches for “${query.trim()}”` : "Search across guides and frequently asked questions"}</p>
        </div>
      </section>

      <section>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Browse by module</p><h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Guides & resources</h2></div>
          <span className="text-sm text-slate-500">{filteredTopics.length} {filteredTopics.length === 1 ? "guide" : "guides"}</span>
        </div>
        {filteredTopics.length ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {filteredTopics.map((topic) => {
            const Icon = topic.icon;
            return <article key={topic.route} className="group flex min-w-0 flex-col rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-950/5 sm:p-6">
              <button type="button" onClick={() => { setGuide(topic); setGuideSearch(""); }} className="flex flex-1 flex-col text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-4 rounded-xl">
                <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 transition group-hover:bg-emerald-100"><Icon size={22} strokeWidth={1.8} /></span>
                <span className="flex items-center gap-2 text-base font-semibold text-slate-900">{topic.title}<ChevronRight size={16} className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-emerald-700" /></span>
                <span className="mt-2 text-sm leading-6 text-slate-600">{topic.description}</span>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-emerald-800">Read guide <BookOpen size={15} /></span>
              </button>
              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="text-xs text-slate-400">Module shortcut</span>
                <button type="button" onClick={() => startTour(topic)} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900 transition hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">{topic.route === "/help" ? "Take a Tour" : "Go to Module"}<ChevronRight size={14} /></button>
              </div>
            </article>;
          })}
        </div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center"><span className="mx-auto flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-500"><Search size={21} /></span><h3 className="mt-4 font-semibold text-slate-900">No results found</h3><p className="mt-1 text-sm text-slate-500">Try another keyword or clear your search to browse all available guides.</p><button type="button" onClick={() => setQuery("")} className="mt-4 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Clear search</button></div>}
      </section>

      <section>
        <div className="mb-5"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Quick answers</p><h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Frequently asked questions</h2><p className="mt-2 text-sm text-slate-500">Straightforward answers to common Nursync questions.</p></div>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {filteredFaqs.length ? filteredFaqs.map((faq) => {
            const originalIndex = faqs.indexOf(faq);
            const isOpen = openFaq === originalIndex;
            return <div key={faq.q} className="border-b border-slate-100 last:border-b-0">
              <button type="button" aria-expanded={isOpen} onClick={() => setOpenFaq(isOpen ? null : originalIndex)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-slate-50 sm:px-6"><span className="text-sm font-medium text-slate-800">{faq.q}</span><ChevronDown size={18} className={`shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} /></button>
              {isOpen && <p className="px-5 pb-5 text-sm leading-6 text-slate-600 sm:px-6">{faq.a}</p>}
            </div>;
          }) : <p className="px-6 py-8 text-center text-sm text-slate-500">No FAQs match this search. Try another keyword.</p>}
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-800 shadow-sm"><ShieldCheck size={20} /></span><div><h3 className="font-semibold text-slate-900">Still need a hand?</h3><p className="mt-1 text-sm leading-6 text-slate-600">Contact your system administrator if you need access or cannot resolve an issue with these guides.</p></div></div>
        <span className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-emerald-900"><Clock3 size={16} /> Self-service, whenever you need it</span>
      </section>

      {guide && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setGuide(null); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="help-guide-title" className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
          <header className="sticky top-0 flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-6 py-5"><div><p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Nursync guide</p><h2 id="help-guide-title" className="mt-1 text-xl font-semibold text-slate-900">{guide.title}</h2><p className="mt-1 text-sm text-slate-500">{guide.description}</p></div><button type="button" aria-label="Close guide" onClick={() => setGuide(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button></header>
          <div className="space-y-5 px-6 py-6">{guide.guide.map((section, index) => <div key={section.heading} className="flex gap-4"><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-semibold text-emerald-800">{index + 1}</span><div><h3 className="font-semibold text-slate-900">{section.heading}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{section.body}</p></div></div>)}</div>
          <footer className="flex flex-wrap justify-end gap-3 border-t border-slate-100 px-6 py-4"><button type="button" onClick={() => setGuide(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Close guide</button><button type="button" onClick={() => { const selected = guide; setGuide(null); startTour(selected); }} className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900">Go to module <ChevronRight size={15} className="ml-1 inline" /></button></footer>
        </section>
      </div>}
    </div>
  );
}
