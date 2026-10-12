"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function ProjectNav({ projectId }: { projectId: string }) {
  const pathname = usePathname();

  // In the order a project moves: plan money, do the work, handle changes, report, paperwork
  const navItems = [
    { name: "Overview", href: `/projects/${projectId}` },
    { name: "Milestones & billing", href: `/projects/${projectId}/milestones` },
    { name: "Tasks", href: `/projects/${projectId}/board` },
    { name: "Change requests", href: `/projects/${projectId}/changes` },
    { name: "Client updates", href: `/projects/${projectId}/updates` },
    { name: "Proposal & contract", href: `/projects/${projectId}/deal-room` },
  ];

  return (
    <div className="border-b overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <nav className="-mb-px flex gap-6 min-w-max" aria-label="Project sections">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "whitespace-nowrap py-2.5 px-0.5 border-b-2 text-[13.5px] font-medium transition-colors",
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
