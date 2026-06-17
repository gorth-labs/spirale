import { Link, useLocation } from "wouter";
import { LayoutDashboard, Plus, BugPlay } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <aside className="w-64 border-r border-border bg-sidebar flex flex-col hidden md:flex">
        <div className="p-6">
          <Link href="/" className="flex items-center gap-2 mb-8">
            <svg
              width="26"
              height="26"
              viewBox="0 0 256 256"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
              className="text-primary"
            >
              <path d="M 256 256 L 128 256 L 0 128 L 128 128 Z M 256 128 L 128 128 L 0 0 L 128 0 Z" />
            </svg>
            <span className="text-xl font-playfair italic font-bold">Spirale</span>
          </Link>

          <nav className="space-y-1">
            <Link
              href="/dashboard"
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                location === "/dashboard"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              }`}
            >
              <LayoutDashboard size={18} />
              Dashboard
            </Link>
            <Link
              href="/test/new"
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                location === "/test/new"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              }`}
            >
              <Plus size={18} />
              New Test
            </Link>
          </nav>
        </div>
        <div className="mt-auto p-6">
          <Button variant="outline" className="w-full justify-start gap-2" asChild>
            <Link href="/test/new">
              <BugPlay size={16} /> Run Test
            </Link>
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
