import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import Ajv2020 from 'ajv/dist/2020.js'

test('built-in files satisfy the trivia schema and have unique question IDs', async () => {
  const schema = JSON.parse(await readFile('schemas/trivia-set.schema.json', 'utf8'))
  const validate = new Ajv2020().compile(schema)
  const directory = resolve('sets/trivia')
  const entries = await readdir(directory, { withFileTypes: true, recursive: true })
  for (const entry of entries.filter(entry => entry.isFile() && entry.name.endsWith('.json'))) {
    const data = JSON.parse(await readFile(resolve(entry.parentPath, entry.name), 'utf8'))
    assert(validate(data), entry.name + ': ' + JSON.stringify(validate.errors))
    assert.equal(new Set(data.questions.map(item => item.id)).size, data.questions.length, entry.name)
  }
})
