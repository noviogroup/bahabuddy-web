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
  unoptimized = true,
  tone = "brand",
  style,
  children,
}: ImageWithSourcePolicyProps) {
  const [failed, setFailed] = useState(false);
  const imageSrc = validImageUrl(src);
  const hasImage = Boolean(imageSrc && !failed);

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
          unoptimized={unoptimized}
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
