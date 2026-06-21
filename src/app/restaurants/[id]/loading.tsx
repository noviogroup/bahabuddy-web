export default function Loading() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="animate-pulse text-center">
        <div className="mx-auto mb-4 h-10 w-10 rounded-full bg-gray-200" />
        <p className="text-sm text-gray-400">Loading restaurant...</p>
      </div>
    </div>
  )
}
