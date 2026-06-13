import { listExpenses } from '~/server/utils/dbStore'

export default defineEventHandler(async () => listExpenses())
