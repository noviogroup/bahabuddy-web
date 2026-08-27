'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'

interface Receipt {
  name: string
  path: string
  size: number
  createdAt: string
  mimeType: string
  url: string | null
}

interface Props {
  tripId: string
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(s: string): string {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function TripReceipts({ tripId }: Props) {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingPath, setDeletingPath] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/trips/receipts?tripId=${tripId}`)
      if (!res.ok) throw new Error('Failed to load receipts')
      const json = await res.json()
      setReceipts(json.receipts ?? [])
      setLoaded(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load receipts')
    } finally {
      setLoading(false)
    }
  }, [tripId])

  // Lazy-load on first render trigger
  if (!loaded && !loading && !error) {
    void load()
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setUploading(true)
    setError(null)
    try {
      for (const file of files) {
        const form = new FormData()
        form.append('tripId', tripId)
        form.append('file', file)
        const res = await fetch('/api/trips/receipts', { method: 'POST', body: form })
        if (!res.ok) {
          const json = await res.json()
          throw new Error(json.error ?? 'Upload failed')
        }
      }
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleDelete(receipt: Receipt) {
    if (!confirm(`Delete "${receipt.name}"?`)) return
    setDeletingPath(receipt.path)
    try {
      const res = await fetch(
        `/api/trips/receipts?tripId=${tripId}&path=${encodeURIComponent(receipt.path)}`,
        { method: 'DELETE' }
      )
      if (!res.ok) throw new Error('Delete failed')
      setReceipts(prev => prev.filter(r => r.path !== receipt.path))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setDeletingPath(null)
    }
  }

  const isImage = (mime: string) => mime.startsWith('image/')
  const isPdf = (mime: string) => mime === 'application/pdf'

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-900">Receipts</h2>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          {uploading ? (
            <span className="animate-pulse">Uploading…</span>
          ) : (
            <>
              <span>+</span> Upload
            </>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          multiple
          onChange={handleUpload}
          className="hidden"
        />
      </div>

      {error && (
        <div className="mb-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {error}
          <button onClick={() => setError(null)} aria-label="Dismiss error" className="ml-2 text-red-400 hover:text-red-600">
            <svg className="inline h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
      )}

      {loading && !loaded && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-400">
          Loading receipts…
        </div>
      )}

      {loaded && receipts.length === 0 && (
        <div
          className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-8 text-center cursor-pointer hover:border-brand-300 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <p className="text-sm font-medium text-gray-600 mb-1">No receipts yet</p>
          <p className="text-xs text-gray-400">Upload boarding passes, hotel confirmations, or restaurant receipts.</p>
          <p className="text-xs text-gray-400 mt-1">Supports JPG, PNG, PDF (max 10 MB)</p>
        </div>
      )}

      {receipts.length > 0 && (
        <div className="space-y-2">
          {receipts.map((receipt) => (
            <div key={receipt.path} className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3">
              {/* Thumbnail / icon */}
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 shrink-0 flex items-center justify-center">
                {isImage(receipt.mimeType) && receipt.url ? (
                  <Image
                    src={receipt.url}
                    alt={receipt.name}
                    width={48}
                    height={48}
                    className="object-cover w-full h-full"
                    unoptimized
                  />
                ) : isPdf(receipt.mimeType) ? (
                  <span className="text-xs font-bold text-red-500r">PDF</span>
                ) : (
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                    />
                  </svg>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{receipt.name}</p>
                <p className="text-xs text-gray-400">
                  {receipt.createdAt ? formatDate(receipt.createdAt) : ''}
                  {receipt.size > 0 && ` · ${formatSize(receipt.size)}`}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {receipt.url && (
                  <a
                    href={receipt.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-brand-600 hover:text-brand-800 font-medium px-2 py-1 rounded-lg hover:bg-brand-50 transition-colors"
                  >
                    View
                  </a>
                )}
                <button
                  onClick={() => handleDelete(receipt)}
                  disabled={deletingPath === receipt.path}
                  className="text-xs text-red-400 hover:text-red-600 font-medium px-2 py-1 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {deletingPath === receipt.path ? '…' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
