export function AdminError({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</p>;
}
