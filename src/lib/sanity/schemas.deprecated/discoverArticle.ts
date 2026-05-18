/**
 * Sanity schema — DiscoverArticle
 *
 * Long-form editorial pieces in the Discover tab of /explore.
 *
 * Phase 1 (C.7): only card-level fields surface. The full Portable Text
 * body is captured but won't render until C.7b adds a /explore/[slug]
 * route.
 *
 * Plain JS object (no type imports from the `sanity` package, which
 * isn't a web-app dep).
 */

const discoverArticle = {
  name: 'discoverArticle',
  title: 'Discover Article',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      validation: (Rule: any) => Rule.required().max(120),
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 80 },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'excerpt',
      title: 'Excerpt',
      description: 'Card preview text, 1–2 sentences.',
      type: 'text',
      rows: 3,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      validation: (Rule: any) => Rule.required().max(220),
    },
    {
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: [
          { title: 'Beaches',     value: 'Beaches' },
          { title: 'Experiences', value: 'Experiences' },
          { title: 'Adventure',   value: 'Adventure' },
          { title: 'Food',        value: 'Food' },
          { title: 'Sailing',     value: 'Sailing' },
          { title: 'Budget',      value: 'Budget' },
          { title: 'Luxury',      value: 'Luxury' },
          { title: 'Culture',     value: 'Culture' },
          { title: 'Family',      value: 'Family' },
        ],
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'readTime',
      title: 'Read time',
      description: 'e.g. "7 min"',
      type: 'string',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'heroImage',
      title: 'Hero image',
      type: 'image',
      options: { hotspot: true },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'buddyPrompt',
      title: 'Buddy prompt',
      description:
        'What Buddy gets asked when a user taps the card. Phase 1 — every click opens chat with this prompt. C.7b will replace with article-page navigation.',
      type: 'string',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'body',
      title: 'Article body',
      description: 'Long-form content. Surfaces when /explore/[slug] is built (C.7b).',
      type: 'array',
      of: [{ type: 'block' }, { type: 'image', options: { hotspot: true } }],
    },
    {
      name: 'publishedAt',
      title: 'Published at',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
    },
  ],
  preview: {
    select: { title: 'title', subtitle: 'category', media: 'heroImage' },
  },
}

export default discoverArticle
