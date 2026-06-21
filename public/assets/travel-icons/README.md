# Travel Icons

Extracted from `/Users/ShowmanIT/Downloads/Travel Icon Pack/20-Travel-Icon-design.eps`.

Each icon is a transparent `512x512` PNG. The source EPS contained a 20-icon grid; these files are cropped from the line art only, without the original rounded card backgrounds.

## Variants

- `brand_blue/` uses Baha Buddy blue `#2E78D2`.
- `gold/` uses Baha Buddy gold `#F5B731`.
- `dark/` uses dark ink `#070D1A`.
- `white/` uses white `#FFFFFF`.

## Usage

These files live in `public/assets/travel-icons/`, so Next.js serves them from `/assets/travel-icons/`.

HTML example:

```html
<img src="/assets/travel-icons/brand_blue/16_airplane.png" alt="" />
```

`next/image` example:

```tsx
import Image from 'next/image'

<Image
  src="/assets/travel-icons/brand_blue/16_airplane.png"
  alt=""
  width={64}
  height={64}
/>
```
