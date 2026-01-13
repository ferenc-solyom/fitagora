import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Product, Favorite, UpdateProductRequest, Category } from '../types'
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getFavorites,
  addFavorite,
  removeFavorite,
  getCategories,
  ApiError
} from '../api'
import { useAuth } from '../context/AuthContext'

const MAX_IMAGE_SIZE = 100 * 1024
const MAX_IMAGE_DIMENSION = 800
const MAX_IMAGES = 3
const PAGE_SIZE = 12

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img

        if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
          if (width > height) {
            height = (height / width) * MAX_IMAGE_DIMENSION
            width = MAX_IMAGE_DIMENSION
          } else {
            width = (width / height) * MAX_IMAGE_DIMENSION
            height = MAX_IMAGE_DIMENSION
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Could not get canvas context'))
          return
        }
        ctx.drawImage(img, 0, 0, width, height)

        let quality = 0.7
        let dataUrl = canvas.toDataURL('image/jpeg', quality)

        while (dataUrl.length > MAX_IMAGE_SIZE && quality > 0.1) {
          quality -= 0.1
          dataUrl = canvas.toDataURL('image/jpeg', quality)
        }

        if (dataUrl.length > MAX_IMAGE_SIZE) {
          reject(new Error('Image too large even after compression'))
          return
        }

        resolve(dataUrl)
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

