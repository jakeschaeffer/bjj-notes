export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grain-overlay relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#fff,transparent_55%),linear-gradient(160deg,var(--surface-3),var(--background))] text-[var(--foreground)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-36 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,var(--accent-soft),transparent)] blur-3xl" />
      </div>
      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-col px-6 py-16">
        {children}
      </main>
    </div>
  );
}
