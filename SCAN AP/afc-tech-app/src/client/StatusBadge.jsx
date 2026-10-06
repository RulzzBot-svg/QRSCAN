export function StatusBadge({ status }) {
  const isCompleted = status === "Completed";
  const cls =
    status === "Overdue"
      ? "badge-error"
      : status === "Due Soon"
        ? "badge-warning"
        : isCompleted
          ? "badge-success"
          : "badge-ghost";
  return (
    <span
      className={`badge badge-sm ${cls}`}
      style={isCompleted ? { color: "#ffffff" } : undefined}
    >
      {status || "Pending"}
    </span>
  );
}
