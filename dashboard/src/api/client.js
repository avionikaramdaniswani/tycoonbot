import axios from 'axios'

const TOKEN_KEY = 'bt_token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

// Base relatif: di-dev diteruskan Vite proxy, di-produksi same-origin.
export const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      clearToken()
      window.dispatchEvent(new Event('bt:unauthorized'))
    }
    return Promise.reject(err)
  }
)

export const authApi = {
  login: (username, password) =>
    api.post('/auth/login', { username, password }).then((r) => r.data)
}

export const botApi = {
  status: () => api.get('/bot/status').then((r) => r.data),
  start: (opts = {}) => api.post('/bot/start', opts).then((r) => r.data),
  stop: () => api.post('/bot/stop').then((r) => r.data),
  restart: () => api.post('/bot/restart').then((r) => r.data),
  logout: () => api.post('/bot/logout').then((r) => r.data),
  pairing: (number) => api.post('/bot/pairing', { number }).then((r) => r.data)
}

export const tycoonApi = {
  overview: () => api.get('/tycoon/overview').then((r) => r.data),
  player: (jid) => api.get(`/tycoon/players/${encodeURIComponent(jid)}`).then((r) => r.data),
  reset: () => api.post('/tycoon/reset', { confirm: 'RESET' }).then((r) => r.data)
}
