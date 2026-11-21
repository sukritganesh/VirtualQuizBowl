import Ajv2020 from 'ajv/dist/2020'
import schema from '../../schemas/trivia-set.schema.json'

export type Question = { id: string; question: string; answer: string; aliases?: string[] }
export type TriviaSet = { mode: 'trivia'; title: string; category?: string; questions: Question[] }

const validate = new Ajv2020().compile<TriviaSet>(schema)

export function parseSet(data: unknown): TriviaSet {
  if (!validate(data)) {
    const error = validate.errors?.[0]
    const location = error?.instancePath || 'Set'
    throw new Error(`${location} ${error?.message ?? 'must be a valid trivia set'}.`)
  }
  const ids = new Set<string>()
  for (const item of data.questions) {
    if (ids.has(item.id)) throw new Error(`Repeated question ID “${item.id}”.`)
    ids.add(item.id)
  }
  return data
}

const files = import.meta.glob('./**/*.json', { base: '../../sets/trivia', eager: true, import: 'default' })
export const library = Object.entries(files)
  .map(([path, data]) => ({ path: path.replace(/^\.\//, ''), set: parseSet(data) }))
  .sort((a, b) => a.set.title.localeCompare(b.set.title))
