"use client";

import Link from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";

type AdminHomeLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
};

export default function AdminHomeLink({ children, onClick, ...props }: AdminHomeLinkProps) {
  return (
    <Link
      href="/"
      prefetch={false}
      {...props}
      onClick={(event) => {
        document.cookie = "admin_view=admin; path=/; max-age=2592000; samesite=lax";
        onClick?.(event);
      }}
    >
      {children}
    </Link>
  );
}
