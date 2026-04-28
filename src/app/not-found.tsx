import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center p-8">
      <div className="bg-white rounded-xl border border-[#e8e0d4] p-8 max-w-md w-full text-center">
        <p className="text-6xl font-bold text-[#e8e0d4] mb-4">404</p>
        <h2 className="text-lg font-semibold text-[#1a1a1a] mb-2">
          Page not found
        </h2>
        <p className="text-sm text-[#9a8c7a] mb-6">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center h-10 px-6 rounded-lg bg-[#0f1c2e] text-white text-sm font-medium hover:bg-[#1a2d45] transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
