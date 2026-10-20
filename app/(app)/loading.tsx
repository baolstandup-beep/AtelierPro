export default function Loading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Chargement">
      <div className="mb-6 h-9 w-64 rounded bg-sand/70" />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <div key={i} className="h-24 rounded-[10px] bg-sand/50" />)}
      </div>
      <div className="h-72 rounded-[10px] bg-sand/40" />
    </div>
  );
}
