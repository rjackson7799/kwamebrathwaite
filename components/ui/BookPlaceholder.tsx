interface BookPlaceholderProps {
  title: string
  author?: string
  className?: string
}

export function BookPlaceholder({ title, author, className = '' }: BookPlaceholderProps) {
  return (
    <div className={`w-full h-full bg-black flex items-center justify-center ${className}`}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 400 500"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        aria-hidden="true"
      >
        <rect width="400" height="500" fill="#000000" />

        {/* Border frame */}
        <rect x="20" y="20" width="360" height="460" stroke="#B8945F" strokeWidth="0.5" fill="none" />

        {/* Title */}
        <text
          x="50%"
          y="42%"
          dominantBaseline="middle"
          textAnchor="middle"
          fill="#FFFFFF"
          fontFamily="'Playfair Display', Georgia, serif"
          fontSize="44"
          fontWeight="500"
          letterSpacing="0.02em"
        >
          <tspan x="50%" dy="-0.6em">{title.split(' ').slice(0, 2).join(' ')}</tspan>
          <tspan x="50%" dy="1.3em">{title.split(' ').slice(2).join(' ')}</tspan>
        </text>

        {/* Decorative line */}
        <line x1="120" y1="280" x2="280" y2="280" stroke="#B8945F" strokeWidth="1" />

        {/* Author name in gold */}
        {author && (
          <text
            x="50%"
            y="67%"
            dominantBaseline="middle"
            textAnchor="middle"
            fill="#B8945F"
            fontFamily="'Playfair Display', Georgia, serif"
            fontSize="18"
            fontWeight="400"
            letterSpacing="0.08em"
          >
            {author}
          </text>
        )}
      </svg>
    </div>
  )
}
