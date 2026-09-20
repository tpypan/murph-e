import { resolve } from 'node:path'
import { syncCloud } from '../apps/cabinet/app/api/cloud-sync.ts'
import { ROOT } from '../packages/harness/src/env.ts'

process.loadEnvFile(resolve(ROOT, 'apps/cabinet/.env.local'))
const result = await syncCloud()
console.log(result)
if (result.pending) process.exitCode = 1
