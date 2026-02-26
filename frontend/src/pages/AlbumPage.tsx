import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../api/client'
import logo from '../assets/LogoPhotoAlbum.png' 

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
  size?: number 
}

const AlbumPage = () => {
  const navigate = useNavigate()
  const { logout } = useAuthStore()

  const [folders, setFolders] = useState<Folder[]>([])
  const [photos, setPhotos] = useState<Photo[]>([])
  const [sharedPhotos, setSharedPhotos] = useState<Photo[]>([])
  const [sharedFolders, setSharedFolders] = useState<Folder[]>([])

  const [activeTab, setActiveTab] = useState<'my' | 'shared'>('my')
  const [activeNav, setActiveNav] = useState('My Albums')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentFolder, setCurrentFolder] = useState<string | null>(null)
  const [folderHistory, setFolderHistory] = useState<Folder[]>([])
  
  const [newFolderName, setNewFolderName] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)

  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [shareData, setShareData] = useState<{ type: 'folder' | 'photo', id: string, name: string } | null>(null)
  const [shareEmail, setShareEmail] = useState('')
  const [sharePermission, setSharePermission] = useState('view')
  const [shareLoading, setShareLoading] = useState(false)

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
    if (activeNav === 'Shared with me') {
      setActiveTab('shared')
      if (currentFolder === null) fetchSharedData()
      else fetchData(currentFolder)
    } else {
      setActiveTab('my')
      fetchData(currentFolder)
    }
  }, [currentFolder, activeNav])

  const openFolder = (folder: Folder) => {
    setFolderHistory((prev) => [
      ...prev, 
      { id: currentFolder ?? '', name: currentFolder ? (folders.find(f => f.id === currentFolder)?.name ?? sharedFolders.find(f => f.id === currentFolder)?.name ?? 'Назад') : 'Home', parent_id: null, created_at: '' }
    ])
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
      const error = e as { response?: { status: number } };
      if (error.response?.status === 403) alert('У вас немає прав на видалення цього фото!')
      else console.error('Помилка видалення фото')
    }
  }

  const openShareModal = (type: 'folder' | 'photo', id: string, name: string) => {
    setShareData({ type, id, name })
    setShareEmail('')
    setSharePermission('view')
    setShareModalOpen(true)
  }

  const executeShare = async () => {
    if (!shareEmail.trim() || !shareData) return
    setShareLoading(true)
    try {
      if (shareData.type === 'folder') {
        const canDelete = sharePermission === 'edit'
        await api.post(`/folders/${shareData.id}/share`, { email: shareEmail, can_delete: canDelete })
      } else {
        await api.post(`/photos/${shareData.id}/share`, { email: shareEmail })
      }
      alert(`Успішно надано доступ для ${shareEmail}!`)
      setShareEmail('')
    } catch (e) {
      const error = e as { response?: { status: number, data?: { detail?: string } } }
      if (error.response?.status === 404) alert('Користувача з таким email не знайдено.')
      else if (error.response?.status === 400) alert(error.response.data?.detail || 'Помилка поширення.')
      else alert('Сталася помилка при спробі поділитися.')
    } finally {
      setShareLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const navItems = [
    { label: 'Home', icon: <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /> },
    { label: 'My Albums', icon: <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z" /> },
    { label: 'Shared with me', icon: <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" /> },
    { label: 'Recent', icon: <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" /> },
  ]

  const currentPhotos = activeTab === 'shared' && currentFolder === null ? sharedPhotos : photos
  const currentFoldersList = activeTab === 'shared' && currentFolder === null ? sharedFolders : folders

  const filteredPhotos = searchQuery
    ? currentPhotos.filter(p => p.filename.toLowerCase().includes(searchQuery.toLowerCase()))
    : currentPhotos

  return (
    <div className="flex h-screen p-4 gap-4 bg-[#F2F3F5] font-sans box-border relative">
      
      <aside className="w-[260px] flex-shrink-0 flex flex-col py-2 h-full">
        <div className="px-4 pb-6 flex items-center gap-3">
          <div className="rounded-xl flex items-center justify-center p-1">
              <Link to="/">
                <img src={logo} alt="Logo" className="h-12 w-auto object-contain" />
              </Link>
          </div>
        </div>

        <div className="flex flex-col gap-1 mb-6">
          <div className="px-4 pb-2 text-xs uppercase tracking-wider text-gray-400 font-semibold">Main</div>
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                setActiveNav(item.label)
                setCurrentFolder(null)
                setFolderHistory([])
              }}
              className={`flex items-center gap-3 px-4 py-2.5 mx-2 text-sm rounded-xl transition-all ${
                activeNav === item.label 
                  ? 'bg-white text-gray-900 shadow-sm font-medium' 
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4.5 h-4.5">{item.icon}</svg>
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-auto flex items-center gap-3 px-2 mb-4">
          <div className="w-10 h-10 rounded-full bg-gray-300 overflow-hidden flex-shrink-0">
             <div className="w-full h-full bg-gradient-to-tr from-indigo-400 to-purple-400 flex items-center justify-center text-white font-bold">U</div>
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="text-sm font-medium text-gray-900 truncate">My Account</div>
          </div>
          <button onClick={handleLogout} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors" title="Вийти">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42C17.99 7.86 19 9.81 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.19 1.01-4.14 2.58-5.42L6.17 5.17C4.23 6.82 3 9.26 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.74-1.23-5.18-3.17-6.83z" />
            </svg>
          </button>
        </div>
      </aside>

      <main className="flex-1 bg-white rounded-2xl flex flex-col shadow-sm overflow-hidden relative border border-gray-100">
        
        <header className="h-[72px] px-6 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            {activeNav}
            {folderHistory.length > 0 && (
              <>
                {folderHistory.map((f, i) => (
                  <span key={i} className="flex items-center gap-2 text-gray-400 font-normal">
                    <span>/</span>
                    <button onClick={goBack} className="hover:text-gray-900">{f.name}</button>
                  </span>
                ))}
                <span className="flex items-center gap-2 text-gray-400 font-normal">
                  <span>/</span>
                  <span className="text-gray-900 font-medium">
                     {folders.find(f => f.id === currentFolder)?.name ?? sharedFolders.find(f => f.id === currentFolder)?.name ?? 'Folder'}
                  </span>
                </span>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search photos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-60 bg-[#F9FAFB] border border-gray-200 text-sm rounded-xl py-2 pl-9 pr-4 outline-none focus:ring-2 focus:ring-[#F76808] transition-all"
              />
              <svg className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
              </svg>
            </div>
            <div className="w-px h-6 bg-gray-200"></div>
            
            <label className={`bg-[#F76808] hover:bg-[#E55B00] text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-colors flex items-center gap-2 cursor-pointer shadow-sm ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
              {uploading ? 'Uploading...' : 'Upload'}
              <input type="file" accept="image/*" className="hidden" onChange={uploadPhoto} disabled={uploading} />
            </label>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 relative">
          {loading ? (
             <div className="flex items-center justify-center h-40 text-gray-400">Loading your gallery...</div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-6">
                <div className="flex gap-2 text-lg font-semibold text-gray-800">
                  Folders
                </div>
                {activeTab === 'my' && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowNewFolder(true)} className="text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl transition-colors">
                      + New Folder
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5 mb-10">
                {currentFoldersList.map((folder) => (
                  <div key={folder.id} className="group bg-[#F9FAFB] hover:bg-white border border-transparent hover:border-gray-200 rounded-2xl p-5 flex flex-col items-center text-center cursor-pointer transition-all hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] relative">
                    <button onClick={() => openFolder(folder)} className="w-full flex flex-col items-center">
                      <div className="w-12 h-12 text-[#FFC107] mb-3">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                          <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                        </svg>
                      </div>
                      <div className="font-medium text-sm text-gray-900 truncate w-full">{folder.name}</div>
                    </button>
                    
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      {activeTab === 'my' && (
                        <button onClick={() => openShareModal('folder', folder.id, folder.name)} className="w-7 h-7 bg-white rounded-full flex items-center justify-center text-indigo-500 shadow-sm border border-gray-100 hover:text-indigo-700">🔗</button>
                      )}
                      <button onClick={() => deleteFolder(folder.id)} className="w-7 h-7 bg-white rounded-full flex items-center justify-center text-red-500 shadow-sm border border-gray-100 hover:text-red-700">✕</button>
                    </div>
                  </div>
                ))}
              </div>

              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Photos</h3>
              
              {filteredPhotos.length === 0 ? (
                <div className="text-center py-20 text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <div className="text-4xl mb-2">📸</div>
                  <p>No photos here yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                  {filteredPhotos.map((photo) => (
                    <div key={photo.id} className="group rounded-2xl overflow-hidden bg-white border border-gray-200 transition-all hover:-translate-y-1 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] relative">
                      <div className="h-40 bg-gray-100 bg-cover bg-center" style={{ backgroundImage: `url('${photo.url}')` }}></div>
                      <div className="p-3">
                        <div className="text-sm font-medium text-gray-900 truncate">{photo.filename}</div>
                        <div className="text-xs text-gray-500 mt-1 flex justify-between">
                           <span>Photo</span>
                        </div>
                      </div>
                      
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        {activeTab === 'my' && (
                          <button onClick={() => openShareModal('photo', photo.id, photo.filename)} className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-indigo-600 hover:bg-white shadow-sm">🔗</button>
                        )}
                        <button onClick={() => deletePhoto(photo.id)} className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-red-500 hover:bg-white shadow-sm">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {showNewFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[20px] p-6 w-full max-w-[400px] shadow-xl m-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">New Folder</h3>
            <div className="mb-6">
              <label className="text-[0.75rem] font-bold text-[#6B7280] mb-2 block tracking-[0.05em] uppercase">
                Folder Name
              </label>
              <input
                type="text"
                placeholder="e.g. Hawaii Trip"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createFolder()}
                className="w-full bg-[#F9FAFB] border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-[#F76808] focus:bg-white outline-none py-3 px-4 transition-all"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => { setShowNewFolder(false); setNewFolderName(''); }} 
                className="px-5 py-2.5 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={createFolder} 
                className="px-5 py-2.5 rounded-xl font-medium text-white bg-[#F76808] hover:bg-[#E55B00] shadow-sm transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {shareModalOpen && shareData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[20px] p-6 w-full max-w-[450px] shadow-xl m-4">
            <h3 className="text-xl font-bold text-gray-900 mb-1">
              Share {shareData.type === 'folder' ? 'Folder' : 'Photo'}
            </h3>
            <p className="text-sm text-gray-500 mb-6 font-sans">
              Manage access for "{shareData.name}"
            </p>

            <div className="flex gap-2 mb-6">
              <input 
                type="email" 
                placeholder="Enter email address..." 
                value={shareEmail}
                onChange={e => setShareEmail(e.target.value)}
                className="flex-1 bg-[#F9FAFB] border border-gray-200 text-gray-900 text-sm rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-[#F76808] transition-all"
                autoFocus
              />
              {shareData.type === 'folder' && (
                <select 
                  value={sharePermission} 
                  onChange={e => setSharePermission(e.target.value)}
                  className="bg-[#F9FAFB] border border-gray-200 text-gray-700 text-sm rounded-xl px-2 outline-none focus:ring-2 focus:ring-[#F76808] transition-all cursor-pointer"
                >
                  <option value="view">Can View</option>
                  <option value="edit">Can Edit</option>
                </select>
              )}
              <button 
                onClick={executeShare}
                disabled={shareLoading || !shareEmail.trim()}
                className="bg-[#F76808] hover:bg-[#E55B00] text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-colors disabled:opacity-50"
              >
                {shareLoading ? '...' : 'Invite'}
              </button>
            </div>

            <div className="font-bold text-[0.75rem] text-gray-400 mb-3 tracking-[0.05em] uppercase">People with access</div>
            
            <div className="flex items-center gap-3 py-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-400 to-purple-400 flex items-center justify-center text-white font-bold flex-shrink-0">
                U
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">You</div>
                <div className="text-xs text-gray-500">Owner</div>
              </div>
              <div className="text-xs text-gray-500 font-medium">Admin</div>
            </div>

            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setShareModalOpen(false)} 
                className="px-6 py-2.5 rounded-xl font-medium text-white bg-gray-900 hover:bg-gray-800 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default AlbumPage