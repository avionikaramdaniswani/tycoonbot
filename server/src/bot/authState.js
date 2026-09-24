import { initAuthCreds, BufferJSON, proto } from '@vanzxy/baileys'

/**
 * Auth state Baileys yang disimpan di koleksi MongoDB.
 * Interface-nya identik dengan useMultiFileAuthState:
 *   returns { state: { creds, keys }, saveCreds, clearAuth }
 * Sehingga sesi WhatsApp tetap ada meski server di-redeploy.
 */
export async function useMongoAuthState(collection) {
  const writeData = (id, data) =>
    collection.replaceOne(
      { _id: id },
      { _id: id, data: JSON.stringify(data, BufferJSON.replacer) },
      { upsert: true }
    )

  const readData = async (id) => {
    const doc = await collection.findOne({ _id: id })
    return doc?.data ? JSON.parse(doc.data, BufferJSON.reviver) : null
  }

  const removeData = (id) => collection.deleteOne({ _id: id })

  const creds = (await readData('creds')) || initAuthCreds()

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const result = {}
          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(`${type}-${id}`)
              if (type === 'app-state-sync-key' && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value)
              }
              result[id] = value
            })
          )
          return result
        },
        set: async (data) => {
          const tasks = []
          for (const type in data) {
            for (const id in data[type]) {
              const value = data[type][id]
              const key = `${type}-${id}`
              tasks.push(value ? writeData(key, value) : removeData(key))
            }
          }
          await Promise.all(tasks)
        }
      }
    },
    saveCreds: () => writeData('creds', creds),
    clearAuth: () => collection.deleteMany({})
  }
}

export default useMongoAuthState
