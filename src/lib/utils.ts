export { cn } from "cn"

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });

export const formatDate = (d: string) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString("en-PH", { dateStyle: "long" }) : "";

export const parseSafeDate = (value: unknown): string => {
  if (!value) return "";
  
  let dateObj: Date;
  if (value instanceof Date) {
    dateObj = value;
  } else {
    // Fallback if it's a raw string
    dateObj = new Date(String(value));
  }

  if (Number.isNaN(dateObj.getTime())) return "";

  // Use UTC methods to prevent local timezone offset from shifting the day
  const year = dateObj.getUTCFullYear();
  const month = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const normalizeFirstName = (value: string): string => {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  
  return trimmed
    .split(" ")
    .map(word => word.charAt(0).toLocaleUpperCase() + word.slice(1).toLocaleLowerCase())
    .join(" ");
};