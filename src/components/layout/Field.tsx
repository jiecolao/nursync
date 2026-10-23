import { type ReactNode } from "react";
import { Label } from "@/components/ui/label";

export function Field({
  label,
  htmlFor,
  error,
  className = "",
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`space-y-1.5 min-w-0 ${className}`}>
      <Label htmlFor={htmlFor} className="text-sm font-medium text-neutral-600">
        {label}
      </Label>
      {children}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}