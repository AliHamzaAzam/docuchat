import { EMBEDDING_DIMENSIONS } from './types.js'

export const VECTOR_INDEX_NAME = 'chunk_vector_index'

export const VECTOR_INDEX_DEFINITION = {
  fields: [
    { type: 'vector', path: 'embedding', numDimensions: EMBEDDING_DIMENSIONS, similarity: 'cosine' },
    { type: 'filter', path: 'scopeKey' },
  ],
}

/** The subset of the driver collection API this module needs. */
export type SearchIndexCollection = {
  listSearchIndexes(name?: string): { toArray(): Promise<any[]> }
  createSearchIndex(description: { name: string; type: string; definition: unknown }): Promise<string>
}

export type VectorIndexState = 'created' | 'ok' | 'mismatch'

type Logger = Pick<Console, 'log' | 'warn' | 'error'>

/** True when an Atlas index definition has the vector and filter fields retrieval relies on. */
export function definitionMatches(definition: any): boolean {
  const fields: any[] = Array.isArray(definition?.fields) ? definition.fields : []
  const vector = fields.find((f) => f?.type === 'vector' && f?.path === 'embedding')
  const filter = fields.find((f) => f?.type === 'filter' && f?.path === 'scopeKey')
  return Boolean(
    vector &&
      vector.numDimensions === EMBEDDING_DIMENSIONS &&
      vector.similarity === 'cosine' &&
      filter,
  )
}

/**
 * Make sure the Atlas vector index that retrieval queries exists.
 *
 * $vectorSearch against a missing index returns no rows rather than an error,
 * so without this a lost index makes every question answer "I do not know"
 * with nothing in the logs. A missing index is created; an existing index with
 * a different definition is reported but left alone, because dropping it
 * would take retrieval offline while it rebuilds (use
 * `npm run recreate:chunk-index` for that).
 */
export async function ensureVectorIndex(
  collection: SearchIndexCollection,
  logger: Logger = console,
): Promise<VectorIndexState> {
  const indexes = await collection.listSearchIndexes().toArray()
  const existing = indexes.find((index) => index?.name === VECTOR_INDEX_NAME)

  if (!existing) {
    logger.warn(`[vector-index] ${VECTOR_INDEX_NAME} is missing; creating it. Retrieval returns nothing until Atlas finishes building it.`)
    await collection.createSearchIndex({
      name: VECTOR_INDEX_NAME,
      type: 'vectorSearch',
      definition: VECTOR_INDEX_DEFINITION,
    })
    return 'created'
  }

  const definition = existing.latestDefinition ?? existing.definition
  if (!definitionMatches(definition)) {
    logger.error(
      `[vector-index] ${VECTOR_INDEX_NAME} does not match the expected definition (${EMBEDDING_DIMENSIONS}-dim cosine on embedding, scopeKey filter). Run npm run recreate:chunk-index. Current: ${JSON.stringify(definition)}`,
    )
    return 'mismatch'
  }

  logger.log(`[vector-index] ${VECTOR_INDEX_NAME} status=${existing.status ?? 'unknown'} queryable=${existing.queryable ?? 'unknown'}`)
  return 'ok'
}
