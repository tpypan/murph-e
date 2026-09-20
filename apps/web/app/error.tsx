'use client'
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="content" className="empty">
      <h1>COULDN'T LOAD PAGE</h1>
      <button className="filter-button" type="button" onClick={reset}>
        TRY AGAIN
      </button>
      <a href="/">&lt; ARCADE</a>
    </main>
  )
}
