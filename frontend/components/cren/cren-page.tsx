import { cn } from "@/lib/utils";

type CrenPageProps = {
  children: React.ReactNode;
  /** Default max 1200px */
  narrow?: boolean;
  /** Max 1280px (blog grids, wide layouts) */
  wide?: boolean;
  className?: string;
};

export function CrenPage({ children, narrow, wide, className }: CrenPageProps) {
  const inner =
    wide === true ? "cren-inner-wide" : narrow === true ? "cren-inner-narrow" : "cren-inner";
  return (
    <div className={cn("cren-page", className)}>
      <div className={inner}>{children}</div>
    </div>
  );
}
