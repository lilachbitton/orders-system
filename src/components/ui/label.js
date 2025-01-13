export function Label({ className, ...props }) {
  return <label className={`block text-sm font-medium ${className}`} {...props} />
}