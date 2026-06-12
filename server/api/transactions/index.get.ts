import { listTransactions } from '../../utils/dbOrders'

export default defineEventHandler(async () => {
  return listTransactions()
})
