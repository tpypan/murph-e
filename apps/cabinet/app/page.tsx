import { speechProvider } from '@htn/harness'
import Cabinet from './cabinet'

export default function Home() {
  return <Cabinet speechProvider={speechProvider()} />
}
