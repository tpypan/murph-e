import type { Metadata } from 'next'
import { Press_Start_2P } from 'next/font/google'
import './globals.css'

const pixel = Press_Start_2P({ weight: '400', subsets: ['latin'], variable: '--font-pixel' })

export const metadata: Metadata = {
  title: 'Arcade',
  description: 'Say a game. Play it.',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`h-full bg-black ${pixel.variable}`}>
      <body className="min-h-full bg-black text-white">{children}</body>
    </html>
  )
}
