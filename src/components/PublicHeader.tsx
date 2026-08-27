import MarketplacePublicHeader from '@/components/marketplace/MarketplacePublicHeader'

type PublicHeaderProps = {
  variant?: 'light' | 'dark'
  userEmail?: string | null
  displayName?: string | null
  authLoading?: boolean
  activePath?: string
}

export default function PublicHeader({
  userEmail,
  displayName,
  authLoading = false,
  activePath,
}: PublicHeaderProps) {
  return (
    <MarketplacePublicHeader
      userEmail={userEmail}
      displayName={displayName}
      authLoading={authLoading}
      activePath={activePath}
    />
  )
}
