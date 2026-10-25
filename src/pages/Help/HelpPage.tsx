import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  { title: "Dashboard", description: "Explore student and document summaries, recent activity, and dashboard actions.", icon: LayoutDashboard, route: "/dashboard", keywords: ["home", "overview", "summary", "navigation", "student totals", "documents", "recent changes"], guide: [{ heading: "Student summary cards", body: "The STUDENTS section summarizes the student record groups available to your account. Use the cards to orient yourself before opening the records module." }, { heading: "Document summary cards", body: "The DOCUMENTS section surfaces document-related totals and status information exposed by the dashboard." }, { heading: "Recent activity table", body: "RECENT lists recent changes in a table. Review its columns and row details to understand what changed; use the row actions when available." }, { heading: "Keep in mind", body: "Dashboard totals depend on the records and permissions available to your account. Open the relevant module for detailed records and management actions." }], tour: [{ title: "Dashboard overview", text: "This page brings together high-level student and document information plus a recent-activity table." }, { title: "Student summary", text: "These cards summarize student groups. Treat them as an overview; open Student Records to inspect or manage individual records.", attachTo: "h1" }, { title: "Document summary", text: "The DOCUMENTS section summarizes document information available to the dashboard.", attachTo: "h1" }, { title: "Recent changes", text: "The recent table lists activity rows. Use the visible columns and row actions to inspect an event.", attachTo: "table" }, { title: "Continue with the sidebar", text: "Use the application navigation to move from summary figures into the module where you need to work.", attachTo: '[data-sidebar="sidebar"]' }] },
  { title: "Student Records", description: "Navigate the student document directory, browse folders, search files, and import records or documents.", icon: GraduationCap, route: "/records", permission: "students_read", keywords: ["students", "directory", "batch", "graduated", "non-graduate", "profile", "enrollment", "import students", "student documents", "folders", "files"], guide: [{ heading: "Directory and connection status", body: "The Directory page presents the student document store. The connection indicator communicates whether the directory service is connected or reconnecting." }, { heading: "Browse folders", body: "Use the Database breadcrumb and folder entries to move between locations. Folder paths let you return to an ancestor without restarting." }, { heading: "Search and display modes", body: "Search files and folders by name, then switch between grid and list views. Selecting a supported file opens its preview; unsupported file types may not open in the built-in viewer." }, { heading: "Entry actions", body: "Use an entry's action menu to find related student records where available. Confirm the student and folder before making changes." }, { heading: "Import records versus documents", body: "Import opens a choice between student records and student documents. Student records use a structured CSV/Excel template; document import uses a selected student folder and previews the files to be imported. Review the separate import guidance below before confirming." }], tour: [{ title: "Student document directory", text: "This is the Directory view of the student document store. It is organized around folders and files, rather than being the student batch table." }, { title: "Connection status", text: "This indicator reports the directory connection state. If it is reconnecting, allow it to recover before assuming updates have stopped.", attachTo: "h2" }, { title: "Import entry point", text: "Import opens a choice: import student records, or import student documents from a folder. Choose the correct workflow because their inputs and validation are different.", attachTo: 'button' }, { title: "Grid and list views", text: "Switch between visual cards and a compact list. Both views represent the same directory contents.", attachTo: '[aria-label="Grid view"]' }, { title: "Breadcrumb navigation", text: "Use Database and the breadcrumb segments to return to a parent folder or jump to an earlier path.", attachTo: '[aria-label="Breadcrumb"]' }, { title: "Search the directory", text: "Search files and folders by name. Clear or adjust the query if an expected entry is not visible.", attachTo: '[aria-label="Search files and folders"]' }, { title: "Open folders and supported files", text: "Select a folder to enter it. Supported file types can be previewed; use an entry's action menu to find related student records when available.", attachTo: '[aria-label^="Actions for"]' }, { title: "Import carefully", text: "Use the student CSV/Excel workflow for student records. Use the document import workflow when importing a folder of student files, and review its preview before confirming." }] },
  { title: "Student Archive", description: "Search archived student records and review restore or permanent-delete actions.", icon: Folder, route: "/student-archive", permission: "students_read", keywords: ["archived", "inactive", "restore", "student archive", "permanently delete"], guide: [{ heading: "Find archived students", body: "The table lists archived student records. Use its search, sorting, and pagination controls to locate the intended student." }, { heading: "Reactivate a student", body: "Review the student identity before using the available reactivation action. Reactivation returns the record to active student workflows." }, { heading: "Permanent deletion", body: "Permanent deletion is destructive and may not be reversible. Verify the selected record and follow your organization's retention rules before confirming." }], tour: [{ title: "Student Archive", text: "This table contains student records that have been archived rather than appearing in the active batch lists." }, { title: "Search archived records", text: "Use the table search to narrow the list to the intended student.", attachTo: "table" }, { title: "Available row actions", text: "Rows expose actions such as reactivation and permanent deletion. Check the student's identity first; permanent deletion should be treated as irreversible.", attachTo: "table" }] },
  { title: "Trash", description: "Search deleted student documents, preview PDFs, restore items, or permanently delete them.", icon: Trash2, route: "/trash", permission: "students_read", keywords: ["deleted", "restore", "recover", "permanently delete", "empty trash", "document"], guide: [{ heading: "Search and refresh", body: "Search by filename, student, or category. Refresh reloads the current list from the server." }, { heading: "Review retention status", body: "Each row includes document details and deletion/retention information when available. Review this information before deciding what to do." }, { heading: "Preview, restore, and delete", body: "PDF documents can be previewed. Restore returns a document from Trash; Delete Permanently removes it. Empty Trash applies a bulk permanent-delete action to the contents, so verify the list before using it." }], tour: [{ title: "Trash overview", text: "Trash is for deleted student documents. It is distinct from Student Archive, which contains archived student records." }, { title: "Refresh the list", text: "Refresh requests the latest Trash contents. It may be disabled while loading or another action is in progress.", attachTo: "button" }, { title: "Search by document details", text: "Filter the list by filename, student, or category to locate the correct document.", attachTo: '[aria-label="Search trashed documents"]' }, { title: "Inspect a row", text: "Rows show document identity, student/category context, timestamps, and retention information where available. Confirm you have the correct item before acting.", attachTo: "table" }, { title: "Restore or permanently delete", text: "Restore returns the item from Trash. Delete Permanently removes it; Empty Trash applies to all listed items. Both permanent deletion paths require extra care.", attachTo: "table" }] },
  { title: "System Users", description: "Browse user accounts, add or edit users, and manage role-based and custom permissions.", icon: Users, route: "/system-users", permission: "user_read", keywords: ["accounts", "roles", "permissions", "access", "users", "add user", "edit user"], guide: [{ heading: "Users table", body: "The table lists accounts visible to your role. Search, sorting, and pagination help locate a user; row menus provide actions supported by your permissions." }, { heading: "Add or edit a user", body: "The user panel groups fields into Personal Information, Account & Access, and Custom Permissions. Complete required identity and account fields, then review the selected permissions before saving." }, { heading: "Custom permissions", body: "Permission switches control specific capabilities. Grant only the access required for the user's responsibilities, and verify changes before submitting." }], tour: [{ title: "System Users", text: "This module manages application accounts and their access—not student records." }, { title: "Find a user", text: "Use the table's search, sorting, and pagination controls to find the intended account.", attachTo: "table" }, { title: "User actions", text: "The row action menu contains the operations available to your role, such as editing or changing account status.", attachTo: "table" }, { title: "Adding or editing users", text: "The user panel separates identity details, account/access settings, and custom permission switches. Check each section before saving." }] },
  { title: "File History", description: "Inspect file modification events and use table tools to investigate document activity.", icon: FileClock, route: "/file-logs", permission: "logs_read", keywords: ["files", "history", "changes", "logs", "modification", "audit", "download", "upload"], guide: [{ heading: "File modification history", body: "This table records file-related changes exposed to your account. Use search, sorting, and pagination to narrow the event list." }, { heading: "Interpret the event", body: "Read the file identity, action, actor, and timestamp columns that are present. Use the timestamp to correlate a report with a specific change." }, { heading: "Troubleshooting", body: "Use history as evidence for investigation, not as a replacement for checking the current file. Share only necessary event details when requesting administrator help." }], tour: [{ title: "File Modification History", text: "Review file-related events recorded by Nursync. This is an audit view, not the file browser itself." }, { title: "Search and sort events", text: "Use the table's search, column sorting, and pagination to locate the event of interest.", attachTo: "table" }, { title: "Read event details", text: "Compare the file identifier, action, actor, and timestamp columns that are available. Timestamps help correlate changes with user reports.", attachTo: "table" }] },
  { title: "Activity Log", description: "Review recorded system activity and use event details to troubleshoot access or workflow issues.", icon: Activity, route: "/activity-logs", permission: "logs_read", keywords: ["audit", "events", "system logs", "activity", "troubleshoot", "actor", "timestamp"], guide: [{ heading: "Activity log table", body: "The Activity Logs table presents system activity available to authorized users. Use the table controls to search, sort, and move through records." }, { heading: "Investigate an event", body: "Check event descriptions and timestamps, then compare them with the affected workflow. Not every action necessarily appears in this log." }, { heading: "Use logs responsibly", body: "Logs may contain sensitive operational context. Share only the details needed for troubleshooting." }], tour: [{ title: "Activity Logs", text: "This module is an audit-oriented view of recorded system events." }, { title: "Locate activity", text: "Use table search, sorting, and pagination to narrow the event list.", attachTo: "table" }, { title: "Understand a log entry", text: "Read the event text and timestamp together to reconstruct what happened and when. Availability of details depends on the recorded event.", attachTo: "table" }] },
  { title: "My Account", description: "Review your own profile and account settings.", icon: UserRound, route: "/my-account", keywords: ["profile", "email", "password", "account settings", "personal information"], guide: [{ heading: "Your account details", body: "My Account displays the profile and account options available to the signed-in user." }, { heading: "Protect account access", body: "Review changes before saving, keep credentials private, and use the supported account recovery process if you cannot sign in." }], tour: [{ title: "My Account", text: "This area is for your own account, not administration of other users." }, { title: "Review account information", text: "Inspect the profile and account fields presented on this page. Only edit information using controls provided by the application.", attachTo: "main" }, { title: "Account security", text: "Keep credentials private and use the supported recovery process if you lose access. Contact an administrator if a field or action is unavailable." }] },
  { title: "Help Center", description: "Search module guides, start interactive tours, and review import guidelines and FAQs.", icon: LifeBuoy, route: "/help", keywords: ["help", "support", "faq", "documentation", "guided tour", "import guidelines"], guide: [{ heading: "Search guides", body: "Search by module name, feature, or keyword to narrow the guide cards and FAQs." }, { heading: "Read a guide or start a tour", body: "Read guide opens written instructions. Go to Module navigates to the module and starts its interactive tour." }, { heading: "Import references and FAQs", body: "Use the import guidance for CSV/Excel student records and student document folders. FAQs answer common workflow questions." }], tour: [{ title: "Welcome to the Help Center", text: "This page combines searchable module guides, interactive tours, import instructions, and FAQs." }, { title: "Search help", text: "Search by a module, feature, or keyword. The results narrow the guide cards and frequently asked questions.", attachTo: '[aria-label="Search help guides and FAQs"]' }, { title: "Browse module guides", text: "Open a card to read written guidance. Use Go to Module to navigate to that page and launch its interactive walkthrough.", attachTo: "article" }, { title: "Import guidelines", text: "Review the student record and student document import instructions before uploading. The two workflows expect different input formats.", attachTo: "section" }, { title: "Frequently asked questions", text: "Expand a question to read the answer. Search the page if you cannot find the relevant topic.", attachTo: "section" }] },
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


  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("tour") !== "1") return;
    const topic = topics.find((item) => item.route === location.pathname)\n      ?? (location.pathname.startsWith("/records/") ? topics.find((item) => item.route === "/records") : undefined);
    if (!topic || (topic.permission && !user?.permissions?.[topic.permission])) {
      navigate(location.pathname, { replace: true });
      return;
    }
    const storageKey = `nursync-tour-completed:${topic.route}`;

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
          { text: "Skip tour", action() { tour.cancel(); }, classes: "nursync-tour__button nursync-tour__button--quiet" },
          ...(index > 0 ? [{ text: "Previous", action() { tour.back(); }, secondary: true, classes: "nursync-tour__button nursync-tour__button--secondary" }] : []),
          { text: isLast ? "Finish" : "Next", action() { tour.next(); }, classes: "nursync-tour__button nursync-tour__button--primary" },
        ],
      });
    });
    tour.on("complete", () => {
      try { window.localStorage.setItem(storageKey, "true"); } catch { /* no-op */ }
      navigate(location.pathname, { replace: true });
    });
    tour.on("cancel", () => navigate(location.pathname, { replace: true }));
    tour.start();
    return () => { tour.cancel(); };
  }, [location.pathname, location.search, navigate, user?.permissions]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-10 pb-12">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#153e35] via-[#1f5b4d] to-[#347765] px-6 py-12 text-center text-white shadow-sm sm:px-12 sm:py-16">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full border-[38px] border-white/5" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-16 size-80 rounded-full border-[44px] border-white/5" />
        <div className="relative mx-auto max-w-2xl">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium tracking-wide text-emerald-50"><LifeBuoy size={14} /> NurSync Help Center</span>
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
                <button type="button" onClick={() => navigate(`${topic.route}?tour=1`) } className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900 transition hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">Go to Module<ChevronRight size={14} /></button>
              </div>
            </article>;
          })}
        </div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center"><span className="mx-auto flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-500"><Search size={21} /></span><h3 className="mt-4 font-semibold text-slate-900">No results found</h3><p className="mt-1 text-sm text-slate-500">Try another keyword or clear your search to browse all available guides.</p><button type="button" onClick={() => setQuery("")} className="mt-4 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Clear search</button></div>}
      </section>

      <section className="space-y-5">
        <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Data import reference</p><h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Importing students and student documents</h2><p className="mt-2 text-sm leading-6 text-slate-600">Prepare and check your files before importing so student records and documents stay accurate.</p></div>
        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <h3 className="text-base font-semibold text-slate-900">Importing student records</h3>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-600">
              <li>Open <strong>Student Records</strong>, choose the correct batch, then select <strong>Import Students</strong>.</li>
              <li>Upload a CSV, XLSX, or XLS file. Use <strong>Download CSV Template</strong> for a correctly structured example.</li>
              <li>Include column headers. Spaces, underscores, and capitalization are accepted; common aliases such as <code>studentNo</code>, <code>surname</code>, <code>givenName</code>, and <code>yearAdmitted</code> are recognized.</li>
              <li><strong>First Name</strong>, <strong>Last Name</strong>, <strong>Year Admitted</strong>, and <strong>Year of Residency</strong> are required. Optional fields may be blank.</li>
              <li>Student ID is optional, but if provided it must contain 4 alphanumeric characters, a hyphen, then at least 5 alphanumeric characters, and be no more than 20 characters (example: <code>2026-12345</code>). IDs must be unique and not already in the system.</li>
              <li>Names may be at most 255 characters. Email must be valid and at most 100 characters; contact number must be at most 50 characters. Gender ID and year fields must be whole numbers; Year Admitted must be 1900–2100. Date of Birth should be a valid <code>YYYY-MM-DD</code> date.</li>
              <li>For <code>isNonGraduate</code>, use <code>true/false</code>, <code>yes/no</code>, or <code>1/0</code>. Gender IDs are <code>1</code> for Male and <code>2</code> for Female.</li>
              <li>Review every row in the validation preview and correct all errors before submitting. The import is blocked while any row is invalid.</li>
            </ol>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <h3 className="text-base font-semibold text-slate-900">Importing student documents</h3>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-600">
              <li>Open the correct student record and confirm the student's name and identifier before uploading.</li>
              <li>Choose the matching document category in the student's document panel before selecting files.</li>
              <li>You can select multiple files in one upload. Double-check the selected files and remove any incorrect selections before uploading.</li>
              <li>Use clear filenames and upload only documents belonging to that student and category. Avoid duplicate, unrelated, or incorrectly labeled documents.</li>
              <li>Wait for the upload confirmation. If an upload fails, read the displayed error and retry only after checking the selected files and category.</li>
              <li>Handle student documents as confidential information. Upload only authorized files and do not share documents through unrelated channels.</li>
            </ol>
          </article>
        </div>
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
          <footer className="flex flex-wrap justify-end gap-3 border-t border-slate-100 px-6 py-4"><button type="button" onClick={() => setGuide(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Close guide</button><button type="button" onClick={() => { const selected = guide; setGuide(null); navigate(`${selected.route}?tour=1`); }} className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900">Go to module <ChevronRight size={15} className="ml-1 inline" /></button></footer>
        </section>
      </div>}
    </div>
  );
}
