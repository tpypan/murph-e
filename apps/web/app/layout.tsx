import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'

const pixel = localFont({
  src: './fonts/press-start-2p.woff2',
  variable: '--font-pixel',
  display: 'swap',
})
export const metadata: Metadata = {
  title: { default: 'Murph-e — The community arcade', template: '%s · Murph-e' },
  description:
    'Discover games imagined by the community, meet their creators, and follow every high score from the Murph-e arcade.',
}
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={pixel.variable}>
      <body>
        <a className="skip-link" href="#content">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  )
}
