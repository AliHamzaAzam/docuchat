import { connectDb, disconnectDb } from '../src/db/connect.js'
import { generateDemoConversationFixtures } from '../src/demo/fixtures.js'

async function main() {
  await connectDb()
  const fixtures = await generateDemoConversationFixtures()
  console.log(`Generated ${fixtures.length} demo conversation fixtures.`)
  await disconnectDb()
}

main().catch(async (err) => {
  console.error(err)
  await disconnectDb()
  process.exit(1)
})
