// Small presentation helpers shared by widget render components.

export function truncate(text: string, max: number): string {
  if (!text || max <= 0) return text ?? "";
  if (text.length <= max) return text;
  return text.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

export function formatDate(
  value: string | number | Date | null | undefined,
  fmt: "DD/MM/YYYY" | "MMM D, YYYY" | "relative",
): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);

  if (fmt === "relative") {
    const diff = Date.now() - d.getTime();
    const day = 86_400_000;
    if (diff < day && diff >= 0) return "Today";
    if (diff < 2 * day && diff >= 0) return "Yesterday";
    const days = Math.floor(diff / day);
    if (days > 0 && days < 30) return `${days} days ago`;
  }

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  if (fmt === "DD/MM/YYYY") return `${dd}/${mm}/${yyyy}`;

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${months[d.getMonth()]} ${d.getDate()}, ${yyyy}`;
}
