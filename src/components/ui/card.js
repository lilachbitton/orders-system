export function Card({ className, ...props }) {
  return <div className={`bg-white rounded-lg shadow ${className}`} {...props} />
}

export function CardContent({ className, ...props }) {
  return <div className={`p-6 ${className}`} {...props} />
}