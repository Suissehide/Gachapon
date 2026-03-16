import ThemeToggle from './custom/themeToggle.tsx'

function Navbar() {
  return (
    <div className="px-4 py-2 flex justify-between items-center bg-background text-text border-b border-border">
      <div className="flex items-center gap-4">{/* Navigation links */}</div>
      <div className="flex gap-4 items-center">
        <ThemeToggle />
      </div>
    </div>
  )
}

export default Navbar
