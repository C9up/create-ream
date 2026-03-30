import { describe, expect, it } from 'vitest'
import { scaffold } from '../../src/scaffold.js'

describe('create-ream > scaffold', () => {
  describe('api template', () => {
    const files = scaffold({ name: 'my-api', template: 'api', database: 'postgres', directory: '/tmp/test' })
    const paths = files.map((f) => f.path)

    it('generates package.json', () => {
      expect(paths).toContain('package.json')
      const pkg = JSON.parse(files.find((f) => f.path === 'package.json')!.content)
      expect(pkg.name).toBe('my-api')
      expect(pkg.dependencies['@c9up/ream']).toBeDefined()
      expect(pkg.dependencies['@c9up/pulsar']).toBeDefined()
      expect(pkg.dependencies['@c9up/atlas']).toBeDefined()
      expect(pkg.dependencies['@c9up/rune']).toBeDefined()
      expect(pkg.dependencies['@c9up/warden']).toBeDefined()
      expect(pkg.dependencies['@c9up/spectrum']).toBeDefined()
    })

    it('generates package.json with subpath imports', () => {
      const pkg = JSON.parse(files.find((f) => f.path === 'package.json')!.content)
      expect(pkg.imports['#modules/*']).toBe('./app/modules/*')
      expect(pkg.imports['#config/*']).toBe('./config/*')
      expect(pkg.imports['#providers/*']).toBe('./providers/*')
    })

    it('generates tsconfig.json with paths aliases', () => {
      expect(paths).toContain('tsconfig.json')
      const ts = JSON.parse(files.find((f) => f.path === 'tsconfig.json')!.content)
      expect(ts.compilerOptions.experimentalDecorators).toBe(true)
      expect(ts.compilerOptions.emitDecoratorMetadata).toBe(true)
      expect(ts.compilerOptions.paths['#modules/*']).toEqual(['./app/modules/*'])
      expect(ts.compilerOptions.paths['#config/*']).toEqual(['./config/*'])
    })

    it('generates .env with postgres config', () => {
      expect(paths).toContain('.env')
      const env = files.find((f) => f.path === '.env')!.content
      expect(env).toContain('DB_CONNECTION=postgres')
      expect(env).toContain('DB_DATABASE=my_api')
    })

    it('generates typed env.ts', () => {
      expect(paths).toContain('env.ts')
      const envTs = files.find((f) => f.path === 'env.ts')!.content
      expect(envTs).toContain('export interface Env')
      expect(envTs).toContain('APP_NAME: string')
      expect(envTs).toContain('NODE_ENV:')
      expect(envTs).toContain('PORT: string')
      expect(envTs).toContain('DB_HOST: string')
      expect(envTs).toContain('ProcessEnv extends Env')
    })

    it('generates reamrc.ts with # aliases', () => {
      expect(paths).toContain('reamrc.ts')
      const rc = files.find((f) => f.path === 'reamrc.ts')!.content
      expect(rc).toContain('providers')
      expect(rc).toContain('preloads')
      expect(rc).toContain('#providers/AppProvider')
      expect(rc).toContain('#start/routes')
      expect(rc).toContain('#start/kernel')
    })

    it('generates server entry point', () => {
      expect(paths).toContain('bin/server.ts')
    })

    it('generates AppProvider', () => {
      expect(paths).toContain('providers/AppProvider.ts')
    })

    it('generates routes and kernel', () => {
      expect(paths).toContain('start/routes.ts')
      expect(paths).toContain('start/kernel.ts')
    })

    it('generates health controller', () => {
      expect(paths).toContain('app/modules/health/controllers/HealthController.ts')
    })

    it('generates test files', () => {
      expect(paths).toContain('tests/unit/health.test.ts')
      expect(paths).toContain('tests/unit/validation.test.ts')
      expect(paths).toContain('tests/unit/container.test.ts')
    })

    it('generates .gitignore', () => {
      expect(paths).toContain('.gitignore')
      const gi = files.find((f) => f.path === '.gitignore')!.content
      expect(gi).toContain('node_modules')
      expect(gi).toContain('.env')
    })
  })

  describe('slim template', () => {
    const files = scaffold({ name: 'my-slim', template: 'slim', database: 'sqlite', directory: '/tmp/test' })
    const paths = files.map((f) => f.path)

    it('generates minimal files', () => {
      expect(paths).toContain('app.ts')
      expect(paths).toContain('package.json')
      expect(paths).not.toContain('bin/server.ts')
      expect(paths).not.toContain('providers/AppProvider.ts')
    })

    it('has only @c9up/ream dependency', () => {
      const pkg = JSON.parse(files.find((f) => f.path === 'package.json')!.content)
      expect(pkg.dependencies['@c9up/ream']).toBeDefined()
      expect(pkg.dependencies['@c9up/pulsar']).toBeUndefined()
    })

    it('generates .env with sqlite config', () => {
      const env = files.find((f) => f.path === '.env')!.content
      expect(env).toContain('DB_CONNECTION=sqlite')
    })

    it('generates typed env.ts with sqlite vars', () => {
      const envTs = files.find((f) => f.path === 'env.ts')!.content
      expect(envTs).toContain('DB_FILENAME: string')
      expect(envTs).not.toContain('DB_HOST')
    })
  })

  describe('microservice template', () => {
    const files = scaffold({ name: 'my-ms', template: 'microservice', database: 'postgres', directory: '/tmp/test' })
    const paths = files.map((f) => f.path)

    it('generates bus-centric entry point', () => {
      expect(paths).toContain('bin/server.ts')
      const server = files.find((f) => f.path === 'bin/server.ts')!.content
      expect(server).toContain('PulsarBus')
      expect(server).toContain('subscribe')
    })

    it('generates bus test', () => {
      expect(paths).toContain('tests/bus.test.ts')
    })
  })
})
