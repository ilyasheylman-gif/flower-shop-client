/**
 * Общая функция отправки запросов к API.
 *
 * - добавляет заголовки Accept / Content-Type / Authorization: Bearer <token>;
 * - 401 — удаляет токен и перенаправляет на страницу входа;
 * - 422 — бросает ApiError с объектом errors для вывода в форме;
 * - 409, 403, 404 — ApiError с сообщением сервера (поле message);
 * - ошибки сети и 5xx — понятное сообщение.
 */

// Базовый адрес API вынесен в переменную окружения Vite (.env → VITE_API_URL)
export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace(/\/$/, '')

const TOKEN_KEY = 'flower_shop_token'

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

export class ApiError extends Error {
  constructor(message, status, errors = {}, details = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors // { field: ['сообщение', ...] } — для 422
    this.details = details // дополнительные данные (например, нехватка цветов)
  }

  /** Первая ошибка для поля формы. */
  field(name) {
    return this.errors?.[name]?.[0] ?? ''
  }
}

let unauthorizedHandler = null

/** Регистрируется в main.js: что делать при 401 (выход и переход на вход). */
export function onUnauthorized(handler) {
  unauthorizedHandler = handler
}

function buildUrl(path, query) {
  const url = new URL(API_URL + path)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue
      if (Array.isArray(value)) {
        value.forEach((v) => url.searchParams.append(`${key}[]`, v))
      } else if (typeof value === 'boolean') {
        url.searchParams.set(key, value ? '1' : '0')
      } else {
        url.searchParams.set(key, value)
      }
    }
  }
  return url
}

/**
 * @param {string} path — путь относительно API_URL, например '/bouquets'
 * @param {{method?: string, body?: object, query?: object, form?: FormData, auth401Redirect?: boolean}} options
 */
export async function request(path, { method = 'GET', body, query, form, auth401Redirect = true } = {}) {
  const headers = { Accept: 'application/json' }
  // для FormData Content-Type выставляет сам браузер (multipart/form-data с boundary)
  if (!form) headers['Content-Type'] = 'application/json'

  const token = tokenStorage.get()
  if (token) headers.Authorization = `Bearer ${token}`

  let response
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
    })
  } catch {
    throw new ApiError('Сервер недоступен. Проверьте, что API запущен, и подключение к сети.', 0)
  }

  if (response.status === 204) return null

  let data = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (response.ok) return data

  const message = data?.message || `Ошибка ${response.status}`

  switch (response.status) {
    case 401:
      if (auth401Redirect && token) {
        tokenStorage.clear()
        unauthorizedHandler?.()
      }
      throw new ApiError(message, 401)
    case 422: {
      const errors = data?.errors ?? {}
      const first = Object.values(errors).flat()[0]
      throw new ApiError(first || message, 422, errors)
    }
    default:
      if (response.status >= 500) {
        throw new ApiError('Ошибка сервера. Попробуйте позже.', response.status)
      }
      throw new ApiError(message, response.status, {}, data?.details ?? null)
  }
}
