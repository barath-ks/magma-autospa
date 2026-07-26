import Link from "next/link";
import { ChevronRight } from "lucide-react";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

export default function Breadcrumbs({ items, accentClass = "hover:text-accent-copper" }: { items: BreadcrumbItem[], accentClass?: string }) {
  return (
    <nav className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary mb-8">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <div key={index} className="flex items-center gap-2">
            {item.href && !isLast ? (
              <Link href={item.href} className={`${accentClass} transition-colors`}>
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "text-text-primary" : ""}>{item.label}</span>
            )}
            {!isLast && <ChevronRight size={12} className="text-border-hairline-strong" />}
          </div>
        );
      })}
    </nav>
  );
}
