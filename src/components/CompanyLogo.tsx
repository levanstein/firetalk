"use client";

import { useState } from "react";

export function CompanyLogo({
  url,
  size = 40,
  className = "",
}: {
  url: string;
  size?: number;
  className?: string;
}) {
  const [error, setError] = useState(false);

  let domain = "";
  try {
    domain = new URL(url).hostname.replace("www.", "");
  } catch {
    // invalid URL
  }

  if (!domain || error) {
    const initial = domain ? domain[0]!.toUpperCase() : "?";
    return (
      <div
        className={`rounded-full bg-gray-700 flex items-center justify-center text-white font-bold ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {initial}
      </div>
    );
  }

  return (
    <img
      src={`https://www.google.com/s2/favicons?sz=128&domain=${domain}`}
      alt={domain}
      width={size}
      height={size}
      className={`rounded-full bg-white ${className}`}
      onError={() => setError(true)}
    />
  );
}
