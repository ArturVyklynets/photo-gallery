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
  const [currentFolder, setCurrentFolder] = useState<string | null>(null)
  const [folderHistory, setFolderHistory] = useState<Folder[]>([])
  const [newFolderName, setNewFolderName] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)

  const fetchData = async (folderId: string | null = null) => {
    setLoading(true)
    try {
      const [foldersRes, photosRes] = await Promise.all([
        api.get('/folders/', { params: { parent_id: folderId } }),
        api.get('/photos/', { params: { folder_id: folderId } }),
      ])
      setFolders(foldersRes.data)
      setPhotos(photosRes.data)
    } catch {
      console.error('Помилка завантаження даних')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(currentFolder)
  }, [currentFolder])

  const openFolder = (folder: Folder) => {
    setFolderHistory((prev) => [...prev, { id: currentFolder ?? '', name: currentFolder ? folders.find(f => f.id === currentFolder)?.name ?? 'Назад' : 'Головна', parent_id: null, created_at: '' }])
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
      await api.post('/folders/', {
        name: newFolderName,
        parent_id: currentFolder,
      })
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
      fetchData(currentFolder)
    } catch {
      console.error('Помилка видалення фото')
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-indigo-600">📸 PhotoAlbum</h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
        >
          Вийти
        </button>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6 text-sm text-gray-500">
          <button
            onClick={() => { setCurrentFolder(null); setFolderHistory([]) }}
            className="hover:text-indigo-600"
          >
            Головна
          </button>
          {folderHistory.slice(1).map((f, i) => (
            <span key={i} className="flex items-center gap-2">
              <span>/</span>
              <span>{f.name}</span>
            </span>
          ))}
          {currentFolder && (
            <span className="flex items-center gap-2">
              <span>/</span>
              <span className="text-gray-800 font-medium">
                {folders.find(f => f.id === currentFolder)?.name ?? '...'}
              </span>
            </span>
          )}
        </div>

        <div className="flex gap-3 mb-6">
          {currentFolder && (
            <button
              onClick={goBack}
              className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              ← Назад
            </button>
          )}
          <button
            onClick={() => setShowNewFolder(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            + Нова папка
          </button>
          <label className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer">
            {uploading ? 'Завантаження...' : '+ Додати фото'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={uploadPhoto}
              disabled={uploading}
            />
          </label>
        </div>

        {showNewFolder && (
          <div className="bg-white rounded-xl p-4 mb-6 shadow-sm flex gap-3">
            <input
              type="text"
              placeholder="Назва папки"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createFolder()}
              className="border border-gray-300 rounded-lg px-4 py-2 flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              autoFocus
            />
            <button
              onClick={createFolder}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Створити
            </button>
            <button
              onClick={() => { setShowNewFolder(false); setNewFolderName('') }}
              className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Скасувати
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-400">Завантаження...</div>
        ) : (
          <>
            {folders.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-700 mb-4">Папки</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {folders.map((folder) => (
                    <div key={folder.id} className="relative group">
                      <button
                        onClick={() => openFolder(folder)}
                        className="w-full bg-white rounded-xl p-4 shadow-sm hover:shadow-md text-center transition-all"
                      >
                        <div className="text-4xl mb-2">📁</div>
                        <p className="text-sm text-gray-700 truncate">{folder.name}</p>
                      </button>
                      <button
                        onClick={() => deleteFolder(folder.id)}
                        className="absolute top-1 right-1 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity text-xs bg-white rounded-full w-6 h-6 flex items-center justify-center shadow"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {photos.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-700 mb-4">Фото</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {photos.map((photo) => (
                    <div key={photo.id} className="relative group">
                      <img
                        src={photo.url}
                        alt={photo.filename}
                        className="w-full h-40 object-cover rounded-xl shadow-sm"
                      />
                      <button
                        onClick={() => deletePhoto(photo.id)}
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

            {folders.length === 0 && photos.length === 0 && (
              <div className="text-center py-24 text-gray-400">
                <div className="text-6xl mb-4">📭</div>
                <p className="text-lg">Тут поки нічого немає</p>
                <p className="text-sm mt-2">Створи папку або завантаж фото</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default AlbumPage
