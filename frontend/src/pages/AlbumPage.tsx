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

interface SharedUser {
  email: string
  name: string
  can_delete: boolean
}

interface Toast {
  title: string
  message: string
  type: 'success' | 'error'
}

const formatBytes = (bytes?: number) => {
  if (!bytes) return 'Розмір невідомий'
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' })
}

const AlbumPage = () => {
  const navigate = useNavigate()
  const { logout } = useAuthStore()

  const [folders, setFolders] = useState<Folder[]>([])
  const [photos, setPhotos] = useState<Photo[]>([])
  const [sharedPhotos, setSharedPhotos] = useState<Photo[]>([])
  const [sharedFolders, setSharedFolders] = useState<Folder[]>([])

  const [activeTab, setActiveTab] = useState<'my' | 'shared'>('my')
  const [activeNav, setActiveNav] = useState('Мій альбом')
  
  const [currentFolder, setCurrentFolder] = useState<string | null>(null)
  const [folderHistory, setFolderHistory] = useState<Folder[]>([])
  
  const [searchQuery, setSearchQuery] = useState('')
  const [sortType, setSortType] = useState<'newest' | 'oldest' | 'alphabetical'>('newest')
  const [globalSearchFolders, setGlobalSearchFolders] = useState<Folder[]>([])
  const [globalSearchPhotos, setGlobalSearchPhotos] = useState<Photo[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const [newFolderName, setNewFolderName] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [loading, setLoading] = useState(false)

  const [renameModalOpen, setRenameModalOpen] = useState(false)
  const [itemToRename, setItemToRename] = useState<{ type: 'folder' | 'photo', id: string, name: string } | null>(null)
  const [editName, setEditName] = useState('')
  const [isRenaming, setIsRenaming] = useState(false)

  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [shareData, setShareData] = useState<{ type: 'folder' | 'photo', id: string, name: string } | null>(null)
  const [shareEmail, setShareEmail] = useState('')
  const [sharePermission, setSharePermission] = useState('view')
  const [shareLoading, setShareLoading] = useState(false)
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([])
  const [loadingSharedUsers, setLoadingSharedUsers] = useState(false)

  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [isDragActive, setIsDragActive] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)

  const [previewPhoto, setPreviewPhoto] = useState<Photo | null>(null)

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{ type: 'folder' | 'photo', id: string, name: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [toast, setToast] = useState<Toast | null>(null)

  const showToast = (title: string, message: string, type: 'success' | 'error' = 'success') => {
    setToast({ title, message, type })
    setTimeout(() => setToast(null), 4000)
  }

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim()) {
        setIsSearching(true)
        try {
          const folderEndpoint = activeTab === 'my' ? '/folders/' : '/folders/shared'
          const photoEndpoint = activeTab === 'my' ? '/photos/' : '/photos/shared'

          const [foldersRes, photosRes] = await Promise.allSettled([
            api.get(folderEndpoint, { params: { search: searchQuery.trim() } }),
            api.get(photoEndpoint, { params: { search: searchQuery.trim() } })
          ])

          if (foldersRes.status === 'fulfilled') setGlobalSearchFolders(foldersRes.value.data)
          else setGlobalSearchFolders([])

          if (photosRes.status === 'fulfilled') setGlobalSearchPhotos(photosRes.value.data)
          else setGlobalSearchPhotos([])

        } catch (error) {
          console.error("Помилка глобального пошуку", error)
        } finally {
          setIsSearching(false)
        }
      } else {
        setGlobalSearchFolders([])
        setGlobalSearchPhotos([])
      }
    }, 500)

    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery, activeTab])

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
    if (activeNav === 'Поширені для мене') {
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
      showToast('Успішно', 'Нову директорію створено', 'success')
    } catch {
      showToast('Помилка', 'Не вдалося створити директорію', 'error')
    }
  }

  const openRenameModal = (type: 'folder' | 'photo', id: string, currentName: string) => {
    setItemToRename({ type, id, name: currentName })
    setEditName(currentName)
    setRenameModalOpen(true)
  }

  const executeRename = async () => {
    if (!itemToRename || !editName.trim() || editName.trim() === itemToRename.name) {
      setRenameModalOpen(false)
      return
    }
    
    setIsRenaming(true)
    try {
      if (itemToRename.type === 'folder') {
        await api.patch(`/folders/${itemToRename.id}`, { name: editName.trim() })
      } else {
        await api.patch(`/photos/${itemToRename.id}`, { filename: editName.trim() })
      }
      
      if (searchQuery) setSearchQuery('')
      else if (activeTab === 'my' || currentFolder !== null) fetchData(currentFolder)
      else fetchSharedData()
      
      setRenameModalOpen(false)
      setItemToRename(null)
      showToast('Успішно', 'Назву змінено', 'success')
    } catch {
      showToast('Помилка', 'Не вдалося перейменувати', 'error')
    } finally {
      setIsRenaming(false)
    }
  }

  const openDeleteModal = (type: 'folder' | 'photo', id: string, name: string) => {
    setItemToDelete({ type, id, name })
    setDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!itemToDelete) return
    setIsDeleting(true)
    
    try {
      if (itemToDelete.type === 'folder') {
        await api.delete(`/folders/${itemToDelete.id}`)
      } else {
        await api.delete(`/photos/${itemToDelete.id}`)
      }
      
      if (searchQuery) setSearchQuery('')
      else if (activeTab === 'my' || currentFolder !== null) fetchData(currentFolder)
      else fetchSharedData()
      
      setDeleteModalOpen(false)
      setItemToDelete(null)
      showToast('Видалено', 'Файл успішно видалено', 'success')
    } catch (e) {
      const error = e as { response?: { status: number } };
      if (error.response?.status === 403) {
        showToast('Відмовлено', 'У вас немає прав на видалення', 'error')
      } else {
        showToast('Помилка', 'Не вдалося видалити файл', 'error')
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files))
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragActive(false)
    if (e.dataTransfer.files) {
      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
      setSelectedFiles(files)
    }
  }

  const executeUpload = async () => {
    if (selectedFiles.length === 0) return
    setUploading(true)
    try {
      const params = currentFolder ? `?folder_id=${currentFolder}` : ''
      for (const file of selectedFiles) {
        const formData = new FormData()
        formData.append('file', file)
        await api.post(`/photos/upload${params}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      }
      fetchData(currentFolder)
      setUploadModalOpen(false)
      setSelectedFiles([])
      showToast('Успішно', 'Фотографії завантажено', 'success')
    } catch {
      showToast('Помилка', 'Помилка завантаження фото', 'error')
    } finally {
      setUploading(false)
    }
  }

  const openShareModal = async (type: 'folder' | 'photo', id: string, name: string) => {
    setShareData({ type, id, name })
    setShareEmail('')
    setSharePermission('view')
    setShareModalOpen(true)

    setLoadingSharedUsers(true)
    try {
      const response = await api.get(`/${type}s/${id}/shared-users`)
      setSharedUsers(response.data)
    } catch (error) {
      console.error('Помилка завантаження спільних користувачів:', error)
      setSharedUsers([])
    } finally {
      setLoadingSharedUsers(false)
    }
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
      
      showToast('Готово', `Доступ для ${shareEmail} успішно надано`, 'success')
      setShareEmail('')

      const response = await api.get(`/${shareData.type}s/${shareData.id}/shared-users`)
      setSharedUsers(response.data)

    } catch (e) {
      const error = e as { response?: { status: number, data?: { detail?: string } } }
      if (error.response?.status === 404) {
        showToast('Помилка', 'Користувача з таким email не знайдено', 'error')
      } else if (error.response?.status === 400) {
        showToast('Помилка', error.response.data?.detail || 'Не вдалося поширити', 'error')
      } else {
        showToast('Помилка', 'Сталася помилка при спробі поділитися', 'error')
      }
    } finally {
      setShareLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const navItems = [
    { label: 'Мій альбом', icon: <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z" /> },
    { label: 'Поширені для мене', icon: <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" /> },
  ]

  const currentPhotos = activeTab === 'shared' && currentFolder === null ? sharedPhotos : photos
  const currentFoldersList = activeTab === 'shared' && currentFolder === null ? sharedFolders : folders

  const sourceFolders = searchQuery ? globalSearchFolders : currentFoldersList
  const sourcePhotos = searchQuery ? globalSearchPhotos : currentPhotos

  const filteredFolders = searchQuery
    ? sourceFolders.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : sourceFolders

  const filteredPhotos = searchQuery
    ? sourcePhotos.filter(p => p.filename.toLowerCase().includes(searchQuery.toLowerCase()))
    : sourcePhotos

  const sortedFolders = [...filteredFolders].sort((a, b) => {
    if (sortType === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortType === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sortType === 'alphabetical') return a.name.localeCompare(b.name);
    return 0;
  });

  const sortedPhotos = [...filteredPhotos].sort((a, b) => {
    if (sortType === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortType === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sortType === 'alphabetical') return a.filename.localeCompare(b.filename);
    return 0;
  });

  const isSearchEmpty = searchQuery && !isSearching && sortedFolders.length === 0 && sortedPhotos.length === 0;

  return (
    <div className="flex h-screen p-4 gap-4 bg-[#F2F3F5] font-sans box-border relative overflow-hidden">
      
      <aside className="w-[260px] flex-shrink-0 flex flex-col py-2 h-full">
        <div className="px-4 pb-6 flex items-center gap-3">
          <div className="rounded-xl flex items-center justify-center p-1">
              <Link to="/">
                <img src={logo} alt="Logo" className="h-12 w-auto object-contain" />
              </Link>
          </div>
        </div>

        <div className="flex flex-col gap-1 mb-6">
          <div className="px-4 pb-2 text-xs uppercase tracking-wider text-gray-400 font-semibold">Головна</div>
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                setActiveNav(item.label)
                setCurrentFolder(null)
                setFolderHistory([])
                setSearchQuery('')
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
            <div className="text-sm font-medium text-gray-900 truncate">Мій акаунт</div>
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
                placeholder="Пошук по всіх папках..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-60 bg-[#F9FAFB] border border-gray-200 text-sm rounded-xl py-2 pl-9 pr-4 outline-none focus:ring-2 focus:ring-[#F76808] transition-all"
              />
              <svg className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
              </svg>
            </div>

            <div className="relative">
              <select
                value={sortType}
                onChange={(e) => setSortType(e.target.value as 'newest' | 'oldest' | 'alphabetical')}
                className="bg-[#F9FAFB] border border-gray-200 text-gray-700 text-sm rounded-xl py-2 pl-3 pr-8 outline-none focus:ring-2 focus:ring-[#F76808] transition-all cursor-pointer appearance-none"
              >
                <option value="newest">Спочатку нові</option>
                <option value="oldest">Спочатку старі</option>
                <option value="alphabetical">За алфавітом (А-Я)</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>
            </div>
            
            {activeTab === 'my' && (
              <>
                <div className="w-px h-6 bg-gray-200"></div>
                <button 
                  onClick={() => setUploadModalOpen(true)}
                  className="bg-[#F76808] hover:bg-[#E55B00] text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
                  Завантажити
                </button>
              </>
            )}

          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 relative">
          {loading || isSearching ? (
             <div className="flex items-center justify-center h-40 text-gray-400">
               {isSearching ? 'Шукаємо по всіх папках...' : 'Завантаження вашої галереї...'}
             </div>
          ) : isSearchEmpty ? (
             <div className="text-center py-20 text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200 mt-4">
               <div className="text-4xl mb-2">🔍</div>
               <p>За запитом <b className="text-gray-600">"{searchQuery}"</b> нічого не знайдено</p>
               <button 
                 onClick={() => setSearchQuery('')}
                 className="mt-4 text-[#F76808] hover:underline text-sm font-medium"
               >
                 Очистити пошук
               </button>
             </div>
          ) : (
            <>

              {(sortedFolders.length > 0 || !searchQuery) && (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex gap-2 text-lg font-semibold text-gray-800">
                      Папки {searchQuery && <span className="text-gray-400 text-sm font-normal ml-2">({sortedFolders.length})</span>}
                    </div>
                    {activeTab === 'my' && (
                      <div className="flex items-center gap-2">
                        <button onClick={() => setShowNewFolder(true)} className="text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl transition-colors">
                          + Нова директорія
                        </button>
                      </div>
                    )}
                  </div>

                  {sortedFolders.length === 0 && !searchQuery ? (
                    <div className="text-sm text-gray-400 mb-10 pl-1">У цій директорії ще немає папок</div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5 mb-10">
                      {sortedFolders.map((folder) => (
                        <div key={folder.id} className="group bg-[#F9FAFB] hover:bg-white border border-transparent hover:border-gray-200 rounded-2xl p-5 flex flex-col items-center text-center cursor-pointer transition-all hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] relative">
                          <button 
                            onClick={() => { openFolder(folder); setSearchQuery(''); }} 
                            className="w-full flex flex-col items-center"
                          >
                            <div className="w-12 h-12 text-[#FFC107] mb-3">
                              <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                                <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                              </svg>
                            </div>
                            <div className="font-medium text-sm text-gray-900 truncate w-full">{folder.name}</div>
                          </button>
                          
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            {activeTab === 'my' && (
                              <>
                                <button onClick={() => openRenameModal('folder', folder.id, folder.name)} className="w-7 h-7 bg-white rounded-full flex items-center justify-center text-blue-500 shadow-sm border border-gray-100 hover:text-blue-700" title="Перейменувати">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                </button>
                                <button onClick={() => openShareModal('folder', folder.id, folder.name)} className="w-7 h-7 bg-white rounded-full flex items-center justify-center text-indigo-500 shadow-sm border border-gray-100 hover:text-indigo-700" title="Поширити">🔗</button>
                              </>
                            )}
                            <button onClick={() => openDeleteModal('folder', folder.id, folder.name)} className="w-7 h-7 bg-white rounded-full flex items-center justify-center text-red-500 shadow-sm border border-gray-100 hover:text-red-700" title="Видалити">✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {(sortedPhotos.length > 0 || !searchQuery) && (
                <>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                    Фото {searchQuery && <span className="lowercase font-normal">({sortedPhotos.length})</span>}
                  </h3>
                  
                  {sortedPhotos.length === 0 && !searchQuery ? (
                    <div className="text-center py-20 text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                      <div className="text-4xl mb-2">📸</div>
                      <p>Поки що фото немає</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                      {sortedPhotos.map((photo) => (
                        <div key={photo.id} className="group rounded-2xl overflow-hidden bg-white border border-gray-200 transition-all hover:-translate-y-1 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] relative">
                          <div 
                            className="h-40 bg-gray-100 bg-cover bg-center cursor-pointer" 
                            style={{ backgroundImage: `url('${photo.url}')` }}
                            onClick={() => setPreviewPhoto(photo)}
                          ></div>
                          <div className="p-3">
                            <div className="text-sm font-medium text-gray-900 truncate">{photo.filename}</div>
                            <div className="text-xs text-gray-400 mt-1.5 flex justify-between items-center">
                               <span>{formatDate(photo.created_at)}</span>
                               <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">{formatBytes(photo.size)}</span>
                            </div>
                          </div>
                          
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            {activeTab === 'my' && (
                              <>
                                <button onClick={() => openRenameModal('photo', photo.id, photo.filename)} className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-blue-500 hover:bg-white shadow-sm" title="Перейменувати">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                </button>
                                <button onClick={() => openShareModal('photo', photo.id, photo.filename)} className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-indigo-600 hover:bg-white shadow-sm" title="Поширити">🔗</button>
                              </>
                            )}
                            <button onClick={() => openDeleteModal('photo', photo.id, photo.filename)} className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-red-500 hover:bg-white shadow-sm" title="Видалити">✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </main>

      {showNewFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[20px] p-6 w-full max-w-[400px] shadow-xl m-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Нова директорія</h3>
            <div className="mb-6">
              <label className="text-[0.75rem] font-bold text-[#6B7280] mb-2 block tracking-[0.05em] uppercase">
                Назва директорії
              </label>
              <input
                type="text"
                placeholder="e.g. Робота"
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
                Відмінити
              </button>
              <button 
                onClick={createFolder} 
                className="px-5 py-2.5 rounded-xl font-medium text-white bg-[#F76808] hover:bg-[#E55B00] shadow-sm transition-colors"
              >
                Створити
              </button>
            </div>
          </div>
        </div>
      )}

      {renameModalOpen && itemToRename && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[20px] p-6 w-full max-w-[400px] shadow-xl m-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Перейменувати {itemToRename.type === 'folder' ? 'директорію' : 'фото'}
            </h3>
            <div className="mb-6">
              <label className="text-[0.75rem] font-bold text-[#6B7280] mb-2 block tracking-[0.05em] uppercase">
                Нова назва
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && executeRename()}
                className="w-full bg-[#F9FAFB] border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-[#F76808] focus:bg-white outline-none py-3 px-4 transition-all"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => { setRenameModalOpen(false); setItemToRename(null); }} 
                className="px-5 py-2.5 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                disabled={isRenaming}
              >
                Відмінити
              </button>
              <button 
                onClick={executeRename} 
                disabled={isRenaming || !editName.trim()}
                className="px-5 py-2.5 rounded-xl font-medium text-white bg-[#F76808] hover:bg-[#E55B00] shadow-sm transition-colors disabled:opacity-50"
              >
                {isRenaming ? 'Збереження...' : 'Зберегти'}
              </button>
            </div>
          </div>
        </div>
      )}

      {shareModalOpen && shareData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[20px] p-6 w-full max-w-[500px] shadow-xl m-4">
            <h3 className="text-xl font-bold text-gray-900 mb-1">
              Поширити {shareData.type === 'folder' ? 'Каталог' : 'Фото'}
            </h3>
            <p className="text-sm text-gray-500 mb-6 font-sans">
              Керувати доступом до "{shareData.name}"
            </p>

            <div className="flex gap-2 mb-6">
              <input 
                type="email" 
                placeholder="Введіть email адресу..." 
                value={shareEmail}
                onChange={e => setShareEmail(e.target.value)}
                className="flex-1 bg-[#F9FAFB] border border-gray-200 text-gray-900 text-sm rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-[#F76808] transition-all"
              />
              {shareData.type === 'folder' && (
                <select 
                  value={sharePermission} 
                  onChange={e => setSharePermission(e.target.value)}
                  className="bg-[#F9FAFB] border border-gray-200 text-gray-700 text-sm rounded-xl px-2 outline-none focus:ring-2 focus:ring-[#F76808] transition-all cursor-pointer"
                >
                  <option value="view">Перегляд</option>
                  <option value="edit">Редагування</option>
                </select>
              )}
              <button 
                onClick={executeShare}
                disabled={shareLoading || !shareEmail.trim()}
                className="bg-[#F76808] hover:bg-[#E55B00] text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-colors disabled:opacity-50"
              >
                {shareLoading ? '...' : 'Запросити'}
              </button>
            </div>

            <div className="font-bold text-[0.75rem] text-gray-400 mb-3 tracking-[0.05em] uppercase">Люди з доступом</div>
              {loadingSharedUsers ? (
                <div className="text-center py-4 text-xs text-gray-400">Завантаження користувачів...</div>
              ) : (
                sharedUsers.map((user, index) => (
                  <div key={index} className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold flex-shrink-0">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="text-sm font-medium text-gray-900 truncate">{user.name}</div>
                      <div className="text-xs text-gray-500 truncate">{user.email}</div>
                    </div>
                    <div className="text-xs text-gray-500 font-medium">
                      {user.can_delete ? 'Редагувати' : 'Перегляд'}
                    </div>
                  </div>
                ))
              )}

            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setShareModalOpen(false)} 
                className="px-6 py-2.5 rounded-xl font-medium text-white bg-gray-900 hover:bg-gray-800 transition-colors"
              >
                Готово
              </button>
            </div>
          </div>
        </div>
      )}

      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[20px] p-6 w-full max-w-[450px] shadow-xl m-4">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Завантажити фото</h3>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
              onDragLeave={() => setIsDragActive(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-upload-input')?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                isDragActive 
                  ? 'border-[#F76808] bg-[#F76808]/5' 
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <input
                id="file-upload-input"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
              <div className={`mb-3 transition-colors ${isDragActive ? 'text-[#F76808]' : 'text-gray-400'}`}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
                </svg>
              </div>
              <div className="font-medium text-gray-900 font-sans">Перетягніть файли сюди</div>
              <div className="text-sm text-gray-500 mt-1 font-sans">або натисніть, щоб вибрати</div>
            </div>

            {selectedFiles.length > 0 && (
              <div className="mt-4 max-h-32 overflow-y-auto pr-2">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Вибрані файли:</div>
                {selectedFiles.map((file, idx) => (
                  <div key={idx} className="text-sm text-gray-700 truncate py-1 border-b border-gray-100 last:border-0">
                    {file.name}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button 
                onClick={() => { setUploadModalOpen(false); setSelectedFiles([]); }} 
                className="px-5 py-2.5 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                disabled={uploading}
              >
                Відмінити
              </button>
              <button 
                onClick={executeUpload} 
                disabled={uploading || selectedFiles.length === 0}
                className="px-5 py-2.5 rounded-xl font-medium text-white bg-[#F76808] hover:bg-[#E55B00] shadow-sm transition-colors disabled:opacity-50"
              >
                {uploading ? 'Завантаження...' : `Завантажити ${selectedFiles.length} фото`}
              </button>
            </div>
          </div>
        </div>
      )}

      {previewPhoto && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 sm:p-8 cursor-pointer"
          onClick={() => setPreviewPhoto(null)}
        >
          <div className="absolute top-4 right-4 flex gap-3 z-10">
            <button 
              className="text-white hover:text-gray-900 bg-black/50 hover:bg-white rounded-full w-12 h-12 flex items-center justify-center transition-all"
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  const response = await fetch(previewPhoto.url, { cache: 'no-store' });
                  if (!response.ok) throw new Error('Network error');
                  const blob = await response.blob();
                  const blobUrl = window.URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = blobUrl;
                  link.download = previewPhoto.filename || 'photo.jpg';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  window.URL.revokeObjectURL(blobUrl);
                } catch (error) {
                  console.error("Помилка завантаження файлу", error);
                  window.open(previewPhoto.url, '_blank');
                }
              }}
              title="Завантажити фото"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </button>

            <button 
              className="text-white hover:text-gray-900 bg-black/50 hover:bg-white rounded-full w-12 h-12 flex items-center justify-center transition-all"
              onClick={(e) => {
                e.stopPropagation();
                setPreviewPhoto(null);
              }}
              title="Закрити"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
          
          <img 
            src={previewPhoto.url} 
            alt="Preview" 
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl cursor-default"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {deleteModalOpen && itemToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[20px] p-6 w-full max-w-[400px] shadow-xl m-4 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Видалити {itemToDelete.type === 'folder' ? 'директорію' : 'фотографію'}?
            </h3>
            
            <p className="text-sm text-gray-500 mb-6 font-sans">
              Ви впевнені, що хочете назавжди видалити "{itemToDelete.name}"? 
              {itemToDelete.type === 'folder' && " Це також видалить усі файли всередині неї."}
            </p>
            
            <div className="flex justify-center gap-3">
              <button 
                onClick={() => { setDeleteModalOpen(false); setItemToDelete(null); }} 
                disabled={isDeleting}
                className="px-6 py-2.5 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Відмінити
              </button>
              <button 
                onClick={confirmDelete} 
                disabled={isDeleting}
                className="px-6 py-2.5 rounded-xl font-medium text-white bg-red-500 hover:bg-red-600 shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting ? 'Видалення...' : 'Так, видалити'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-[100] animate-[bounce_0.3s_ease-in-out]">
          <div className="bg-white pl-4 pr-6 py-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 flex items-center gap-4">
            
            {toast.type === 'success' ? (
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-green-50 text-green-500">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-red-50 text-red-500">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </div>
            )}
            
            <div>
              <h4 className="text-sm font-bold text-gray-900 mb-0.5">{toast.title}</h4>
              <p className="text-xs text-gray-500 max-w-[250px]">{toast.message}</p>
            </div>
            
            <button 
              onClick={() => setToast(null)} 
              className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                 <line x1="18" y1="6" x2="6" y2="18"></line>
                 <line x1="6" y1="6" x2="18" y2="18"></line>
               </svg>
            </button>

          </div>
        </div>
      )}

    </div>
  )
}

export default AlbumPage