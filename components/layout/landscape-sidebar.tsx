"use client";

import { usePathname, useRouter } from "next/navigation";
import { BookOpen, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

export function LandscapeSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    {
      href: "/review",
      icon: BookOpen,
      label: "Review",
    },
    {
      href: "/test",
      icon: Mic,
      label: "Test",
    },
  ];

  return (
    <div className="fixed left-0 top-0 z-50 hidden h-screen w-16 flex-col items-center gap-4 border-r bg-background py-4 landscape:flex lg:hidden">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
          <button
            key={item.href}
            onClick={() => router.push(item.href)}
            className={cn(
              "flex h-12 w-12 flex-col items-center justify-center gap-1 rounded-lg transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
