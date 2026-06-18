export default function AgencyDetailLoading() {
  return (
    <div className="animate-pulse max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="h-64 bg-gray-200 rounded-lg" />
      <div className="h-8 bg-gray-200 rounded w-1/3" />
      <div className="h-4 bg-gray-200 rounded w-2/3" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="h-48 bg-gray-200 rounded-lg col-span-2" />
        <div className="h-48 bg-gray-200 rounded-lg" />
      </div>
    </div>
  );
}
