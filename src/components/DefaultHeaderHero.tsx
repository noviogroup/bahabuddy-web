import Image from 'next/image'
import type { ResolvedHeaderImage } from '@/lib/default-headers'

interface DefaultHeaderHeroProps {
  eyebrow?: string
  title: string
  subtitle?: string
  header: ResolvedHeaderImage
  align?: 'left' | 'center'
  heightClassName?: string
}

export default function DefaultHeaderHero({
  eyebrow,
  title,
  subtitle,
  header,
  align = 'center',
  heightClassName = 'min-h-[280px] md:min-h-[360px]',
}: DefaultHeaderHeroProps) {
  const centered = align === 'center'

  return (
    <section className={`relative overflow-hidden text-white ${heightClassName}`}>
      <Image
        src={header.url}
        alt={header.alt}
        fill
        priority
        className="object-cover"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-black/10" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
      <div className={`relative z-[1] max-w-6xl mx-auto px-4 py-16 md:py-24 flex ${centered ? 'items-center justify-center text-center' : 'items-center'}`}>
        <div className={centered ? 'max-w-3xl mx-auto' : 'max-w-2xl'}>
          {eyebrow && <p className="text-white/80 text-sm font-semibold tracking-widest uppercase mb-3">{eyebrow}</p>}
          <h1 className="text-4xl md:text-6xl font-bold mb-4 tracking-tight drop-shadow-sm">{title}</h1>
          {subtitle && <p className="text-white/90 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">{subtitle}</p>}
        </div>
      </div>
    </section>
  )
}
