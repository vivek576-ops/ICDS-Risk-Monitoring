import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL 
    ? `${import.meta.env.VITE_API_URL}/api` 
    : '/api',
  timeout: 15000,
})

// Attach token on every request
const token = localStorage.getItem('icds_token')
if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`

export default api
