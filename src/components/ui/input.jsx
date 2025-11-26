export function Input({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={`border rounded px-3 py-2 focus:outline-none focus:ring ${className}`}
    />
  );
}
