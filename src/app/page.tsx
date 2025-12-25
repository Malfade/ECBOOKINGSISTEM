import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-8 text-center text-white font-sans">
      <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
        QRBook
      </h1>
      <p className="text-neutral-400 mb-8 max-w-md">
        Simple QR-code room booking system.
      </p>

      <div className="flex gap-4">
        <Link
          href="/admin"
          className="bg-zinc-100 text-zinc-900 px-6 py-3 rounded-full font-medium hover:bg-zinc-200 transition-colors"
        >
          Go to Admin Panel
        </Link>
      </div>

      <div className="mt-12 text-sm text-neutral-600">
        <p>Scan a QR code to book a specific room.</p>
      </div>
    </div>
  );
}
