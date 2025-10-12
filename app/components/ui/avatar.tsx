type AvatarProps = {
  src?: string | null;
  name?: string | null;
  size?: "sm" | "md" | "lg";
};

const sizeMap: Record<NonNullable<AvatarProps["size"]>, string> = {
  sm: "h-8 w-8 text-sm",
  md: "h-10 w-10 text-base",
  lg: "h-12 w-12 text-lg",
};

export function Avatar({ src, name, size = "sm" }: AvatarProps) {
  const initials = name
    ?.split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white ${sizeMap[size]}`}
    >
      {src ? (
        <img
          src={src}
          alt={name ?? "Avatar"}
          className="h-full w-full rounded-full object-cover"
        />
      ) : initials ? (
        initials
      ) : (
        <span className="text-xs opacity-80">?</span>
      )}
    </div>
  );
}
