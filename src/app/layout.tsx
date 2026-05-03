import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Baha Buddy — Your Bahamas Travel Companion',
  description:
    'Plan your perfect Bahamas trip with Baha Buddy. Discover islands, attractions, deals, and get AI-powered travel advice.',
  keywords: ['Bahamas', 'travel', 'vacation', 'islands', 'trip planner'],
  openGraph: {
    title: 'Baha Buddy — Your Bahamas Travel Companion',
    description: 'Plan your perfect Bahamas trip with Baha Buddy.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
