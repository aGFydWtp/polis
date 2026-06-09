interface VoteIconProps {
  size?: number
  fill?: string
}

export default function AgreeIcon({ size = 24, fill = '#e3e3e3' }: VoteIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height={size}
      viewBox="0 -960 960 960"
      width={size}
      fill={fill}
      aria-hidden="true"
    >
      <path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z" />
    </svg>
  )
}
