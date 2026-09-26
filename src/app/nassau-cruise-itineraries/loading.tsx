export default function LoadingTours() {
  return (
    <main aria-busy="true" className="mx-auto max-w-6xl px-4 py-10">
      <p role="status" className="text-lg font-semibold text-night">Loading tours…</p>
      <div aria-hidden="true" className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((card) => <div key={card} className="h-80 rounded-baha-xl bg-gray-100 motion-safe:animate-pulse" />)}
      </div>
    </main>
  )
}
