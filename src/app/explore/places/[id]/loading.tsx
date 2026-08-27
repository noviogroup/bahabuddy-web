export default function PlaceDetailLoading() {
  return (
    <div className="min-h-screen bg-white animate-pulse">
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="mb-3 h-4 w-52 rounded bg-gray-100" />
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-2 h-3 w-28 rounded bg-gray-100" />
              <div className="mb-3 h-10 w-72 max-w-full rounded bg-gray-200" />
              <div className="h-5 w-full max-w-xl rounded bg-gray-100" />
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="h-10 w-28 rounded-full bg-gray-100" />
              <div className="h-10 w-28 rounded-full bg-gray-100" />
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <div className="h-7 w-24 rounded-full bg-gray-100" />
            <div className="h-7 w-28 rounded-full bg-gray-100" />
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="mb-10 h-64 rounded-baha-xl border border-gray-200 bg-stone-100 sm:aspect-[16/7] sm:h-auto sm:min-h-[240px]" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-8">
            <div>
              <div className="h-7 w-24 bg-gray-200 rounded mb-3" />
              <div className="space-y-2">
                <div className="h-4 w-full bg-gray-100 rounded" />
                <div className="h-4 w-5/6 bg-gray-100 rounded" />
                <div className="h-4 w-4/6 bg-gray-100 rounded" />
              </div>
            </div>

            {/* Photo grid placeholder */}
            <div>
              <div className="h-7 w-20 bg-gray-200 rounded mb-4" />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="aspect-square rounded-2xl bg-gray-100" />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-4">
              <div className="h-4 w-16 bg-gray-200 rounded" />
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-7 h-7 bg-gray-200 rounded" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 w-16 bg-gray-100 rounded" />
                    <div className="h-4 w-28 bg-gray-100 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
