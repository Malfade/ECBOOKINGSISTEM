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

      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/groups"
          className="bg-purple-600 text-white px-8 py-3 rounded-full font-bold hover:bg-purple-500 transition-colors shadow-lg shadow-purple-500/20"
        >
          📚 View Schedules
        </Link>
        <Link
          href="/rooms"
          className="bg-blue-600 text-white px-8 py-3 rounded-full font-bold hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20"
        >
          📅 Book a Room
        </Link>
      </div>

      <div className="mt-12 text-sm text-neutral-600">
        <p>Scan a QR code to book a specific room.</p>
      </div>
    </div>
  );
}
