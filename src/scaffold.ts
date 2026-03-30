/**
 * Scaffold — generates a new Ream project from templates.
 *
 * @implements FR59
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

export type Template = 'api' | 'web' | 'microservice' | 'slim'
export type Database = 'postgres' | 'sqlite'

export interface ScaffoldOptions {
  name: string
  template: Template
  database: Database
  directory: string
}

interface TemplateFile {
  path: string
  content: string
}

/** Generate project files for the given options. */
export function scaffold(options: ScaffoldOptions): TemplateFile[] {
  const files: TemplateFile[] = [
    ...generateCommonFiles(options),
    ...generateTemplateFiles(options),
  ]
  return files
}

/** Write scaffold files to disk. */
export function writeScaffold(options: ScaffoldOptions): void {
  const files = scaffold(options)
  for (const file of files) {
    const fullPath = path.join(options.directory, file.path)
    fs.mkdirSync(path.dirname(fullPath), { recursive: true })
    fs.writeFileSync(fullPath, file.content)
  }
}

function generateCommonFiles(options: ScaffoldOptions): TemplateFile[] {
  return [
    { path: 'package.json', content: packageJson(options) },
    { path: 'tsconfig.json', content: tsconfig() },
    { path: '.env', content: envFile(options) },
    { path: 'env.ts', content: envTyping(options) },
    { path: '.gitignore', content: gitignore() },
    { path: 'reamrc.ts', content: reamrc(options) },
  ]
}

function generateTemplateFiles(options: ScaffoldOptions): TemplateFile[] {
  switch (options.template) {
    case 'api':
      return apiTemplate(options)
    case 'slim':
      return slimTemplate(options)
    case 'microservice':
      return microserviceTemplate(options)
    case 'web':
      return apiTemplate(options) // Web shares API base for now
    default:
      return slimTemplate(options)
  }
}

function packageJson(options: ScaffoldOptions): string {
  const deps: Record<string, string> = {
    '@c9up/ream': '^0.1.0',
  }

  if (options.template !== 'slim') {
    deps['@c9up/pulsar'] = '^0.1.0'
    deps['@c9up/atlas'] = '^0.1.0'
    deps['@c9up/rune'] = '^0.1.0'
    deps['@c9up/warden'] = '^0.1.0'
    deps['@c9up/spectrum'] = '^0.1.0'
  }

  if (options.template === 'microservice') {
    deps['@c9up/pulsar'] = '^0.1.0'
    deps['@c9up/spectrum'] = '^0.1.0'
  }

  const imports: Record<string, string> = {
    '#modules/*': './app/modules/*',
    '#config/*': './config/*',
    '#providers/*': './providers/*',
    '#start/*': './start/*',
  }

  return JSON.stringify({
    name: options.name,
    version: '0.1.0',
    private: true,
    type: 'module',
    imports,
    scripts: {
      dev: 'tsx watch bin/server.ts',
      build: 'tsc',
      start: 'node dist/bin/server.js',
      test: 'vitest run',
    },
    dependencies: deps,
    devDependencies: {
      tsx: '^4',
      typescript: '^5.7',
      vitest: '^3',
    },
    engines: {
      node: '>=22.0.0',
    },
  }, null, 2)
}

function tsconfig(): string {
  return JSON.stringify({
    compilerOptions: {
      strict: true,
      target: 'ES2022',
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      outDir: 'dist',
      rootDir: '.',
      declaration: true,
      skipLibCheck: true,
      esModuleInterop: true,
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
      paths: {
        '#modules/*': ['./app/modules/*'],
        '#config/*': ['./config/*'],
        '#providers/*': ['./providers/*'],
        '#start/*': ['./start/*'],
      },
    },
    include: ['app', 'bin', 'config', 'providers', 'start', 'tests', 'reamrc.ts'],
  }, null, 2)
}

