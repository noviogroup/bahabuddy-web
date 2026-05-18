import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Baha Buddy — Your AI Bahamas Travel Companion'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0c4a6e 0%, #0369a1 40%, #0e7490 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '80px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          <span
            style={{
              fontSize: '48px',
              fontWeight: 'bold',
              color: 'white',
            }}
          >
            Baha Buddy
          </span>
        </div>

        <div
          style={{
            fontSize: '64px',
            fontWeight: 'bold',
            color: 'white',
            lineHeight: 1.1,
            marginBottom: '24px',
            maxWidth: '800px',
          }}
        >
          Your AI Bahamas Travel Companion
        </div>

        <div
          style={{
            fontSize: '28px',
            color: '#67e8f9',
            maxWidth: '700px',
            lineHeight: 1.4,
          }}
        >
          Plan trips to 700+ islands · Book flights & hotels · Get AI travel advice
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: '60px',
            right: '80px',
            fontSize: '22px',
            color: '#bae6fd',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <span>App Store</span>
          <span style={{ color: '#7dd3fc' }}>·</span>
          <span>Google Play</span>
        </div>
      </div>
    ),
    { ...size }
  )
}
