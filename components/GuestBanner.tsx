import Link from "next/link";

// Shown across the tab bar shell while browsing as an anonymous "guest". Sticky so
// the nudge to create a real account stays in view.
export default function GuestBanner() {
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "10px 16px calc(10px + env(safe-area-inset-top))",
        background: "color-mix(in srgb, var(--accent) 14%, var(--bg))",
        borderBottom: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
        fontSize: 13.5,
      }}
    >
      <span style={{ color: "var(--ink)", minWidth: 0 }}>
        You&apos;re just looking around.
      </span>
      <Link
        href="/login"
        style={{ flexShrink: 0, color: "var(--accent)", fontWeight: 700, whiteSpace: "nowrap" }}
      >
        Create your account →
      </Link>
    </div>
  );
}
