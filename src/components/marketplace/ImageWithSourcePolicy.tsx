"use client";

import Image from "next/image";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

type ImageTone =
  "brand" | "stay" | "restaurant" | "activity" | "deal" | "island" | "neutral";

type ImageWithSourcePolicyProps = {
  src?: string | null;
  alt: string;
  title: string;
  eyebrow: string;
  className?: string;
  imageClassName?: string;
  sizes?: string;
  priority?: boolean;
  /**
   * Omit to let the component decide per source (see
   * shouldOptimizeImageSrc). Pass `true` to force the raw original.
   */
  unoptimized?: boolean;
  tone?: ImageTone;
  style?: CSSProperties;
  children?: ReactNode;
};

const TONE_CLASS: Record<ImageTone, string> = {
  brand: "from-gray-50 via-white to-gray-100 text-charcoal",
  stay: "from-gray-50 via-white to-gray-100 text-charcoal",
  restaurant: "from-gray-50 via-white to-gray-100 text-charcoal",
  activity: "from-gray-50 via-white to-gray-100 text-charcoal",
  deal: "from-gray-50 via-white to-gray-100 text-charcoal",
  island: "from-brand-100 via-brand-50 to-gold-50 text-charcoal",
  neutral: "from-gray-50 via-white to-gray-100 text-charcoal",
};

/**
 * Remote hosts that are safe to send through the Next/Netlify image optimizer.
 * Every entry MUST also be listed in next.config.mjs `images.remotePatterns`
 * (tests/components/image-source-policy.test.tsx enforces this), otherwise the
 * optimizer rejects the URL and the card falls back to the placeholder.
 *
 * Deliberately NOT optimized even though some are allowlisted: googleusercontent / maps API
 * photo hosts (provider terms restrict re-hosting/transforming), LiteAPI /
 * TripAdvisor / arbitrary provider CDNs stored in the database (not
 * allowlisted), and SVGs (dangerouslyAllowSVG is off).
 */
const OPTIMIZABLE_REMOTE_HOSTS: ReadonlyArray<{ host: string; pathPrefix?: string }> = [
  { host: ".supabase.co", pathPrefix: "/storage/v1/object/public/" },
  { host: "cdn.sanity.io" },
  { host: "tempo.cdn.tambourine.com" },
  { host: "www.nassauparadiseisland.com" },
  { host: "images.unsplash.com" },
  { host: "upload.wikimedia.org" },
];

export const OPTIMIZABLE_IMAGE_HOSTS = OPTIMIZABLE_REMOTE_HOSTS.map(
  (entry) => entry.host,
);

export function shouldOptimizeImageSrc(src: string): boolean {
  if (/\.svg(?:[?#]|$)/i.test(src)) return false;

  if (src.startsWith("/")) {
    // Local /public assets are optimized; same-origin API proxies
    // (e.g. /api/place-photo) and protocol-relative URLs are not.
    return !src.startsWith("//") && !src.startsWith("/api/");
  }

  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;

  return OPTIMIZABLE_REMOTE_HOSTS.some(({ host, pathPrefix }) => {
    const hostMatches = host.startsWith(".")
      ? url.hostname.endsWith(host)
      : url.hostname === host;
    return hostMatches && (!pathPrefix || url.pathname.startsWith(pathPrefix));
  });
}

function validImageUrl(value: string | null | undefined): string | null {
  const url = value?.trim();
  if (!url || (!/^https?:\/\//i.test(url) && !url.startsWith("/"))) return null;
  return url;
}

export default function ImageWithSourcePolicy({
  src,
  alt,
  title,
  eyebrow,
  className = "h-48",
  imageClassName = "object-cover transition-transform duration-500 group-hover:scale-105",
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  priority = false,
  unoptimized,
  tone = "brand",
  style,
  children,
}: ImageWithSourcePolicyProps) {
  const [failed, setFailed] = useState(false);
  const imageSrc = validImageUrl(src);
  const hasImage = Boolean(imageSrc && !failed);
  const skipOptimization =
    unoptimized ?? (imageSrc ? !shouldOptimizeImageSrc(imageSrc) : true);

  useEffect(() => {
    setFailed(false);
  }, [imageSrc]);

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br ${TONE_CLASS[tone]} ${className}`}
      style={style}
    >
      {hasImage ? (
        <Image
          src={imageSrc as string}
          alt={alt}
          fill
          loading={priority ? "eager" : "lazy"}
          priority={priority}
          className={imageClassName}
          sizes={sizes}
          unoptimized={skipOptimization}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col justify-end p-4 text-night">
          {tone === "island" && (
            <svg
              aria-hidden="true"
              viewBox="0 0 800 240"
              className="absolute inset-x-0 bottom-0 h-full w-full text-brand-300 opacity-45"
              preserveAspectRatio="none"
            >
              <path
                d="M-40 118 C120 42 250 188 410 112 C555 44 675 160 840 84"
                fill="none"
                stroke="currentColor"
                strokeWidth="10"
              />
              <path
                d="M-40 170 C120 94 250 240 410 164 C555 96 675 212 840 136"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
              />
            </svg>
          )}
          <div>
            <p className="text-xs font-bold uppercase opacity-90">{eyebrow}</p>
            <p className="mt-1 max-w-[14rem] text-lg font-bold leading-tight">
              {title}
            </p>
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
