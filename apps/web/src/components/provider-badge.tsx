import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { providerFaviconUrl } from "@/lib/provider-logos";
import { cn } from "@/lib/utils";

function initials(value: string): string {
  return value
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ProviderBadge({
  provider,
  iconOnly = false,
  plain = false,
  size = "default",
}: {
  provider: string;
  iconOnly?: boolean;
  plain?: boolean;
  size?: "default" | "lg";
}) {
  const label = provider;
  const logoUrl = providerFaviconUrl(provider);

  if (iconOnly) {
    return (
      <Avatar aria-label={label} className="size-5" title={label}>
        {logoUrl && <AvatarImage alt="" className="object-contain p-0.5" src={logoUrl} />}
        <AvatarFallback className="text-[8px]">{initials(label)}</AvatarFallback>
      </Avatar>
    );
  }

  if (plain) {
    return (
      <div
        className={cn(
          "inline-flex items-center",
          size === "lg" ? "gap-2 text-sm" : "gap-1.5 text-xs",
        )}
      >
        <Avatar className={size === "lg" ? "size-5" : "size-4"}>
          {logoUrl && <AvatarImage alt="" className="object-contain p-0.5" src={logoUrl} />}
          <AvatarFallback className={size === "lg" ? "text-[8px]" : "text-[6px]"}>
            {initials(label)}
          </AvatarFallback>
        </Avatar>
        <span>{label}</span>
      </div>
    );
  }

  return (
    <Badge className={size === "lg" ? "h-7 gap-2 px-2.5 text-sm" : "gap-1.5"} variant="secondary">
      {logoUrl && (
        <Avatar className={size === "lg" ? "size-5" : "size-3.5"}>
          <AvatarImage alt="" className="object-contain p-0.5" src={logoUrl} />
          <AvatarFallback className={size === "lg" ? "text-[9px]" : "text-[7px]"}>
            {initials(label)}
          </AvatarFallback>
        </Avatar>
      )}
      {label}
    </Badge>
  );
}
