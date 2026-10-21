import { useEffect, useState } from "react";
import { DataTable } from "@/components/layout/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DashboardCard from "@/components/layout/DashboardCard";
import type { FileLogsType } from "../HistoryLogs/logs.type";

type DashboardSummary = {
  students: {
    total: number;
    active: number;
    inactive: number;
    nonGraduates: number;
    byYearGraduated: Array<{
      year: number;
      count: number;
    }>;
  };
  documents: {
    total: number;
    byStatus: Array<{
      statusId: number;
      status: string;
      count: number;
    }>;
    byCategory: Array<{
      categoryId: number;
      category: string;
      count: number;
    }>;
  };
};

type RecentChange = FileLogsType;

function formatColumnHeader(key: string) {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function createActionColumn(): ColumnDef<RecentChange> {
  return {
    id: "actions",
    enableHiding: false,
    enableSorting: false,
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button variant="ghost" size="icon" className="size-8">
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => console.log("view user", row.original.user)}>
            See User
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => console.log("view student", row.original.student_name)}>
            See Student
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => console.log("view file", row.original.file_loc)}>
            Go to File
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  };
}

async function getJson<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    signal,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.message ?? "Unable to load dashboard data.");
  }
  return payload as T;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentChanges, setRecentChanges] = useState<RecentChange[]>([]);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [recentError, setRecentError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentLoading, setRecentLoading] = useState(true);
  const columns: ColumnDef<RecentChange>[] = recentChanges.length
    ? [
        ...Array.from(
          new Set(recentChanges.flatMap((change) => Object.keys(change))),
        ).map((key) => ({
          accessorKey: key,
          header: formatColumnHeader(key),
        })),
        createActionColumn(),
      ]
    : [createActionColumn()];

  useEffect(() => {
    const controller = new AbortController();

    const loadDashboard = async () => {
      const [summaryResult, recentResult] = await Promise.allSettled([
        getJson<DashboardSummary>("/api/dashboard/summary", controller.signal),
        getJson<RecentChange[]>("/api/dashboard/recent-changes?limit=10", controller.signal),
      ]);

      if (controller.signal.aborted) return;

      if (summaryResult.status === "fulfilled") {
        setSummary(summaryResult.value);
        setSummaryError(null);
      } else {
        setSummaryError(
          summaryResult.reason instanceof Error
            ? summaryResult.reason.message
            : "Unable to load dashboard summary.",
        );
      }

      if (recentResult.status === "fulfilled" && Array.isArray(recentResult.value)) {
        setRecentChanges(recentResult.value);
        setRecentError(null);
      } else {
        setRecentError(
          recentResult.status === "rejected" && recentResult.reason instanceof Error
            ? recentResult.reason.message
            : "Unable to load recent changes.",
        );
      }

      setLoading(false);
      setRecentLoading(false);
    };

    void loadDashboard();
    return () => controller.abort();
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="m-0 text-3xl font-bold text-primary">Dashboard</h2>
        {loading && <p className="mt-1 text-sm text-stone-500">Loading dashboard data…</p>}
        {summaryError && <p role="alert" className="mt-1 text-sm text-red-600">{summaryError}</p>}
      </div>

      <div className="relative">
        <h1 className="mb-3 border-primary text-lg font-bold text-primary font-header border-b-3">
          STUDENTS
        </h1>
        <div className="flex flex-row flex-wrap gap-3">
          <DashboardCard
            bg_color="bg-yellow-300"
            data={summary?.students.total ?? 0}
            legend="Total Students"
          />
          {/* <DashboardCard
            bg_color="bg-white"
            data={summary?.students.active ?? 0}
            legend="Active Students"
          /> */}
          <DashboardCard
            bg_color="bg-yellow-300"
            data={summary?.students.nonGraduates ?? 0}
            legend="Non-Graduates"
          />
          {summary?.students.byYearGraduated.map((item) => (
            <DashboardCard
              key={`batch-${item.year}`}
              bg_color="bg-white"
              data={item.count}
              legend={item.year ? `Batch ${item.year}` : "No Year Graduated"}
            />
          ))}
        </div>
      </div>

      <div className="relative">
        <h1 className="mb-3 border-primary text-lg font-bold text-primary font-header border-b-3">
          DOCUMENTS
        </h1>
        <div className="flex flex-row flex-wrap gap-3">
          <DashboardCard
            bg_color="bg-yellow-300"
            data={summary?.documents.total ?? 0}
            legend="Total Documents"
          />
          {summary?.documents.byCategory.map((item) => (
            <DashboardCard
              key={`category-${item.categoryId}`}
              bg_color="bg-white"
              data={item.count}
              legend={item.category}
            />
          ))}
        </div>
      </div>

      <div>
        <h1 className="my-4 text-lg font-bold text-primary font-header">RECENT</h1>
        {recentLoading && <p className="mb-4 text-sm text-stone-500">Loading recent changes…</p>}
        {recentError && <p role="alert" className="mb-4 text-sm text-red-600">{recentError}</p>}
        <DataTable
          columns={columns}
          data={recentChanges}
          dateKey="date_modified"
          searchPlaceholder="Search uuid, user, or action"
          exportFileName="recent-file-changes"
          defaultVisibleColumnIds={["user", "student_name", "file_action", "file_modified"]}
        />
      </div>
    </div>
  );
}
