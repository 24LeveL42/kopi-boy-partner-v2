import { Logo } from "./Logo";

export function StatusScreen({
  title,
  message,
  tone = "neutral",
}: {
  title: string;
  message: string;
  tone?: "neutral" | "warning" | "danger";
}) {
  const accent =
    tone === "danger" ? "var(--kb-danger)" : tone === "warning" ? "var(--kb-warn)" : "var(--kb-green)";

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center px-6 text-center" style={{ background: "var(--kb-navy)" }}>
      <Logo size={48} />
      <div className="mt-6 h-1 w-12 rounded-full" style={{ background: accent }} />
      <h1 className="mt-5 font-display text-lg font-bold" style={{ color: "var(--kb-on-navy)" }}>
        {title}
      </h1>
      <p className="mt-2 text-sm" style={{ color: "var(--kb-on-navy-soft)" }}>
        {message}
      </p>
    </div>
  );
}
