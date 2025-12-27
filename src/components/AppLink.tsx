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
  const hrefValue = typeof props.href === "string" ? props.href : undefined;
  const isExternal = !!hrefValue && (hrefValue.startsWith("http") || hrefValue.startsWith("//"));
  const isHash = !!hrefValue && hrefValue.startsWith("#");
  const targetBlank = props.target === "_blank";
  return (
    <Link
      {...props}
      ref={ref}
      onClick={(event) => {
        const isModified =
          event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
        if (!isModified && !targetBlank && !isExternal && !isHash) {
          start();
        }
        onClick?.(event);
      }}
    >
      {children}
    </Link>
  );
});

AppLink.displayName = "AppLink";

export default AppLink;
