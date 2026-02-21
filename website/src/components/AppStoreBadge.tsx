export default function AppStoreBadge({
  className = "",
}: {
  className?: string;
}) {
  return (
    <a
      href="https://apps.apple.com/app/id6756803475"
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-block ${className}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 120 40"
        className="h-[50px] w-auto"
      >
        <rect width="120" height="40" rx="6" fill="#000" />
        <text
          x="60"
          y="15"
          textAnchor="middle"
          fill="#fff"
          fontSize="7"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          Download on the
        </text>
        <text
          x="60"
          y="28"
          textAnchor="middle"
          fill="#fff"
          fontSize="12"
          fontWeight="600"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          App Store
        </text>
      </svg>
    </a>
  );
}
