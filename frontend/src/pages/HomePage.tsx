import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const HomePage = () => {
  const { isAuthenticated, logout } = useAuthStore()

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-indigo-600">📸 PhotoAlbum</h1>
        <div className="flex gap-3">
          {isAuthenticated ? (
            <>
              <Link
                to="/album"
                className="px-4 py-2 text-indigo-600 font-medium hover:underline"
              >
                Мій альбом
              </Link>
              <button
                onClick={logout}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Вийти
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="px-4 py-2 text-indigo-600 font-medium hover:underline"
              >
                Увійти
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Реєстрація
              </Link>
            </>
          )}
        </div>
      </nav>

      <div className="max-w-4xl mx-auto text-center py-24 px-4">
        <h2 className="text-5xl font-bold text-gray-800 mb-6">
          Зберігай свої спогади
        </h2>
        <p className="text-xl text-gray-500 mb-10">
          Завантажуй фото, створюй папки та організовуй свої спогади в одному місці. Безпечно та зручно.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            to="/register"
            className="px-8 py-3 bg-indigo-600 text-white text-lg rounded-xl hover:bg-indigo-700"
          >
            Почати безкоштовно
          </Link>
          <Link
            to="/login"
            className="px-8 py-3 border border-indigo-600 text-indigo-600 text-lg rounded-xl hover:bg-indigo-50"
          >
            Увійти
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 px-4 pb-24">
        {[
          { icon: '🔒', title: 'Приватність', desc: 'Тільки ти бачиш свої фото' },
          { icon: '📁', title: 'Папки', desc: 'Організовуй фото в папки і підпапки' },
          { icon: '☁️', title: 'Хмарне сховище', desc: 'Фото зберігаються в хмарі' },
        ].map((feature) => (
          <div key={feature.title} className="bg-white rounded-2xl p-6 shadow-sm text-center">
            <div className="text-4xl mb-4">{feature.icon}</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">{feature.title}</h3>
            <p className="text-gray-500">{feature.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default HomePage
