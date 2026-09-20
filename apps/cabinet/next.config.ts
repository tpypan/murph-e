import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // A second dev instance (for example on port 5000 while the cabinet runs on
  // 3000) needs its own build dir, because Next locks `<distDir>/lock`.
  distDir: process.env.HTN_NEXT_DIST_DIR || '.next',
  devIndicators: false,
  // The harness and probe are workspace TypeScript sources; bundle them.
  transpilePackages: ['@htn/harness', '@htn/probe', '@htn/badge'],
  // Playwright and the OpenAI SDK stay as real node_modules at runtime.
  serverExternalPackages: [
    'playwright',
    'openai',
    'dotenv',
    'serialport',
    '@serialport/bindings-cpp',
  ],
  // The repo's own AGENTS.md is the source of truth.
  agentRules: false,
}

export default nextConfig
