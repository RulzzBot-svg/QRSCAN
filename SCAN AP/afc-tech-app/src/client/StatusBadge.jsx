export function StatusBadge({ status }) {
  const cls =
    status === "Overdue"
      ? "badge-error"
      : status === "Due Soon"
        ? "badge-warning"
        : status === "Completed"
          ? "badge-success"
          : "badge-ghost";
  return <span className={`badge badge-sm ${cls}`}>{status || "Pending"}</span>;
}
