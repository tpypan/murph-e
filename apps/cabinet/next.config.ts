import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // The harness and probe are workspace TypeScript sources; bundle them.
  transpilePackages: ['@htn/harness', '@htn/probe'],
  // Playwright and the OpenAI SDK stay as real node_modules at runtime.
  serverExternalPackages: ['playwright', 'openai', 'dotenv'],
  // The repo's own AGENTS.md is the source of truth.
  agentRules: false,
}

export default nextConfig
