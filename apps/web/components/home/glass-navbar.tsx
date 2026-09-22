"use client";

import { UserButton } from "@repo/auth/buttons";
import Link from "next/link";
import { V0CloneLogo } from "@/components/brand/v0-clone-logo";

export function GlassNavbar() {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <nav
        className="pointer-events-auto flex h-12 w-full max-w-3xl items-center justify-between rounded-full border border-white/30 bg-background/70 px-4 backdrop-blur-xl supports-backdrop-filter:bg-background/50
          shadow-[0_0_20px_rgba(255,255,255,0.15),inset_0_1px_0_rgba(255,255,255,0.25)]
          transition-shadow duration-300
          hover:shadow-[0_0_28px_rgba(255,255,255,0.25),inset_0_1px_0_rgba(255,255,255,0.35)]"
      >
        <Link
          href="/"
          className="flex items-center gap-2 text-foreground transition-opacity hover:opacity-80"
          aria-label="v0 clone home"
        >
          <V0CloneLogo className="size-7" />
          <span className="text-sm font-semibold tracking-tight">v0 clone</span>
        </Link>
        <UserButton />
      </nav>
    </header>
  );
}