export function Button({ className, ...props }) {
  return (
    <button
      className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 ${className}`}
      {...props}
    />
  )
}