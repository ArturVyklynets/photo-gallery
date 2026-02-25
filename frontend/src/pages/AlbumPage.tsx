import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../api/client'

interface Folder {
  id: string
  name: string
  parent_id: string | null
  created_at: string
}

interface Photo {
  id: string
  filename: string
  url: string
  folder_id: string | null
  created_at: string
}

const AlbumPage = () => {
  const navigate = useNavigate()
  const { logout } = useAuthStore()

  const [folders, setFolders] = useState<Folder[]>([])
  const [photos, setPhotos] = useState<Photo[]>([])
  
  const [sharedPhotos, setSharedPhotos] = useState<Photo[]>([])
  const [sharedFolders, setSharedFolders] = useState<Folder[]>([])
  
  const [activeTab, setActiveTab] = useState<'my' | 'shared'>('my')

  const [currentFolder, setCurrentFolder] = useState<string | null>(null)
  const [folderHistory, setFolderHistory] = useState<Folder[]>([])
  const [newFolderName, setNewFolderName] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)

  const fetchData = async (folderId: string | null = null) => {
    setLoading(true)
    try {
      const [foldersRes, photosRes] = await Promise.allSettled([
        api.get('/folders/', { params: { parent_id: folderId } }),
        api.get('/photos/', { params: { folder_id: folderId } }),
      ])
      
      if (foldersRes.status === 'fulfilled') setFolders(foldersRes.value.data)
      else setFolders([])

      if (photosRes.status === 'fulfilled') setPhotos(photosRes.value.data)
      else setPhotos([])
    } catch {
      console.error('Помилка завантаження даних')
    } finally {
      setLoading(false)
    }
  }

  const fetchSharedData = async () => {
    setLoading(true)
    try {
      const [photosRes, foldersRes] = await Promise.all([
        api.get('/photos/shared'),
        api.get('/folders/shared')
      ])
      setSharedPhotos(photosRes.data)
      setSharedFolders(foldersRes.data)
    } catch {
      console.error('Помилка завантаження спільних даних')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'my') {
      fetchData(currentFolder)
    } else {
      if (currentFolder === null) {
        fetchSharedData()
      } else {
        fetchData(currentFolder)
      }
    }
  }, [currentFolder, activeTab])

  const switchTab = (tab: 'my' | 'shared') => {
    setActiveTab(tab)
    setCurrentFolder(null)
    setFolderHistory([])
  }

  const openFolder = (folder: Folder) => {
    setFolderHistory((prev) => [...prev, { id: currentFolder ?? '', name: currentFolder ? folders.find(f => f.id === currentFolder)?.name ?? (sharedFolders.find(f => f.id === currentFolder)?.name ?? 'Назад') : 'Головна', parent_id: null, created_at: '' }])
    setCurrentFolder(folder.id)
  }

  const goBack = () => {
    const history = [...folderHistory]
    const prev = history.pop()
    setFolderHistory(history)
    setCurrentFolder(prev?.id || null)
  }

  const createFolder = async () => {
    if (!newFolderName.trim()) return
    try {
      await api.post('/folders/', { name: newFolderName, parent_id: currentFolder })
      setNewFolderName('')
      setShowNewFolder(false)
      fetchData(currentFolder)
    } catch {
      console.error('Помилка створення папки')
    }
  }

  const deleteFolder = async (folderId: string) => {
    if (!confirm('Видалити папку?')) return
    try {
      await api.delete(`/folders/${folderId}`)
      fetchData(currentFolder)
    } catch {
      console.error('Помилка видалення папки')
    }
  }

  const uploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    setUploading(true)
    try {
      const params = currentFolder ? `?folder_id=${currentFolder}` : ''
      await api.post(`/photos/upload${params}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      fetchData(currentFolder)
    } catch {
      console.error('Помилка завантаження фото')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const deletePhoto = async (photoId: string) => {
    if (!confirm('Видалити фото?')) return
    try {
      await api.delete(`/photos/${photoId}`)
      if (activeTab === 'my' || currentFolder !== null) fetchData(currentFolder)
      else fetchSharedData()
    } catch (e) {
      const error = e as { response?: { status: number; data?: { detail?: string } } };
      if (error.response?.status === 403) {
        alert('У вас немає прав на видалення цього фото!')
      } else {
        console.error('Помилка видалення фото')
      }
    }
  }

  const sharePhoto = async (photoId: string) => {
    const email = window.prompt('Введіть email користувача, якому хочете надати доступ до ФОТО:')
    if (!email) return

    try {
      const res = await api.post(`/photos/${photoId}/share`, { email })
      alert(res.data.message || 'Фото успішно поширено!')
    } catch (e) {
      const error = e as { response?: { status: number; data?: { detail?: string } } };
      if (error.response?.status === 404) alert('Користувача з таким email не знайдено.')
      else if (error.response?.status === 400) alert(error.response.data?.detail || 'Помилка поширення.')
      else alert('Сталася помилка при спробі поділитися фотографією.')
    }
  }

  const shareFolder = async (folderId: string) => {
    const email = window.prompt('Введіть email користувача, якому хочете надати доступ до ПАПКИ:')
    if (!email) return

    const canDelete = window.confirm('Дозволити цьому користувачу ВИДАЛЯТИ фото з цієї папки?\n\n[ОК] - Дозволити видалення\n[Скасувати] - Тільки перегляд')

    try {
      const res = await api.post(`/folders/${folderId}/share`, { email, can_delete: canDelete })
      alert(res.data.message || 'Папку успішно поширено!')
    } catch (e) {
      const error = e as { response?: { status: number; data?: { detail?: string } } };
      if (error.response?.status === 404) alert('Користувача з таким email не знайдено.')
      else if (error.response?.status === 400) alert(error.response.data?.detail || 'Помилка поширення.')
      else alert('Сталася помилка при спробі поділитися папкою.')
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const renderFolders = (folderList: Folder[], isSharedRoot: boolean = false) => {
    return (
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">{isSharedRoot ? 'Спільні папки' : 'Папки'}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {folderList.map((folder) => (
            <div key={folder.id} className="relative group">
              <button onClick={() => openFolder(folder)} className="w-full bg-white rounded-xl p-4 shadow-sm hover:shadow-md text-center transition-all">
                <div className="text-4xl mb-2">{isSharedRoot ? '🤝📁' : '📁'}</div>
                <p className="text-sm text-gray-700 truncate">{folder.name}</p>
              </button>
              
              {activeTab === 'my' && (
                <button onClick={() => shareFolder(folder.id)} title="Поділитися папкою" className="absolute top-1 right-9 text-indigo-500 hover:text-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity text-xs bg-white rounded-full w-6 h-6 flex items-center justify-center shadow">🔗</button>
              )}
              
              {!isSharedRoot && (
                <button onClick={() => deleteFolder(folder.id)} title="Видалити" className="absolute top-1 right-1 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity text-xs bg-white rounded-full w-6 h-6 flex items-center justify-center shadow">✕</button>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-indigo-600">📸 PhotoAlbum</h1>
        <button onClick={handleLogout} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Вийти</button>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        
        <div className="flex gap-4 mb-8 border-b border-gray-200 pb-2">
          <button onClick={() => switchTab('my')} className={`px-4 py-2 font-medium ${activeTab === 'my' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>Мій альбом</button>
          <button onClick={() => switchTab('shared')} className={`px-4 py-2 font-medium ${activeTab === 'shared' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>Спільні зі мною</button>
        </div>

        <div className="flex items-center gap-2 mb-6 text-sm text-gray-500">
          <button onClick={() => { setCurrentFolder(null); setFolderHistory([]) }} className="hover:text-indigo-600">Головна</button>
          {folderHistory.slice(1).map((f, i) => (
            <span key={i} className="flex items-center gap-2"><span>/</span><span>{f.name}</span></span>
          ))}
          {currentFolder && (
            <span className="flex items-center gap-2">
              <span>/</span>
              <span className="text-gray-800 font-medium">
                {folders.find(f => f.id === currentFolder)?.name ?? sharedFolders.find(f => f.id === currentFolder)?.name ?? '...'}
              </span>
            </span>
          )}
        </div>

        <div className="flex gap-3 mb-6">
          {currentFolder && <button onClick={goBack} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">← Назад</button>}
          
          {activeTab === 'my' && (
            <>
              <button onClick={() => setShowNewFolder(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">+ Нова папка</button>
              <label className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer">
                {uploading ? 'Завантаження...' : '+ Додати фото'}
                <input type="file" accept="image/*" className="hidden" onChange={uploadPhoto} disabled={uploading} />
              </label>
            </>
          )}
        </div>

        {showNewFolder && activeTab === 'my' && (
          <div className="bg-white rounded-xl p-4 mb-6 shadow-sm flex gap-3">
            <input type="text" placeholder="Назва папки" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && createFolder()} className="border border-gray-300 rounded-lg px-4 py-2 flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-400" autoFocus />
            <button onClick={createFolder} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Створити</button>
            <button onClick={() => { setShowNewFolder(false); setNewFolderName('') }} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Скасувати</button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-400">Завантаження...</div>
        ) : (
          <>
            {activeTab === 'my' && folders.length > 0 && renderFolders(folders, false)}
            
            {activeTab === 'shared' && currentFolder === null && sharedFolders.length > 0 && renderFolders(sharedFolders, true)}
            
            {activeTab === 'shared' && currentFolder !== null && folders.length > 0 && renderFolders(folders, false)}

            {(photos.length > 0 || (activeTab === 'shared' && currentFolder === null && sharedPhotos.length > 0)) && (
              <div>
                <h2 className="text-lg font-semibold text-gray-700 mb-4">{activeTab === 'shared' && currentFolder === null ? 'Спільні фото' : 'Фото'}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {(activeTab === 'shared' && currentFolder === null ? sharedPhotos : photos).map((photo) => (
                    <div key={photo.id} className="relative group">
                      <img src={photo.url} alt={photo.filename} className="w-full h-40 object-cover rounded-xl shadow-sm" />
                      
                      {activeTab === 'my' && (
                        <button onClick={() => sharePhoto(photo.id)} title="Поділитися" className="absolute top-1 right-9 text-indigo-500 hover:text-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity text-xs bg-white rounded-full w-6 h-6 flex items-center justify-center shadow">🔗</button>
                      )}
                      <button 
                        onClick={() => deletePhoto(photo.id)} 
                        title="Видалити" 
                        className="absolute top-1 right-1 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity text-xs bg-white rounded-full w-6 h-6 flex items-center justify-center shadow"
                      >
                        ✕
                      </button>
                      <p className="text-xs text-gray-500 mt-1 truncate">{photo.filename}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {((activeTab === 'my' && folders.length === 0 && photos.length === 0) || 
              (activeTab === 'shared' && sharedFolders.length === 0 && sharedPhotos.length === 0 && photos.length === 0)) && (
              <div className="text-center py-24 text-gray-400">
                <div className="text-6xl mb-4">{activeTab === 'shared' ? '🤝' : '📭'}</div>
                <p className="text-lg">{activeTab === 'shared' ? 'З вами ще нічим не ділилися' : 'Тут поки нічого немає'}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default AlbumPage