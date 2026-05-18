/**
 * Sanity schema — TravelTip
 *
 * Daily rotating editorial tip on the home dashboard via <TravelTipCard>.
 * Field names match the consumer 1:1. Category drives the badge color.
 *
 * Plain JS object (no type imports from the `sanity` package, which
 * isn't a web-app dep).
 */

const travelTip = {
  name: 'travelTip',
  title: 'Travel Tip',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title',
      description: 'Bold headline — e.g. "Book flights 6–8 weeks out"',
      type: 'string',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      validation: (Rule: any) => Rule.required().max(80),
    },
    {
      name: 'body',
      title: 'Body',
      description: 'One or two sentences of explanation.',
      type: 'text',
      rows: 3,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      validation: (Rule: any) => Rule.required().max(280),
    },
    {
      name: 'category',
      title: 'Category',
      description: 'Drives the badge color and label.',
      type: 'string',
      options: {
        list: [
          { title: 'Practical', value: 'practical' },
          { title: 'Cultural',  value: 'cultural' },
          { title: 'Seasonal',  value: 'seasonal' },
        ],
        layout: 'radio',
      },
      initialValue: 'practical',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'order',
      title: 'Rotation order',
      description: 'Lower numbers shown first in the daily rotation.',
      type: 'number',
      initialValue: 100,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      validation: (Rule: any) => Rule.integer().min(0),
    },
  ],
  preview: {
    select: { title: 'title', subtitle: 'body' },
  },
}

export default travelTip
