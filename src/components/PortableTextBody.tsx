import { PortableText } from '@portabletext/react'
import Image from 'next/image'
import imageUrlBuilder from '@sanity/image-url'
import { createClient } from '@sanity/client'

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? ''
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production'

const client = projectId
  ? createClient({ projectId, dataset, useCdn: true })
  : null

const builder = client ? imageUrlBuilder(client) : null

function urlFor(source: { asset?: { _ref?: string } }) {
  if (!builder || !source?.asset?._ref) return null
  return builder.image(source).auto('format').fit('max')
}

const components = {
  types: {
    image: ({ value }: { value: { asset?: { _ref?: string }; alt?: string } }) => {
      const imgUrl = urlFor(value)
      if (!imgUrl) return null
      return (
        <figure className="my-8">
          <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100">
            <Image
              src={imgUrl.width(1200).url()}
              alt={value.alt ?? ''}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 720px"
            />
          </div>
        </figure>
      )
    },
  },
  block: {
    h2: ({ children }: { children?: React.ReactNode }) => (
      <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">{children}</h2>
    ),
    h3: ({ children }: { children?: React.ReactNode }) => (
      <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-3">{children}</h3>
    ),
    h4: ({ children }: { children?: React.ReactNode }) => (
      <h4 className="text-lg font-semibold text-gray-800 mt-6 mb-2">{children}</h4>
    ),
    blockquote: ({ children }: { children?: React.ReactNode }) => (
      <blockquote className="border-l-4 border-brand-400 bg-brand-50 rounded-r-xl pl-5 pr-4 py-4 my-6 text-gray-700 italic">
        {children}
      </blockquote>
    ),
    normal: ({ children }: { children?: React.ReactNode }) => (
      <p className="text-base leading-relaxed text-gray-700 mb-4">{children}</p>
    ),
  },
  marks: {
    link: ({ children, value }: { children?: React.ReactNode; value?: { href?: string } }) => (
      <a
        href={value?.href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-brand-600 hover:text-brand-700 underline underline-offset-2"
      >
        {children}
      </a>
    ),
    strong: ({ children }: { children?: React.ReactNode }) => (
      <strong className="font-semibold text-gray-900">{children}</strong>
    ),
  },
  list: {
    bullet: ({ children }: { children?: React.ReactNode }) => (
      <ul className="list-disc pl-6 space-y-2 my-4 text-gray-700">{children}</ul>
    ),
    number: ({ children }: { children?: React.ReactNode }) => (
      <ol className="list-decimal pl-6 space-y-2 my-4 text-gray-700">{children}</ol>
    ),
  },
}

export default function PortableTextBody({ body }: { body: unknown[] }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <PortableText value={body as any} components={components as any} />
}
