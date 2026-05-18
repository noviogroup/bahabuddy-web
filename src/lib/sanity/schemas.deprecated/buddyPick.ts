/**
 * Sanity schema — BuddyPick
 *
 * Weekly rotating editorial pick on the home dashboard via
 * <BuddyPickCard>. Field names match the consumer 1:1.
 *
 * Plain JS object (no type imports from the `sanity` package, which
 * isn't a web-app dep — only Studio uses it). When this schema is
 * copied into a Studio config, the Studio's TypeScript will type-check
 * it on its end.
 */

const buddyPick = {
  name: 'buddyPick',
  title: "Buddy's Pick",
  type: 'document',
  fields: [
    {
      name: 'headline',
      title: 'Headline',
      description: 'The main pick — e.g. "Sunset sailing from Nassau Harbor"',
      type: 'string',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      validation: (Rule: any) => Rule.required().max(120),
    },
    {
      name: 'hook',
      title: 'Hook',
      description: 'One-sentence enticement — e.g. "Two hours, a cold drink, and the best view."',
      type: 'text',
      rows: 2,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      validation: (Rule: any) => Rule.required().max(200),
    },
    {
      name: 'image',
      title: 'Image',
      type: 'image',
      options: { hotspot: true },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'chatPrompt',
      title: 'Chat prompt',
      description:
        'What Buddy gets asked when a user taps the pick. e.g. "Tell me about sunset sailing from Nassau Harbor"',
      type: 'string',
    },
    {
      name: 'order',
      title: 'Rotation order',
      description: 'Lower numbers shown first in the weekly rotation.',
      type: 'number',
      initialValue: 100,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      validation: (Rule: any) => Rule.integer().min(0),
    },
  ],
  preview: {
    select: { title: 'headline', subtitle: 'hook', media: 'image' },
  },
}

export default buddyPick
