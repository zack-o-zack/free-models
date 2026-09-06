export function LimitTerm({ term }: { term: string }) {
  const match = term.match(/^([\d,.]+[kKmMbB]?)\s+(.+?)(?:\s+(\(.+\)))?$/);

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 shadow-sm">
      {match ? (
        <>
          <span className="font-heading text-sm font-bold text-foreground">{match[1]}</span>
          <span className="text-xs font-medium text-muted-foreground">
            {match[2]}
            {match[3] && <span className="text-muted-foreground/60"> {match[3]}</span>}
          </span>
        </>
      ) : (
        <span className="text-xs font-medium text-foreground">{term}</span>
      )}
    </div>
  );
}
