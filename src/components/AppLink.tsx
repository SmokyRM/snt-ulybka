"use client";

import Link, { LinkProps } from "next/link";
import { forwardRef } from "react";
import { useRouteLoader } from "@/components/RouteLoaderProvider";

type AppLinkProps = LinkProps &
  React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    children: React.ReactNode;
  };

const AppLink = forwardRef<HTMLAnchorElement, AppLinkProps>(({ onClick, children, ...props }, ref) => {
  const { start } = useRouteLoader();
  return (
    <Link
      {...props}
      ref={ref}
      onClick={(event) => {
        start();
        onClick?.(event);
      }}
    >
      {children}
    </Link>
  );
});

AppLink.displayName = "AppLink";

export default AppLink;
