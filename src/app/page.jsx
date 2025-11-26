import Link from 'next/link';

export default function Page() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Mahjong Score Site</h1>
        <Link href="/mahjong" className="text-blue-600 underline">점수 입력 페이지로 이동</Link>
      </div>
    </main>
  );
}
