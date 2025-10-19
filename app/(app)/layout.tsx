import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/header";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Protect all app routes - require authentication
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <>
      {/* Desktop and Portrait Mobile Layout */}
      <div className="flex min-h-screen flex-col landscape:hidden landscape:md:flex">
        <Header />
        <main className="flex-1">{children}</main>
      </div>

      {/* Landscape Mobile ONLY Layout - No header, just content */}
      <div className="hidden min-h-screen landscape:block landscape:md:hidden">
        <main className="h-screen">{children}</main>
      </div>
    </>
  );
}
