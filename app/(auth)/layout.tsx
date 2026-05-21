export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Match<span className="text-emerald-400">Pick</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">Quinielas del Mundial 2026</p>
        </div>
        {children}
      </div>
    </div>
  );
}
