export function Button({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={`bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded ${className}`}
    >
      {children}
    </button>
  );
}
