export default function AgenciesLoading() {
  return (
    <div className="animate-pulse space-y-6 max-w-7xl mx-auto px-4 py-8">
      <div className="h-8 bg-gray-200 rounded w-1/3" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-48 bg-gray-200 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
