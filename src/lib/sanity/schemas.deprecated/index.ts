/**
 * Sanity schemas — barrel export.
 *
 * Import all schemas in your Sanity Studio config like this:
 *
 *   import { schemaTypes } from '@/lib/sanity/schemas'
 *
 *   export default defineConfig({
 *     name: 'default',
 *     title: 'Baha Buddy CMS',
 *     projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
 *     dataset:   process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
 *     plugins:   [structureTool(), visionTool()],
 *     schema:    { types: schemaTypes },
 *   })
 *
 * Type: each schema is a plain JS object compatible with Sanity's
 * defineType signature. We don't import the strict Sanity type here
 * because the `sanity` package isn't a dep of the web app (it's
 * Studio-only). A receiving Studio will type-check it on its end.
 */

import buddyPick from './buddyPick'
import travelTip from './travelTip'
import discoverArticle from './discoverArticle'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const schemaTypes: any[] = [buddyPick, travelTip, discoverArticle]
