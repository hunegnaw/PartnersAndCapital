import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f5f5f3] flex items-center justify-center p-8">
      <div className="bg-white rounded-xl border border-[#dfdedd] p-8 max-w-md w-full text-center">
        <p className="text-6xl font-bold text-[#dfdedd] mb-4">404</p>
        <h2 className="text-lg font-semibold text-[#1a1a18] mb-2">
          Page not found
        </h2>
        <p className="text-sm text-[#888780] mb-6">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center h-10 px-6 rounded-lg bg-[#1A2640] text-white text-sm font-medium hover:bg-[#2C3E5C] transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
