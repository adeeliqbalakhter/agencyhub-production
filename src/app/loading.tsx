export default function HomeLoading() {
  return (
    <div className="animate-pulse">
      <div className="bg-navy h-96" />
      <div className="max-w-7xl mx-auto px-4 py-12 space-y-8">
        <div className="h-8 bg-gray-200 rounded w-1/4 mx-auto" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded" />
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded-lg" />
      </div>
    </div>
  );
}
