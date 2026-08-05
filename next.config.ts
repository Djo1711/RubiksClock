import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /**
   * `cubing` computes random-state scrambles in a worker, and its worker entry
   * loads sibling chunks by relative path. Bundling it rewrites those paths, so
   * the worker never starts — in the browser it 404s, and in a serverless
   * function it hangs until the invocation times out. Marking it external keeps
   * the package intact under node_modules, where the worker can still find its
   * siblings, and lets file tracing pull the real files into the function.
   *
   * See cubing/cubing.js#309 and #327 for the upstream bundling issue.
   */
  serverExternalPackages: ['cubing'],
}

export default nextConfig
