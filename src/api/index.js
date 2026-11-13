import { request } from './http'

/** Стандартный CRUD для ресурса API. */
function resource(path) {
  return {
    list: (query) => request(path, { query }),
    get: (id) => request(`${path}/${id}`),
    create: (body) => request(path, { method: 'POST', body }),
    update: (id, body) => request(`${path}/${id}`, { method: 'PATCH', body }),
    remove: (id) => request(`${path}/${id}`, { method: 'DELETE' }),
  }
}

export const api = {
  auth: {
    login: (email, password) => request('/login', { method: 'POST', body: { email, password }, auth401Redirect: false }),
    register: (body) => request('/register', { method: 'POST', body }),
    // при старте приложения недействительный токен просто сбрасывается, без редиректа
    me: () => request('/user', { auth401Redirect: false }),
    logout: () => request('/logout', { method: 'POST', auth401Redirect: false }),
  },

  bouquets: {
    ...resource('/bouquets'),
    uploadImage(id, file) {
      const form = new FormData()
      form.append('image', file)
      return request(`/bouquets/${id}/image`, { method: 'POST', form })
    },
  },

  flowers: {
    ...resource('/flowers'),
    changeStock: (id, delta, reason) => request(`/flowers/${id}/stock`, { method: 'PATCH', body: { delta, reason } }),
  },

  packagings: resource('/packagings'),
  occasions: resource('/occasions'),

  customBouquets: {
    ...resource('/custom-bouquets'),
    calculate: (body) => request('/custom-bouquets/calculate', { method: 'POST', body }),
  },

  orders: {
    list: (query) => request('/orders', { query }),
    get: (id) => request(`/orders/${id}`),
    create: (body) => request('/orders', { method: 'POST', body }),
    cancel: (id) => request(`/orders/${id}/cancel`, { method: 'POST' }),
    changeStatus: (id, status, comment) => request(`/orders/${id}/status`, { method: 'PATCH', body: { status, comment } }),
    assignCourier: (id, courierId) => request(`/orders/${id}/courier`, { method: 'PATCH', body: { courier_id: courierId } }),
    updatePostcard: (id, body) => request(`/orders/${id}/postcard`, { method: 'PUT', body }),
  },

  users: {
    list: (query) => request('/users', { query }),
    changeRole: (id, role) => request(`/users/${id}/role`, { method: 'PATCH', body: { role } }),
  },

  stats: (query) => request('/stats', { query }),

  ai: {
    postcardText: (body) => request('/ai/postcard-text', { method: 'POST', body }),
    suggestBouquets: (query) => request('/ai/bouquet-suggestions', { method: 'POST', body: { query } }),
  },
}
