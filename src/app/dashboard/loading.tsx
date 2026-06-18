export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 bg-gray-200 rounded w-1/3" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-gray-200 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-64 bg-gray-200 rounded-lg" />
        <div className="h-64 bg-gray-200 rounded-lg" />
      </div>
    </div>
  );
}
