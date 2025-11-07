import { Header } from "@/components/layout/header";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