function envFile(options: ScaffoldOptions): string {
  const lines = [
    `APP_NAME=${options.name}`,
    'NODE_ENV=development',
    'PORT=3000',
    '',
  ]

  if (options.database === 'postgres') {
    lines.push(
      'DB_CONNECTION=postgres',
      'DB_HOST=localhost',
      'DB_PORT=5432',
      `DB_DATABASE=${options.name.replace(/-/g, '_')}`,
      'DB_USER=postgres',
      'DB_PASSWORD=secret',
    )
  } else {
    lines.push(
      'DB_CONNECTION=sqlite',
      `DB_FILENAME=./data/${options.name}.sqlite`,
    )
  }

  return lines.join('\n') + '\n'
}

function envTyping(options: ScaffoldOptions): string {
  const dbVars = options.database === 'postgres'
    ? `  DB_CONNECTION: 'postgres' | 'sqlite'
  DB_HOST: string
  DB_PORT: string
  DB_DATABASE: string
  DB_USER: string
  DB_PASSWORD: string`
    : `  DB_CONNECTION: 'postgres' | 'sqlite'
  DB_FILENAME: string`

  return `/**
 * Typed environment variables.
 *
 * This file declares the shape of your .env variables.
 * Import Env type in your code for autocompletion:
 *
 *   import type { Env } from '../env.js'
 *   const port = Number(process.env.PORT ?? '3000') // autocomplete on PORT
 */

export interface Env {
  APP_NAME: string
  NODE_ENV: 'development' | 'production' | 'test'
  PORT: string
${dbVars}
}

declare global {
  namespace NodeJS {
    interface ProcessEnv extends Env {}
  }
}
`
}

function gitignore(): string {
  return `node_modules/
dist/
.env
*.sqlite
data/
`
}

function reamrc(options: ScaffoldOptions): string {
  if (options.template === 'slim') {
    return `import { defineConfig } from '@c9up/ream'

export default defineConfig({
  providers: [],
  preloads: [],
})
`
  }

  return `import { defineConfig } from '@c9up/ream'

export default defineConfig({
  providers: [
    () => import('#providers/AppProvider.js'),
  ],
  preloads: [
    () => import('#start/routes.js'),
    () => import('#start/kernel.js'),
  ],
})
`
}

function apiTemplate(options: ScaffoldOptions): TemplateFile[] {
  return [
    {
      path: 'bin/server.ts',
      content: `import { Ignitor } from '@c9up/ream'

const app = new Ignitor({ port: Number(process.env.PORT ?? 3000) })
  .httpServer()
  .useRcFile(await import('./reamrc.js'))

await app.start()
`,
    },
    {
      path: 'providers/AppProvider.ts',
      content: `import { Provider } from '@c9up/ream'

export default class AppProvider extends Provider {
  register() {
    // Register bindings in the container
  }

  async boot() {
    // Connect to databases, verify services
  }

  async ready() {
    // Application is fully operational
  }

  async shutdown() {
    // Cleanup connections
  }
}
`,
    },
    {
      path: 'start/routes.ts',
      content: `import type { Router } from '@c9up/ream'

export default function (router: Router) {
  router.get('/', async (ctx) => {
    ctx.response!.headers['content-type'] = 'application/json'
    ctx.response!.body = JSON.stringify({ name: '${options.name}', status: 'running' })
  })

  router.group({ prefix: '/api/v1' }, (r) => {
    r.get('/health', async (ctx) => {
      ctx.response!.headers['content-type'] = 'application/json'
      ctx.response!.body = JSON.stringify({ status: 'ok' })
    })
  })
}
`,
    },
    {
      path: 'start/kernel.ts',
      content: `import type { MiddlewareRegistry } from '@c9up/ream'

export default function (middleware: MiddlewareRegistry) {
  // Global middleware — runs on every request
  middleware.use(async (ctx, next) => {
    const start = Date.now()
    await next()
    const duration = Date.now() - start
    ctx.response!.headers['x-response-time'] = \`\${duration}ms\`
  })
}
`,
    },
    {
      path: 'app/modules/health/controllers/HealthController.ts',
      content: `export class HealthController {
  async index(ctx: { response: { status: number; headers: Record<string, string>; body: string } }) {
    ctx.response.headers['content-type'] = 'application/json'
    ctx.response.body = JSON.stringify({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    })
  }
}
`,
    },
    {
      path: 'tests/unit/health.test.ts',
      content: `import { describe, expect, it } from 'vitest'
import { HealthController } from '#modules/health/controllers/HealthController.js'

describe('health', () => {
  it('returns ok status with uptime', () => {
    const ctrl = new HealthController()
    const ctx = { response: { status: 200, headers: {} as Record<string, string>, body: '' } }
    ctrl.index(ctx)
    const body = JSON.parse(ctx.response.body)
    expect(body.status).toBe('ok')
    expect(body.uptime).toBeGreaterThan(0)
    expect(body.timestamp).toBeDefined()
  })
})
`,
    },
    {
      path: 'tests/unit/validation.test.ts',
      content: `import { describe, expect, it } from 'vitest'
import { rules, schema } from '@c9up/rune'

const CreateOrderSchema = schema({
  total: rules.number().positive(),
  customerName: rules.string().min(1).max(255),
})

describe('validation', () => {
  it('validates correct input', () => {
    const result = CreateOrderSchema.validate({ total: 42.50, customerName: 'Alice' })
    expect(result.valid).toBe(true)
    expect(result.data).toBeDefined()
  })

  it('rejects invalid input with structured errors', () => {
    const result = CreateOrderSchema.validate({ total: -1, customerName: '' })
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0].field).toBeDefined()
    expect(result.errors[0].rule).toBeDefined()
    expect(result.errors[0].message).toBeDefined()
  })

  it('requires all fields', () => {
    const result = CreateOrderSchema.validate({})
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.rule === 'required')).toBe(true)
  })
})
`,
    },
    {
      path: 'tests/unit/container.test.ts',
      content: `import { describe, expect, it } from 'vitest'
import { Container } from '@c9up/ream'

describe('container', () => {
  it('resolves singleton bindings', () => {
    const container = new Container()
    container.singleton('config', () => ({ port: 3000 }))

    const a = container.resolve('config')
    const b = container.resolve('config')
    expect(a).toBe(b) // Same instance
  })

  it('override and restore for testing', () => {
    const container = new Container()
    container.singleton('db', () => ({ type: 'postgres' }))

    container.override('db', () => ({ type: 'sqlite' }))
    expect(container.resolve<{ type: string }>('db').type).toBe('sqlite')

    container.restore()
    expect(container.resolve<{ type: string }>('db').type).toBe('postgres')
  })
})
`,
    },
  ]
}

