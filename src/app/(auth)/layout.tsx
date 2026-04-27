export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Left panel - dark navy branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0f1c2e] text-white flex-col justify-between p-12">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Partners + Capital</h1>
          <p className="mt-4 text-lg text-white/70">Your capital. A clear view.</p>
        </div>
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-2xl font-bold text-white">$250M+</p>
              <p className="text-sm text-white/50">Assets Under Management</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">120+</p>
              <p className="text-sm text-white/50">Investor Clients</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">15+</p>
              <p className="text-sm text-white/50">Active Investments</p>
            </div>
          </div>
          <div className="border-t border-white/10 pt-4">
            <p className="text-xs text-white/30">
              Past performance is not indicative of future results. All investments involve risk, including loss of principal. This portal is for authorized users only.
            </p>
          </div>
        </div>
      </div>

      {/* Right panel - white with form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-white p-6">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
