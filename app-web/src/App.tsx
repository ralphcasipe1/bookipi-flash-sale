import type { SaleStatus } from '@flash-sale/shared';

const placeholderStatus: SaleStatus = 'upcoming';

export function App() {
  return (
    <main className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="mx-auto max-w-md rounded-lg bg-white p-6 shadow">
        <h1 className="mb-2 text-2xl font-bold">Flash Sale</h1>
        <p className="text-gray-600">
          Workspace wired. Shared type status:{' '}
          <span className="font-medium text-blue-600">{placeholderStatus}</span>
        </p>
      </div>
    </main>
  );
}
