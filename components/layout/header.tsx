import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container max-w-7xl mx-auto flex h-16 items-center justify-between px-6">
        {/* Logo */}
        <Link href="/stacks" className="flex items-center space-x-2">
          <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent sm:text-2xl">
            StudyBuddy
          </span>
        </Link>

        {/* My Stacks Button */}
        <div className="flex items-center gap-3">
          <Link href="/stacks">
            <Button size="sm" className="hidden sm:flex">
              My Stacks
            </Button>
            <Button size="sm" className="sm:hidden">
              <BookOpen className="w-4 h-4" />
            </Button>
          </Link>

          {/* User Avatar - Clickable to Profile */}
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
    </header>
  );
}