export function Products() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [imageLoading, setImageLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [modalImages, setModalImages] = useState<string[] | null>(null)
  const [modalIndex, setModalIndex] = useState(0)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editImages, setEditImages] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editFileInputRef = useRef<HTMLInputElement>(null)

  const fetchData = async (query?: string, catFilter?: string, page: number = 1) => {
    try {
      setLoading(true)
      setError(null)
      const offset = (page - 1) * PAGE_SIZE
      const searchParams = {
        q: query || undefined,
        category: catFilter || undefined,
        limit: PAGE_SIZE,
        offset
      }
      const [paginatedData, favoritesData] = await Promise.all([
        getProducts(searchParams),
        user ? getFavorites() : Promise.resolve([])
      ])
      setProducts(paginatedData.items)
      setTotalProducts(paginatedData.total)
      setFavorites(new Set(favoritesData.map((f: Favorite) => f.productId)))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {})
  }, [])

  useEffect(() => {
    fetchData(searchQuery, categoryFilter, currentPage)
  }, [user, searchQuery, categoryFilter, currentPage])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    setSearchQuery(searchInput.trim())
  }

  const handleClearSearch = () => {
    setSearchInput('')
    setSearchQuery('')
    setCategoryFilter('')
    setCurrentPage(1)
  }

  const handleCategoryChange = (value: string) => {
    setCurrentPage(1)
    setCategoryFilter(value)
  }

  const totalPages = Math.ceil(totalProducts / PAGE_SIZE)

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const files = e.target.files
    if (!files) return

    const currentImages = isEdit ? editImages : images
    if (currentImages.length + files.length > MAX_IMAGES) {
      setActionError(`Maximum ${MAX_IMAGES} images allowed`)
      return
    }

    try {
      setImageLoading(true)
      setActionError(null)

      const newImages: string[] = []
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          setActionError('Please select image files only')
          continue
        }
        const compressed = await compressImage(file)
        newImages.push(compressed)
      }

      if (isEdit) {
        setEditImages(prev => [...prev, ...newImages])
      } else {
        setImages(prev => [...prev, ...newImages])
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to process image')
    } finally {
      setImageLoading(false)
      if (e.target) e.target.value = ''
    }
  }

  const handleRemoveImage = (index: number, isEdit = false) => {
    if (isEdit) {
      setEditImages(prev => prev.filter((_, i) => i !== index))
    } else {
      setImages(prev => prev.filter((_, i) => i !== index))
    }
  }

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionError(null)
    try {
      const priceNum = parseFloat(price)
      if (isNaN(priceNum) || priceNum <= 0) {
        setActionError('Price must be a positive number')
        return
      }
      if (!category) {
        setActionError('Please select a category')
        return
      }
      await createProduct({
        name,
        description: description || undefined,
        price: priceNum,
        category,
        images: images.length > 0 ? images : undefined
      })
      setName('')
      setDescription('')
      setPrice('')
      setCategory('')
      setImages([])
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      setCurrentPage(1)
      await fetchData(searchQuery, categoryFilter, 1)
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Failed to add product')
    }
  }

  const handleStartEdit = (product: Product) => {
    setEditingProduct(product)
    setEditName(product.name)
    setEditDescription(product.description || '')
    setEditPrice(product.price.toString())
    setEditCategory(product.category)
    setEditImages([...product.images])
    setActionError(null)
  }

  const handleCancelEdit = () => {
    setEditingProduct(null)
    setEditName('')
    setEditDescription('')
    setEditPrice('')
    setEditCategory('')
    setEditImages([])
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProduct) return

    setActionError(null)
    try {
      const priceNum = parseFloat(editPrice)
      if (isNaN(priceNum) || priceNum <= 0) {
        setActionError('Price must be a positive number')
        return
      }
      if (!editCategory) {
        setActionError('Please select a category')
        return
      }

      const request: UpdateProductRequest = {
        name: editName,
        description: editDescription || undefined,
        price: priceNum,
        category: editCategory,
        images: editImages.length > 0 ? editImages : undefined
      }

      await updateProduct(editingProduct.id, request)
      handleCancelEdit()
      await fetchData(searchQuery, categoryFilter, currentPage)
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Failed to update product')
    }
  }

  const handleDeleteProduct = async (id: string) => {
    setActionError(null)
    try {
      await deleteProduct(id)
      // If we deleted the last item on the current page, go back a page
      const newPage = products.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage
      if (newPage !== currentPage) {
        setCurrentPage(newPage)
      } else {
        await fetchData(searchQuery, categoryFilter, currentPage)
      }
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Failed to delete product')
    }
  }

  const handleToggleFavorite = async (productId: string) => {
    if (!user) return

    setActionError(null)
    try {
      if (favorites.has(productId)) {
        await removeFavorite(productId)
        setFavorites(prev => {
          const next = new Set(prev)
          next.delete(productId)
          return next
        })
      } else {
        await addFavorite(productId)
        setFavorites(prev => new Set(prev).add(productId))
      }
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Failed to update favorite')
    }
  }

  const isOwner = (product: Product): boolean => {
    return user !== null && product.ownerId === user.id
  }

  const closeImageModal = () => {
    setModalImages(null)
    setModalIndex(0)
  }

  const getCategoryLabel = (value: string): string => {
    return t(`categories.${value}`, { defaultValue: value })
  }

  if (loading) return <div className="loading">{t('common.loading')}</div>
  if (error) return <div className="error">{error}</div>

  return (
    <div className="section">
      <h2>{t('products.title')}</h2>

      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          placeholder={t('products.searchPlaceholder')}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="search-input"
        />
        <select
          value={categoryFilter}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="category-select"
        >
          <option value="">{t('products.allCategories')}</option>
          {categories.map(cat => (
            <option key={cat.value} value={cat.value}>{t(`categories.${cat.value}`, { defaultValue: cat.label })}</option>
          ))}
        </select>
        <button type="submit" className="search-btn">{t('common.search')}</button>
        {(searchQuery || categoryFilter) && (
          <button type="button" onClick={handleClearSearch} className="clear-search-btn">
            {t('common.clear')}
          </button>
        )}
      </form>

      <p className="search-results-info">
        {searchQuery && t('products.resultsFor', { query: searchQuery })}
        {searchQuery && categoryFilter && ` ${t('products.resultsIn')} `}
        {categoryFilter && getCategoryLabel(categoryFilter)}
        {(searchQuery || categoryFilter) ? ' - ' : ''}
        {t('products.productsCount', { count: totalProducts })}
        {totalPages > 1 && ` ${t('products.pageInfo', { current: currentPage, total: totalPages })}`}
      </p>

      {user ? (
        <form onSubmit={handleAddProduct} className="form product-form">
          <div className="form-main-inputs">
            <input
              type="text"
              placeholder={t('products.form.namePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="category-select"
              required
            >
              <option value="">{t('products.form.selectCategory')}</option>
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{t(`categories.${cat.value}`, { defaultValue: cat.label })}</option>
              ))}
            </select>
            <input
              type="number"
              placeholder={t('products.form.pricePlaceholder')}
              step="0.01"
              min="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>
          <textarea
            placeholder={t('products.form.descriptionPlaceholder')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="form-textarea"
            rows={2}
          />
          <div className="form-image-row">
            <label className="image-upload-btn">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleImageSelect(e, false)}
                style={{ display: 'none' }}
                disabled={images.length >= MAX_IMAGES}
              />
              {imageLoading ? t('products.form.processing') : t('products.form.addPhotos', { current: images.length, max: MAX_IMAGES })}
            </label>
            {images.map((img, idx) => (
              <div key={idx} className="image-preview-container">
                <img src={img} alt={`Preview ${idx + 1}`} className="image-preview" />
                <button type="button" onClick={() => handleRemoveImage(idx, false)} className="remove-image-btn">×</button>
              </div>
            ))}
          </div>
          <button type="submit" disabled={imageLoading}>{t('products.form.listEquipment')}</button>
        </form>
      ) : (
        <p className="auth-prompt" style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid var(--color-border)' }}>
          {t('products.loginToSell')}
        </p>
      )}

      {actionError && <div className="error">{actionError}</div>}

      {products.length === 0 ? (
        <p className="empty-state">{t('products.noProducts')}</p>
      ) : (
        <div className="products-grid">
          {products.map((product) => (
            <div key={product.id} className="product-card">
              <Link to={`/products/${product.id}`} className="product-link">
                <div className="product-image-container">
                  {product.images.length > 0 ? (
                    <>
                      <img src={product.images[0]} alt={product.name} className="product-image" />
                      {product.images.length > 1 && (
                        <span className="image-count">{t('products.photos', { count: product.images.length })}</span>
                      )}
                    </>
                  ) : (
                    <div className="product-image-placeholder">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="M21 15l-5-5L5 21" />
                      </svg>
                    </div>
                  )}
                  {isOwner(product) && <span className="owner-badge">{t('products.yours')}</span>}
                </div>
                <div className="product-info">
                  <h3 className="product-name">{product.name}</h3>
                  <span className="category-badge">{getCategoryLabel(product.category)}</span>
                  <p className="product-price">{product.price.toFixed(2)} Lei</p>
                </div>
              </Link>
              <div className="product-actions">
                {user && !isOwner(product) && (
                  <button
                    onClick={() => handleToggleFavorite(product.id)}
                    className={`favorite-btn ${favorites.has(product.id) ? 'favorited' : ''}`}
                    title={favorites.has(product.id) ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill={favorites.has(product.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </button>
                )}
                {isOwner(product) ? (
                  <>
                    <button onClick={() => handleStartEdit(product)} className="edit-btn">{t('products.actions.edit')}</button>
                    <button onClick={() => handleDeleteProduct(product.id)} className="delete-btn">{t('products.actions.remove')}</button>
                  </>
                ) : (
                  <Link to={`/products/${product.id}`} className="view-btn">{t('products.actions.view')}</Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            className="pagination-btn"
            title={t('pagination.first')}
          >
            ««
          </button>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="pagination-btn"
            title={t('pagination.previous')}
          >
            «
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(page => {
              if (totalPages <= 7) return true
              if (page === 1 || page === totalPages) return true
              return Math.abs(page - currentPage) <= 1;

            })
            .reduce((acc: (number | string)[], page, idx, arr) => {
              if (idx > 0 && typeof arr[idx - 1] === 'number' && page - (arr[idx - 1] as number) > 1) {
                acc.push('...')
              }
              acc.push(page)
              return acc
            }, [])
            .map((item, idx) => (
              typeof item === 'string' ? (
                <span key={`ellipsis-${idx}`} className="pagination-ellipsis">{item}</span>
              ) : (
                <button
                  key={item}
                  onClick={() => handlePageChange(item)}
                  className={`pagination-btn ${currentPage === item ? 'active' : ''}`}
                >
                  {item}
                </button>
              )
            ))
          }

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="pagination-btn"
            title={t('pagination.next')}
          >
            »
          </button>
          <button
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="pagination-btn"
            title={t('pagination.last')}
          >
            »»
          </button>
        </div>
      )}

      {editingProduct && (
        <div className="edit-modal" onClick={handleCancelEdit}>
          <div className="edit-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{t('products.edit.title')}</h3>
            <form onSubmit={handleSaveEdit} className="edit-form">
              <div className="form-group">
                <label>{t('products.edit.name')}</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>{t('products.edit.description')}</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>{t('products.edit.category')}</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="category-select"
                  required
                >
                  <option value="">{t('products.form.selectCategory')}</option>
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{t(`categories.${cat.value}`, { defaultValue: cat.label })}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>{t('products.edit.price')}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>{t('products.edit.images', { current: editImages.length, max: MAX_IMAGES })}</label>
                <div className="edit-images-row">
                  {editImages.map((img, idx) => (
                    <div key={idx} className="image-preview-container">
                      <img src={img} alt={`Image ${idx + 1}`} className="image-preview" />
                      <button type="button" onClick={() => handleRemoveImage(idx, true)} className="remove-image-btn">×</button>
                    </div>
                  ))}
                  {editImages.length < MAX_IMAGES && (
                    <label className="image-upload-btn small">
                      <input
                        ref={editFileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleImageSelect(e, true)}
                        style={{ display: 'none' }}
                      />
                      +
                    </label>
                  )}
                </div>
              </div>
              <div className="edit-modal-actions">
                <button type="button" onClick={handleCancelEdit} className="cancel-btn">{t('common.cancel')}</button>
                <button type="submit" disabled={imageLoading}>{t('products.edit.saveChanges')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalImages && (
        <div className="image-modal" onClick={closeImageModal}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <img src={modalImages[modalIndex]} alt="Full size" />
            {modalImages.length > 1 && (
              <>
                <button
                  className="image-modal-prev"
                  onClick={() => setModalIndex((modalIndex - 1 + modalImages.length) % modalImages.length)}
                >
                  ‹
                </button>
                <button
                  className="image-modal-next"
                  onClick={() => setModalIndex((modalIndex + 1) % modalImages.length)}
                >
                  ›
                </button>
                <div className="image-modal-counter">
                  {modalIndex + 1} / {modalImages.length}
                </div>
              </>
            )}
            <button className="image-modal-close" onClick={closeImageModal}>×</button>
          </div>
        </div>
      )}
    </div>
  )
}
