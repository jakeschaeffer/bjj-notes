export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-white text-zinc-900">
      <main className="mx-auto flex w-full max-w-lg flex-col px-6 py-16">
        {children}
      </main>
    </div>
  );
}
