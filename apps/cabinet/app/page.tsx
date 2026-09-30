import { speechProvider } from '@htn/harness'
import Cabinet from './cabinet'

export default function Home() {
  const piMode = process.env.MURPH_PI === '1'
  return <Cabinet piMode={piMode} speechProvider={piMode ? 'local' : speechProvider()} />
}

export const dynamic = 'force-dynamic'
