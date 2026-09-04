"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Users, User, Settings, LogOut } from "lucide-react";
import { Logo } from "./logo";
import { Avatar } from "@/components/ui/avatar";
import { useAppState } from "@/components/providers/app-state-provider";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/dashboard", label: "Play", icon: Home },
  { href: "/friends", label: "Friends", icon: Users },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function LeftRail() {
  const pathname = usePathname();
  const router = useRouter();
  const { session, signOut } = useAppState();

  const doSignOut = () => {
    signOut();
    router.push("/");
  };

  return (
    <>
      {/* mobile top bar — logo (back to the landing page) + sign out, since the
          desktop rail's bottom section isn't shown at this width */}
      <header className="md:hidden fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-surface px-4">
        <Link href="/" aria-label="Find Vedha — landing page">
          <Logo size={18} />
        </Link>
        <button
          aria-label="Sign out"
          className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-danger"
          onClick={doSignOut}
        >
          <LogOut size={16} />
        </button>
      </header>

      {/* desktop rail */}
      <aside className="hidden md:flex sticky top-0 h-dvh w-[220px] shrink-0 flex-col border-r border-line bg-surface">
        <div className="px-5 py-5">
          <Link href="/" aria-label="Find Vedha — landing page">
            <Logo />
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-surface-2 text-text"
                    : "text-muted hover:text-text hover:bg-surface-2",
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-signal" />
                )}
                <Icon size={17} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-line p-3">
          <div className="flex items-center gap-3 rounded-md px-2 py-2">
            <Avatar name={session?.username ?? "You"} size={30} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm text-text">{session?.username ?? "You"}</div>
              <div className="font-mono text-[0.6875rem] text-faint">Signal II</div>
            </div>
            <button
              aria-label="Sign out"
              className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-danger"
              onClick={doSignOut}
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* mobile bottom bar */}
      <nav className="md:hidden fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2 text-[0.625rem]",
                active ? "text-signal" : "text-muted",
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
