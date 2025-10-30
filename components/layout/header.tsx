import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Nav } from "@/components/layout/nav";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/review" className="flex items-center space-x-2">
          <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent sm:text-2xl">
            StudyBuddy
          </span>
        </Link>

        {/* Navigation - Hidden on mobile, shown on larger screens */}
        <div className="hidden md:flex md:flex-1 md:justify-center">
          <Nav />
        </div>

        {/* User Avatar - Clickable to Profile */}
        <div className="flex items-center">
          <Link href="/profile">
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "h-9 w-9 cursor-pointer hover:opacity-80 transition-opacity",
                },
              }}
            />
          </Link>
        </div>
      </div>

      {/* Mobile Navigation - Below header */}
      <div className="border-t md:hidden">
        <Nav />
      </div>
    </header>
  );
}
