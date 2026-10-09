"use client";

import type { ComponentType } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Types & per-type styling                                            */
/* ------------------------------------------------------------------ */

export type ToastType = "success" | "warning" | "error" | "info";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastyProps {
  type?: ToastType | string;
  title?: string;
  description?: string;
  action?: ToastAction;
  onClose?: () => void;
}

const VARIANTS: Record<
  ToastType,
  {
    icon: ComponentType<{ className?: string }>;
    role: "status" | "alert";
    defaultTitle: string;
    accent: string; // left bar + icon colour
    tint: string; // icon background
  }
> = {
  success: {
    icon: CheckCircle2,
    role: "status",
    defaultTitle: "Success",
    accent: "var(--color-primary)",
    tint: "color-mix(in srgb, var(--color-primary) 12%, transparent)",
  },
  warning: {
    icon: AlertTriangle,
    role: "alert",
    defaultTitle: "Heads up",
    accent: "#B45309",
    tint: "#FDF0D5",
  },
  error: {
    icon: XCircle,
    role: "alert",
    defaultTitle: "Something went wrong",
    accent: "#B42318",
    tint: "#FBE4E1",
  },
  info: {
    icon: Info,
    role: "status",
    defaultTitle: "Note",
    accent: "#1D5C8A",
    tint: "#E1EDF5",
  },
};

/* ------------------------------------------------------------------ */
/* Toasty: the toast card itself                                       */
/* ------------------------------------------------------------------ */

export default function Toasty({
  type = "info", // info is the fallback for any unknown type
  title,
  description,
  action,
  onClose,
}: ToastyProps) {
  const variant = VARIANTS[type as ToastType] ?? VARIANTS.info;
  const Icon = variant.icon;

  return (
    <div
      role={variant.role}
      className="flex w-[356px] max-w-[calc(100vw-2rem)] items-start gap-3 rounded-xl border border-l-[5px] bg-[var(--color-secondary)] p-4 shadow-lg"
      style={{
        borderColor: "color-mix(in srgb, var(--color-primary) 18%, transparent)",
        borderLeftColor: variant.accent,
      }}
    >
      <span
        className="grid size-8 shrink-0 place-items-center rounded-full"
        style={{ backgroundColor: variant.tint, color: variant.accent }}
      >
        <Icon className="size-[18px]" />
      </span>

      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm leading-5 font-semibold text-neutral-900">
          {title ?? variant.defaultTitle}
        </p>
        {description && <p className="text-sm leading-5 text-neutral-600">{description}</p>}
        {action && (
          <button
            type="button"
            onClick={() => {
              action.onClick();
              onClose?.();
            }}
            className="mt-1 rounded text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ color: variant.accent, outlineColor: variant.accent }}
          >
            {action.label}
          </button>
        )}
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss notification"
          className="-mt-1 -mr-1 grid size-7 shrink-0 place-items-center rounded-md text-neutral-500 hover:bg-black/5 hover:text-neutral-900"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* notify: call these from anywhere                                    */
/* ------------------------------------------------------------------ */

interface NotifyOptions {
  description?: string;
  action?: ToastAction;
  duration?: number;
}

function show(type: ToastType, title: string | undefined, opts: NotifyOptions = {}) {
  return toast.custom(
    (id) => (
      <Toasty
        type={type}
        title={title}
        description={opts.description}
        action={opts.action}
        onClose={() => toast.dismiss(id)}
      />
    ),
    // Errors and warnings stay a little longer so they can be read.
    { duration: opts.duration ?? (type === "error" || type === "warning" ? 8000 : 4000) }
  );
}

export const notify = {
  success: (title?: string, opts?: NotifyOptions) => show("success", title, opts),
  warning: (title?: string, opts?: NotifyOptions) => show("warning", title, opts),
  error: (title?: string, opts?: NotifyOptions) => show("error", title, opts),
  info: (title?: string, opts?: NotifyOptions) => show("info", title, opts),
};
