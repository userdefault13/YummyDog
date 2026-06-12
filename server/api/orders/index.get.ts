import { listOrders } from '../../utils/dbOrders'

export default defineEventHandler(async () => {
  return listOrders()
})
