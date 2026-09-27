"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const params = useParams();
  const projectId = params.id as string;

  const navItems = [
    { name: "Board", href: `/projects/${projectId}` },
    { name: "Milestones", href: `/projects/${projectId}/milestones` },
    { name: "Change Requests", href: `/projects/${projectId}/changes` },
    { name: "Updates", href: `/projects/${projectId}/updates` },
    { name: "Deal Room (Docs & Invoices)", href: `/projects/${projectId}/deal-room` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Project Details</h1>
        
        <div className="border-b">
          <nav className="-mb-px flex space-x-6" aria-label="Tabs">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm",
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  )}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="mt-6">{children}</div>
    </div>
  );
}
