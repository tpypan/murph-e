import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'HTN Arcade',
  description: 'Say a game. Play it.',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className="h-full bg-black">
      <body className="min-h-full bg-black text-white">{children}</body>
    </html>
  )
}
