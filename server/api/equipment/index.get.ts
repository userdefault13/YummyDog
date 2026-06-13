import { listEquipment } from '~/server/utils/dbStore'

export default defineEventHandler(async () => listEquipment())
