export { cn } from "cn"

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });

export const formatDate = (d: string) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString("en-PH", { dateStyle: "long" }) : "";