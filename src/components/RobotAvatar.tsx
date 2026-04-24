interface RobotAvatarProps {
  className?: string;
}

export function RobotAvatar({ className }: RobotAvatarProps) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 100 100" 
      xmlns="http://www.w3.org/2000/svg"
      style={{ backgroundColor: '#003366', borderRadius: '50%' }}
    >
      <g fill="#FFFFFF">
        {/* Antenna */}
        <rect x="48" y="15" width="4" height="15" />
        <circle cx="50" cy="12" r="5" />
        
        {/* Head */}
        <rect x="22" y="30" width="56" height="44" rx="12" />
        
        {/* Eyes */}
        <circle cx="36" cy="48" r="6" fill="#003366" />
        <circle cx="64" cy="48" r="6" fill="#003366" />
        <circle cx="34" cy="46" r="2" fill="#FFFFFF" />
        <circle cx="62" cy="46" r="2" fill="#FFFFFF" />
        
        {/* Friendly Smile */}
        <path d="M 35 60 Q 50 72 65 60" stroke="#003366" strokeWidth="4" fill="none" strokeLinecap="round" />
        
        {/* Ears */}
        <rect x="16" y="44" width="6" height="16" rx="2" />
        <rect x="78" y="44" width="6" height="16" rx="2" />
      </g>
    </svg>
  );
}
