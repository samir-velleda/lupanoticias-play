/** Divisória horizontal. `strong` = 1px preto (seções); senão hairline. */
export function Divider({
  strong = false,
  className = '',
}: {
  strong?: boolean;
  className?: string;
}) {
  return (
    <hr
      className={`border-0 ${strong ? 'h-px bg-ink' : 'h-px bg-line'} ${className}`}
    />
  );
}
