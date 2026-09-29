"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function ProjectNav({ projectId }: { projectId: string }) {
  const pathname = usePathname();

  const navItems = [
    { name: "Overview", href: `/projects/${projectId}` },
    { name: "Task Board", href: `/projects/${projectId}/board` },
    { name: "Milestones", href: `/projects/${projectId}/milestones` },
    { name: "Change Requests", href: `/projects/${projectId}/changes` },
    { name: "Updates", href: `/projects/${projectId}/updates` },
    { name: "Deal Room (Docs & Invoices)", href: `/projects/${projectId}/deal-room` },
  ];

  return (
    <div className="border-b overflow-x-auto">
      <nav className="-mb-px flex space-x-6 min-w-max" aria-label="Tabs">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors",
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
  );
}
