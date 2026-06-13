import { listInventory } from '~/server/utils/dbStore'

export default defineEventHandler(async () => listInventory())
