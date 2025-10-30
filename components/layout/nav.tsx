"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Mic, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    label: "Review",
    href: "/review",
    icon: BookOpen,
  },
  {
    label: "Test",
    href: "/test",
    icon: Mic,
  },
  {
    label: "My Cards",
    href: "/my-cards",
    icon: CreditCard,
  },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="flex w-full md:w-auto">
      <ul className="flex w-full md:w-auto md:space-x-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <li key={item.href} className="flex-1 md:flex-none">
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-3 py-2 text-sm font-medium transition-colors md:flex-row md:gap-2 md:rounded-md md:px-4",
                  isActive
                    ? "text-foreground bg-muted md:bg-muted"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Icon className="h-5 w-5 md:h-4 md:w-4" />
                <span className="text-xs md:text-sm">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
