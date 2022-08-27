import path from 'node:path'
import fs from 'node:fs/promises'
import { createServer } from 'vite'

process.on('message', async message => {
  if (message === 'start') {
    // Start server
    const server = await createServer({
      plugins: [
        {
          name: 'meteor-stubs',
          resolveId (id) {
            if (id.startsWith('meteor/')) {
              return `\0${id}`
            }
          },
          async load (id) {
            if (id.startsWith('\0meteor/')) {
              const file = path.join('.meteor', 'local', 'build', 'programs', 'web.browser', 'packages', `${id.replace('\0meteor/', '')}.js`)
              const content = await fs.readFile(file, 'utf8')
              const [, packageName, exported] = /Package\._define\("(.*?)"(?:,\s*exports)?,\s*{\n((?:\s*(?:\w+):\s*\w+,?\n)+)}\)/.exec(content) ?? []
              if (packageName) {
                const generated = exported.split('\n').map(line => {
                  const [,key] = /(\w+):\s*(?:\w+)/.exec(line) ?? []
                  if (key) {
                    return `export const ${key} = m.${key}`
                  }
                  return ''
                }).filter(Boolean)
                return `const g = typeof window !== 'undefined' ? window : global
    const m = g.Package.${packageName}
    ${generated.join('\n')}`
              }
              return ''
            }
          },
        },
      ],
    })
    await server.listen()
    
    process.send({
      kind: 'viteSetup',
      data: {
        host: server.config.server?.host,
        port: server.config.server?.port,
        entryFile: server.config.meteor?.clientEntry,
      },
    })
    // @TODO handler server auto-restart when config changes
  }
})
