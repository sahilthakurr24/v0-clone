import type { SVGProps } from "react";

export function V0CloneLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" {...props}>
      <rect width="32" height="32" rx="9" fill="currentColor" />
      <path
        d="M7.5 9.5 13.2 22.5h2.4l3-7 3 7h2.4l-5.7-13h-2.5l-3.8 8.3-2.6-8.3H7.5Z"
        fill="var(--background)"
      />
    </svg>
  );
}
