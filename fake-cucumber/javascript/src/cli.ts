import { Command } from 'commander'
import packageJson from '../package.json'
import loadSupportCode from './loadSupportCode'
import runCucumber from './runCucumber'
import { GherkinStreams, IGherkinStreamOptions } from '@cucumber/gherkin-streams'
import { Query as GherkinQuery } from '@cucumber/gherkin-utils'
import { version } from '../package.json'
import * as messages from '@cucumber/messages'
import createMeta from '@cucumber/create-meta'
import { MessageToNdjsonStream } from '@cucumber/message-streams'

const program = new Command()
program.version(packageJson.version)
program.option('-r, --require <path>', 'override require path')
program.option('--predictable-ids', 'Use predictable ids', false)

async function main() {
  program.parse(process.argv)
  const { predictableIds, require } = program.opts()

  const paths = program.args
  const requirePaths = require ? require.split(':') : paths

  const supportCode = await loadSupportCode(predictableIds, requirePaths)

  const gherkinStreamOptions: IGherkinStreamOptions = {
    defaultDialect: 'en',
    newId: supportCode.newId,
    relativeTo: process.cwd()
  }
  const gherkinEnvelopeStream = GherkinStreams.fromPaths(paths, gherkinStreamOptions)

  const envelopeOutputStream = new MessageToNdjsonStream()
  envelopeOutputStream.pipe(process.stdout)

  const metaEnvelope: messages.Envelope = {
    meta: createMeta('fake-cucumber', version, process.env),
  }
  envelopeOutputStream.write(metaEnvelope)

  const gherkinQuery = new GherkinQuery()

  await runCucumber(supportCode, gherkinEnvelopeStream, gherkinQuery, envelopeOutputStream)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
