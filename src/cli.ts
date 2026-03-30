#!/usr/bin/env node

/**
 * create-ream CLI — npm init ream@latest my-app
 *
 * @implements FR59
 */

import * as readline from 'node:readline'
import { writeScaffold } from './scaffold.js'
import type { Database, Template } from './scaffold.js'

const TEMPLATES: Template[] = ['api', 'web', 'microservice', 'slim']
const DATABASES: Database[] = ['postgres', 'sqlite']

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

async function main() {
  const args = process.argv.slice(2)
  const name = args[0]

  if (!name) {
    process.stderr.write('Usage: npm init ream@latest <project-name>\n')
    process.exit(1)
  }

  if (!/^[a-z0-9][a-z0-9\-_]*$/.test(name)) {
    process.stderr.write('Project name must be lowercase alphanumeric with hyphens/underscores only.\n')
    process.exit(1)
  }

  process.stdout.write(`\nCreating Ream project: ${name}\n\n`)

  // Template selection
  process.stdout.write('Select a template:\n')
  for (let i = 0; i < TEMPLATES.length; i++) {
    process.stdout.write(`  ${i + 1}. ${TEMPLATES[i]}\n`)
  }
  const templateIdx = Number(await prompt('\nTemplate [1]: ')) || 1
  const template = TEMPLATES[templateIdx - 1] ?? 'api'

  // Database selection
  process.stdout.write('\nSelect a database:\n')
  for (let i = 0; i < DATABASES.length; i++) {
    process.stdout.write(`  ${i + 1}. ${DATABASES[i]}\n`)
  }
  const dbIdx = Number(await prompt('\nDatabase [1]: ')) || 1
  const database = DATABASES[dbIdx - 1] ?? 'postgres'

  process.stdout.write(`\nScaffolding ${name} with template=${template}, database=${database}...\n`)

  writeScaffold({
    name,
    template,
    database,
    directory: name,
  })

  process.stdout.write(`\nDone! Next steps:\n`)
  process.stdout.write(`  cd ${name}\n`)
  process.stdout.write('  pnpm install\n')
  process.stdout.write('  pnpm dev\n\n')
}

main().catch((err) => {
  process.stderr.write(`Error: ${err instanceof Error ? err.message : String(err)}\n`)
  process.exit(1)
})
