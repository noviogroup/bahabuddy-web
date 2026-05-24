export default function Loading() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="animate-pulse text-center">
        <div className="w-10 h-10 rounded-full bg-coral-200 mx-auto mb-4" />
        <p className="text-sm text-gray-400">Loading restaurant...</p>
      </div>
    </div>
  )
}