function slimTemplate(options: ScaffoldOptions): TemplateFile[] {
  return [
    {
      path: 'app.ts',
      content: `import { Ignitor } from '@c9up/ream'

const app = new Ignitor({ port: Number(process.env.PORT ?? 3000) })
  .httpServer()
  .routes((router) => {
    router.get('/', async (ctx) => {
      ctx.response!.body = 'Hello from ${options.name}!'
    })
  })

await app.start()
`,
    },
    {
      path: 'tests/app.test.ts',
      content: `import { describe, expect, it } from 'vitest'
import { Router } from '@c9up/ream'

describe('app', () => {
  it('router registers routes', () => {
    const router = new Router()
    router.get('/hello', async () => {})

    const match = router.match('GET', '/hello')
    expect(match).toBeDefined()
  })
})
`,
    },
  ]
}

function microserviceTemplate(options: ScaffoldOptions): TemplateFile[] {
  return [
    {
      path: 'bin/server.ts',
      content: `import { PulsarBus } from '@c9up/pulsar'
import { Logger, ConsoleChannel } from '@c9up/spectrum'

const bus = new PulsarBus()
const logger = new Logger({
  level: 'info',
  channels: [new ConsoleChannel('pretty')],
})

// Subscribe to events
bus.subscribe('order.*', (eventJson) => {
  const event = JSON.parse(eventJson)
  logger.info(\`Received: \${event.name}\`, { correlationId: event.correlationId })
})

logger.info('${options.name} microservice started')
`,
    },
    {
      path: 'tests/bus.test.ts',
      content: `import { describe, expect, it } from 'vitest'
import { PulsarBus } from '@c9up/pulsar'

describe('bus', () => {
  it('emits and subscribes', () => {
    const bus = new PulsarBus()
    let received = false
    bus.subscribe('test', () => { received = true })
    bus.emit('test', '{}')
    expect(received).toBe(true)
  })
})
`,
    },
  ]
}
