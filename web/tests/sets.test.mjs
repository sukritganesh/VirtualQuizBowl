import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import Ajv2020 from 'ajv/dist/2020.js'
import { listCategory } from '../src/catalog.ts'

test('the library lists direct packs and counts descendants at every category depth', () => {
  const paths = ['sample.json', 'science/starter.json', 'science/earth/rocks/igneous.json',
    'science/earth/rocks/sedimentary.json', 'science-fiction/starter.json']
  const library = paths.map(path => ({ path, set: { title: 'Sample' } }))
  const root = listCategory(library, [])
  assert.deepEqual(root.categories.map(({name, count}) => [name, count]), [['Science', 3], ['Science Fiction', 1]])
  assert.deepEqual(root.packs, [library[0]])
  const science = listCategory(library, ['science'])
  assert.deepEqual(science.categories, [{ slug: 'earth', name: 'Earth', count: 2 }])
  assert.deepEqual(science.packs, [library[1]])
  assert.deepEqual(listCategory(library, ['science', 'earth', 'rocks']), { categories: [], packs: library.slice(2, 4) })
})

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
