import type { ReactNode } from "react";

export default function SectionCard({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="theme-card rounded-2xl border p-6 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          {description ? <p className="text-sm">{description}</p> : null}
        </div>
        {actions ? <div className="text-sm">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}


