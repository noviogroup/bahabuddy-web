import MarketplacePublicHeader from '@/components/marketplace/MarketplacePublicHeader'

type PublicHeaderProps = {
  variant?: 'light' | 'dark'
  userEmail?: string | null
  authLoading?: boolean
  activePath?: string
}

export default function PublicHeader({ userEmail, authLoading = false, activePath }: PublicHeaderProps) {
  return <MarketplacePublicHeader userEmail={userEmail} authLoading={authLoading} activePath={activePath} />
}
