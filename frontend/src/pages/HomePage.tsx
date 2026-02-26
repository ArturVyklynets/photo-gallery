import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import logo from '../assets/LogoPhotoAlbum.png'

const customStyles = {
    btnPrimary: {
    height: '40px', padding: '0 24px', borderRadius: '12px', fontWeight: '600',
    fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: '8px', background: '#F76808', color: 'white', border: 'none', cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(247, 104, 8, 0.25)', transition: 'all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1)',
    fontFamily: 'Inter, sans-serif',
  },
    featureIcon: {
    width: '48px', height: '48px', background: '#FFF0E6', color: '#F76808',
    borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: '16px',
  },
}

const HomePage = () => {
  const { isAuthenticated, logout } = useAuthStore()

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-26 py-4 flex justify-between items-center">
        
        <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
          <img 
            src={logo} 
            alt="PhotoAlbum Logo" 
            className="h-10 w-auto object-contain" 
          />
        </Link>
        
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
                className="px-4 py-2 text-gray-500 font-medium rounded-lg hover:bg-neutral-100"
              >
                Увійти
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              >
                Реєстрація
              </Link>
            </>
          )}
        </div>
      </nav>

      <div className="max-w-4xl mx-auto text-center py-24 px-4">
        <h2 className="text-5xl font-bold text-gray-800 mb-6">
          Твої спогади під надійним захистом.
        </h2>
        <h2 className="text-5xl font-bold text-gray-800 mb-6">
          І завжди поруч.
        </h2>
        <p className="text-2xl text-gray-500 mb-10">
          Надійне хмарне зберігання для ваших фото з розширеними можливостями доступу та зручною організацією.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            to="/register"
            className="px-8 py-3 bg-orange-500 text-white text-lg rounded-xl hover:bg-orange-600"
            
          >
            Почати безкоштовно
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 px-4 pb-24">
        {[
          {
            icon: (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" />
              </svg>
            ),
            title: 'Керування доступом',
            desc: 'Надавайте доступ із потрібними дозволами та самі вирішуйте, хто може переглядати, змінювати чи керувати вашими альбомами.'
          },
          {
            icon: (
              <svg 
                width="24" 
                height="24" 
                viewBox="0 0 24 24" 
                fill="currentColor"
              >
                <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
            </svg>
            ),
            title: 'Зручна організація',
            desc: 'Багаторівнева структура папок, інтуїтивне керування перетягуванням і ефективний пошук.'
          },
          {
            icon: (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.56.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3z" />
              </svg>
            ),
            title: 'Хмарне сховище',
            desc: 'Інтеграція з S3 корпоративного рівня гарантує, що ваші фото надійно захищені, дублюються та завжди доступні.'
          },
        ].map((feature) => (
          <div key={feature.title} className="bg-gray-100 rounded-2xl px-8 py-6 text-left">
            <div style={customStyles.featureIcon} className="text-4xl mb-4">{feature.icon}</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">{feature.title}</h3>
            <p className="text-gray-500">{feature.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default HomePage
