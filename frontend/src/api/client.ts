import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
})

api.interceptors.request.use((config) => {
  let token = useAuthStore.getState().token;
  
  if (!token) {
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      try {
        token = JSON.parse(authStorage).state?.token; 
        
      } catch {
        //  
      }
    }
  }
  if (!token) {
    token = localStorage.getItem('token');
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn("Токен протерміновано. Автоматичний вихід...");
      
      useAuthStore.getState().logout();
      
      localStorage.removeItem('token'); 
      
      if (window.location.pathname !== '/' && window.location.pathname !== '/login') {
        window.location.href = '/'; 
      }
    }
    return Promise.reject(error)
  }
)

export default api