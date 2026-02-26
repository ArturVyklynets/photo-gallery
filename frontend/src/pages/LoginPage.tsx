import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../api/client'
import logo from '../assets/LogoPhotoAlbum.png'


const LoginPage = () => {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await api.post('/auth/login', form)
      login(res.data.access_token)
      navigate('/album')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      setError(error.response?.data?.detail || 'Помилка входу')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F2F3F5] font-sans px-4">
      <div className="bg-white p-10 rounded-[20px] w-full max-w-[400px] shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
        
        <div className="text-center mb-8">
          <div className="rounded-xl mx-auto mb-4 flex items-center justify-center text-white font-bold text-xl">
            <img 
              src={logo} 
              alt="PhotoAlbum Logo" 
              className="h-10 w-auto object-contain" 
            />
          </div>
          <h2 className="font-bold text-2xl text-gray-900">З поверненням</h2>
          <p className="text-[#6B7280] text-sm mt-2">Введіть свої дані для доступу до галереї</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-6 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="text-[0.75rem] font-bold text-[#6B7280] mb-1.5 block tracking-[0.05em]">
              EMAIL ADDRESS
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full bg-[#F9FAFB] border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-[#F76808] focus:bg-white outline-none py-3 px-4 transition-all"
              required
            />
          </div>
          
          <div>
            <label className="text-[0.75rem] font-bold text-[#6B7280] mb-1.5 block tracking-[0.05em]">
              PASSWORD
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full bg-[#F9FAFB] border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-[#F76808] focus:bg-white outline-none py-3 px-4 transition-all"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#F76808] hover:bg-[#E55B00] text-white font-medium py-3 rounded-xl transition-colors mt-2 disabled:opacity-50 flex justify-center items-center shadow-sm"
          >
            {loading ? 'Завантаження...' : 'Увійти'}
          </button>
        </form>

        <div className="mt-8 text-center flex flex-col gap-4">
          <p className="text-sm text-[#6B7280]">
            Немає акаунту?{' '}
            <Link to="/register" className="text-[#F76808] font-bold hover:underline">
              Створити акаунт
            </Link>
          </p>
          <Link to="/" className="text-sm text-[#6B7280] hover:text-gray-900 transition-colors">
            ← На головну
          </Link>
        </div>

      </div>
    </div>
  )
}

export default LoginPage