import Link from 'next/link'
export default function NotFound() {
  return (
    <main id="content" className="empty">
      <h1>GAME NOT FOUND</h1>
      <Link href="/">&lt; ARCADE</Link>
    </main>
  )
}
