import { DataTable, type DataTableAction } from '@/components/layout/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { useEffect, useState } from 'react';
import { Plus, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AddUserPanel } from './AddUserPanel';
import { MoreHorizontal } from "lucide-react";
import { notify } from "@/components/layout/Toasty";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

type UserRecord = {
  userId: string;
  facultyId?: string | null;
  lastName: string;
  fastName: string;
  middleName?: string | null;
  suffix?: string | null;
  status?: boolean;
  createdAt: string;
  updatedAt: string;
  account?: {
    userAccId: string;
    username: string;
    email: string;
    status: boolean;
    role?: {
      roleId: number;
      role?: {
        roleId: number;
        roleName: string;
        permission?: Record<string, boolean>;
      };
    } | null;
  } | null;
};
type UserRow = {
  user_id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  status: string;
  date_modified: string;
  raw: UserRecord;
};
const getColumns = (onDelete: (user: UserRecord) => void): ColumnDef<UserRow>[] => [
  { accessorKey: 'user_id', header: 'User ID' },
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'username', header: 'Username' },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'role', header: 'Role' },
  { accessorKey: 'status', header: 'Status' },
  {
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
          <DropdownMenuItem onClick={() => 
            window.dispatchEvent(
              new CustomEvent('nursync:edit-user', { detail: row.original.raw }),
            )}>
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => onDelete(row.original.raw)}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  }
];
function toRow(user: UserRecord): UserRow {
  const role = user.account?.role?.role;
  return {
    user_id: user.userId,
    name: [user.lastName, user.fastName, user.middleName, user.suffix]
      .filter(Boolean)
      .join(', '),
    username: user.account?.username ?? '—',
    email: user.account?.email ?? '—',
    role: role?.roleName ?? 'Unassigned',
    status: user.account?.status ? 'Enabled' : 'Disabled',
    date_modified: user.updatedAt,
    raw: user,
  };
}
export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<UserRecord | null>(null);
  const [pendingDelete, setPendingDelete] = useState<UserRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  async function loadUsers(signal?: AbortSignal) {
    try {
      const response = await fetch('/api/admin', {
        credentials: 'include',
        signal,
      });
      console.log(response)
      if (!response.ok)
        throw new Error('Unable to fetch system user accounts.');
      const records: UserRecord[] = await response.json();
      setUsers(records.map(toRow));
      setError(null);
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') return;
      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to fetch system user accounts.',
      );
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  async function deleteUser() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const response = await fetch(
        `/api/admin/${encodeURIComponent(pendingDelete.userId)}`,
        { method: 'DELETE', credentials: 'include' },
      );
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          Array.isArray(result?.message)
            ? result.message.join(', ')
            : result?.message || 'Unable to delete user.',
        );
      }
      setPendingDelete(null);
      notify.success('User deleted', {
        description: 'The account has been disabled.',
      });
      setLoading(true);
      await loadUsers();
    } catch (cause) {
      notify.error('Unable to delete user', {
        description:
          cause instanceof Error ? cause.message : 'Please try again.',
      });
    } finally {
      setDeleting(false);
    }
  }
  useEffect(() => {
    const controller = new AbortController();
    void loadUsers(controller.signal);
    const edit = (event: Event) => {
      setEditing((event as CustomEvent<UserRecord>).detail);
      setPanelOpen(true);
    };
    window.addEventListener('nursync:edit-user', edit);
    return () => {
      controller.abort();
      window.removeEventListener('nursync:edit-user', edit);
    };
  }, []);
  const actions: DataTableAction<UserRow>[] = [
    {
      id: 'add-user',
      label: 'Add User',
      icon: Plus,
      variant: 'default',
      visible: ({ selectedRows }) => selectedRows.length === 0,
      onClick: () => {
        setEditing(null);
        setPanelOpen(true);
      },
    },
  ];
  return (
    <div className="flex flex-col">
      <h2 className="mb-2 text-3xl font-bold text-primary">System Users</h2>
      <p className="mt-1 mb-8 text-[.95rem] text-stone-600">
        Manage system accounts, roles, and access status.
      </p>
      {loading && (
        <p className="mb-3 text-sm text-muted-foreground">
          Loading system users…
        </p>
      )}
      {error && (
        <p role="alert" className="mb-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <DataTable
        columns={getColumns(setPendingDelete)}
        data={users}
        dateKey="date_modified"
        searchPlaceholder="Search users…"
        exportFileName="system-users"
        actions={actions}
        pageSizeOptions={[10]}
        defaultVisibleColumnIds={["name", "username", "email", "role", "status"]}
      />
      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this user?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `${pendingDelete.lastName}, ${pendingDelete.fastName}'s account will be disabled and they will no longer be able to sign in.`
                : 'This account will be disabled and the user will no longer be able to sign in.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void deleteUser()}
              disabled={deleting}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleting ? 'Deleting...' : 'Delete user'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AddUserPanel
        open={panelOpen}
        onOpenChange={setPanelOpen}
        user={editing}
        onSaved={() => {
          setLoading(true);
          void loadUsers();
        }}
      />
    </div>
  );
}
