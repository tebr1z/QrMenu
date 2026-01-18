import React, { useContext, useState, useEffect, useRef } from 'react'
import { ContextAdmin } from '../../context/AdminContext'
import { ContextUser } from '../../context/CheckUserContext'
import { toast } from 'react-toastify'

const ProductModal = ({ isOpen, onClose, product }) => {
    const { addProductFunc, updateProductFunc, categories, products, productLoading } = useContext(ContextAdmin)
    const { hasJwtToken } = useContext(ContextUser)
    
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        freeMinutes: '',
        freeMinutesForPS: '',
        category: '',
        image: null,
        stockQuantity: '',
        purchasePrice: '',
        isSet: false,
        setItems: []
    })
    
    const [imagePreview, setImagePreview] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [colorPickerOpen, setColorPickerOpen] = useState(false)
    const descriptionRef = useRef(null)
    const [selectedProductForSet, setSelectedProductForSet] = useState('')
    const [selectedQuantityForSet, setSelectedQuantityForSet] = useState(1)
    
    // Reset form when modal opens/closes or product changes
    useEffect(() => {
        if (isOpen) {
            if (product) {
                // Edit mode
                setFormData({
                    name: product.name || '',
                    description: product.description || '',
                    price: product.price || '',
                    freeMinutes: product.freeMinutes || '',
                    freeMinutesForPS: product.freeMinutesForPS || '',
                    category: product.category?._id || product.category || '',
                    image: null,
                    stockQuantity: product.stockQuantity || '',
                    purchasePrice: product.purchasePrice || '',
                    isSet: product.isSet || false,
                    setItems: product.setItems || []
                })
                setImagePreview(product.image || '')
                
                // Set the content of the rich text editor after a short delay
                setTimeout(() => {
                    if (descriptionRef.current) {
                        descriptionRef.current.innerHTML = product.description || '';
                    }
                }, 100);
            } else {
                // Add mode
                setFormData({
                    name: '',
                    description: '',
                    price: '',
                    freeMinutes: '',
                    freeMinutesForPS: '',
                    category: '',
                    image: null,
                    stockQuantity: '',
                    purchasePrice: '',
                    isSet: false,
                    setItems: []
                })
                setImagePreview('')
                
                // Clear the rich text editor
                setTimeout(() => {
                    if (descriptionRef.current) {
                        descriptionRef.current.innerHTML = '';
                    }
                }, 100);
            }
        }
    }, [isOpen, product])
    
    // Close color picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (colorPickerOpen && !event.target.closest('.color-picker')) {
                setColorPickerOpen(false);
            }
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [colorPickerOpen]);
    
    // Rich text editor functions
    const execCommand = (command, value = null) => {
        if (descriptionRef.current) {
            descriptionRef.current.focus()
            document.execCommand(command, false, value)
        }
    }
    
    const handleInputChange = (e) => {
        const { name, value, files } = e.target
        
        if (name === 'image' && files[0]) {
            const file = files[0]
            setFormData(prev => ({ ...prev, image: file }))
            
            // Create preview
            const reader = new FileReader()
            reader.onload = (e) => setImagePreview(e.target.result)
            reader.readAsDataURL(file)
        } else {
            setFormData(prev => ({ ...prev, [name]: value }))
        }
    }
    
    // Clean HTML content before saving
    const cleanHtmlContent = (htmlContent) => {
        if (!htmlContent) return '';
        
        // Create a temporary div to parse HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        
        // Remove only complex style attributes and classes, but keep basic formatting
        const elements = tempDiv.querySelectorAll('*');
        elements.forEach(element => {
            // Remove complex CSS styles but keep basic formatting
            if (element.style) {
                // Keep color, font-weight, font-style but remove complex CSS
                const color = element.style.color;
                const fontWeight = element.style.fontWeight;
                const fontStyle = element.style.fontStyle;
                
                element.removeAttribute('style');
                
                // Re-apply basic formatting
                if (color) element.style.color = color;
                if (fontWeight) element.style.fontWeight = fontWeight;
                if (fontStyle) element.style.fontStyle = fontStyle;
            }
            
            // Remove complex classes but keep basic ones
            if (element.className) {
                const classes = element.className.split(' ');
                const basicClasses = classes.filter(cls => 
                    cls.includes('text-') || 
                    cls.includes('font-') || 
                    cls.includes('bg-') ||
                    cls === 'bold' || 
                    cls === 'italic' ||
                    cls === 'underline'
                );
                element.className = basicClasses.join(' ');
            }
        });
        
        // Get clean HTML
        let cleanHtml = tempDiv.innerHTML;
        
        // Remove any remaining complex style tags
        cleanHtml = cleanHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
        
        // Remove script tags
        cleanHtml = cleanHtml.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
        
        // Clean up extra whitespace but preserve line breaks
        cleanHtml = cleanHtml.replace(/\s+/g, ' ');
        cleanHtml = cleanHtml.trim();
        
        return cleanHtml;
    };

    const handleDescriptionChange = (e) => {
        const content = e.target.innerHTML;
        setFormData(prev => ({ ...prev, description: content }));
    }
    
    const handleSubmit = async (e) => {
        e.preventDefault()
        
        if (!hasJwtToken) {
            toast.error('Səssiyanız bitib. Yenidən daxil olun.')
            return
        }
        
        // Validation
        if (!formData.name.trim()) {
            toast.error('Məhsul adını daxil edin')
            return
        }
        
        if (!formData.price || parseFloat(formData.price) <= 0) {
            toast.error('Düzgün qiymət daxil edin')
            return
        }
        
        if (!formData.category) {
            toast.error('Kateqoriya seçin')
            return
        }
        
        setIsSubmitting(true)
        
        try {
            const submitData = new FormData()
            submitData.append('name', formData.name.trim())
            submitData.append('description', cleanHtmlContent(formData.description))
            submitData.append('price', parseFloat(formData.price))
            submitData.append('freeMinutes', parseInt(formData.freeMinutes) || 0)
            submitData.append('freeMinutesForPS', formData.freeMinutesForPS || '')
            submitData.append('category', formData.category)
            submitData.append('stockQuantity', parseInt(formData.stockQuantity) || 0)
            submitData.append('purchasePrice', parseFloat(formData.purchasePrice) || 0)
            submitData.append('isSet', formData.isSet)
            submitData.append('setItems', JSON.stringify(formData.setItems))
            
            if (formData.image) {
                console.log('Adding image to FormData:', formData.image);
                console.log('Image type:', formData.image.type);
                console.log('Image size:', formData.image.size);
                submitData.append('imageProduct', formData.image)
                
                // Log FormData after adding image
                console.log('FormData after adding image:');
                for (let [key, value] of submitData.entries()) {
                    console.log(`${key}:`, value);
                }
            } else {
                console.log('No image selected');
            }
            
            if (product) {
                // Update existing product
                const updateResult = await updateProductFunc(product._id, submitData)
                console.log('Update result:', updateResult);
                toast.success('Məhsul uğurla yeniləndi')
        } else {
                // Add new product
                const addResult = await addProductFunc(submitData)
                console.log('Add result:', addResult);
                toast.success('Məhsul uğurla əlavə edildi')
            }
            
            onClose()
        } catch (error) {
            console.error('Submit error:', error)
            toast.error('Xəta baş verdi. Yenidən cəhd edin.')
        } finally {
            setIsSubmitting(false)
        }
    }
    
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-800">
                        {product ? 'Məhsulu Düzəliş Et' : 'Yeni Məhsul Əlavə Et'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                        disabled={isSubmitting}
                    >
                        ×
                    </button>
                </div>
                
                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Image Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Məhsul Şəkli
                </label>
                        <div className="flex items-center space-x-4">
                            <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                                {imagePreview ? (
                                    <img
                                        src={imagePreview}
                                        alt="Preview"
                                        className="w-full h-full object-cover rounded-lg"
                                    />
                                ) : (
                                    <i className="bi bi-image text-2xl text-gray-400"></i>
                                )}
                            </div>
                <input
                                type="file"
                                name="image"
                                accept="image/*"
                                onChange={handleInputChange}
                                className="flex-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>
                    
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Məhsul Adı *
                </label>
                <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            placeholder="Məhsul adını daxil edin"
                            disabled={isSubmitting}
                            required
                        />
                    </div>
                    
                    {/* Category */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Kateqoriya *
                </label>
                <select
                            name="category"
                            value={formData.category}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            disabled={isSubmitting}
                            required
                        >
                            <option value="">Kateqoriya seçin</option>
                            {categories.map(category => (
                                <option key={category._id} value={category._id}>
                                    {category.name}
                            </option>
                        ))}
                </select>
                    </div>
                    
                    {/* Price and Free Minutes */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Qiymət (₼) *
                            </label>
                            <input
                                type="number"
                                name="price"
                                value={formData.price}
                                onChange={handleInputChange}
                                step="0.01"
                                min="0"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                placeholder="0.00"
                                disabled={isSubmitting}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Pulsuz Dəqiqə
                            </label>
                    <input
                                type="number"
                                name="freeMinutes"
                                value={formData.freeMinutes}
                                onChange={handleInputChange}
                                min="0"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                placeholder="0"
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>
                    
                    {/* Free Minutes For PS */}
                    {formData.freeMinutes > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Pulsuz vaxt hansı PS-ə aiddir?
                            </label>
                            <select
                                name="freeMinutesForPS"
                                value={formData.freeMinutesForPS}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                disabled={isSubmitting}
                            >
                                <option value="">PS seçilməyib (hamısı üçün)</option>
                                <option value="PS3">PS3</option>
                                <option value="PS4">PS4</option>
                                <option value="PS5">PS5</option>
                            </select>
                            <div className="text-xs text-gray-500 mt-1">
                                Əgər fərqli PS-də oynayırlarsa, qiymət fərqi hesablanacaq
                            </div>
                        </div>
                    )}
                    
                    {/* Stock Information */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Stok Miqdarı (ədəd)
                            </label>
                            <input
                                type="number"
                                name="stockQuantity"
                                value={formData.stockQuantity}
                                onChange={handleInputChange}
                                min="0"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                placeholder="Məs: 100"
                                disabled={isSubmitting}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Alınma Qiyməti (₼)
                            </label>
                            <input
                                type="number"
                                name="purchasePrice"
                                value={formData.purchasePrice}
                                onChange={handleInputChange}
                                step="0.01"
                                min="0"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                placeholder="Məs: 200"
                                disabled={isSubmitting}
                            />
                            {formData.stockQuantity && formData.purchasePrice && (
                                <p className="text-xs text-gray-500 mt-1">
                                    1 ədədin qiyməti: {(parseFloat(formData.purchasePrice) / parseInt(formData.stockQuantity)).toFixed(2)}₼
                                </p>
                            )}
                        </div>
                    </div>
                    
                    {/* Set Product */}
                    <div>
                        <label className="flex items-center gap-2 mb-2">
                            <input
                                type="checkbox"
                                checked={formData.isSet}
                                onChange={(e) => setFormData(prev => ({ ...prev, isSet: e.target.checked }))}
                                className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                                disabled={isSubmitting}
                            />
                            <span className="text-sm font-medium text-gray-700">Set məhsul</span>
                        </label>
                        
                        {formData.isSet && (
                            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Set-ə məhsul əlavə et
                                    </label>
                                    <div className="flex gap-2">
                                        <select
                                            value={selectedProductForSet}
                                            onChange={(e) => setSelectedProductForSet(e.target.value)}
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                            disabled={isSubmitting}
                                        >
                                            <option value="">Məhsul seçin</option>
                                            {products.filter(p => p._id !== product?._id && !p.isSet).map(p => (
                                                <option key={p._id} value={p._id}>
                                                    {p.name}
                                                </option>
                                            ))}
                                        </select>
                                        <input
                                            type="number"
                                            min="1"
                                            value={selectedQuantityForSet}
                                            onChange={(e) => setSelectedQuantityForSet(parseInt(e.target.value) || 1)}
                                            className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                            placeholder="Miqdar"
                                            disabled={isSubmitting}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (selectedProductForSet) {
                                                    const product = products.find(p => p._id === selectedProductForSet);
                                                    if (product && !formData.setItems.find(item => item.productId === selectedProductForSet)) {
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            setItems: [...prev.setItems, {
                                                                productId: selectedProductForSet,
                                                                quantity: selectedQuantityForSet
                                                            }]
                                                        }));
                                                        setSelectedProductForSet('');
                                                        setSelectedQuantityForSet(1);
                                                    } else {
                                                        toast.warning('Bu məhsul artıq set-ə əlavə edilib');
                                                    }
                                                }
                                            }}
                                            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                                            disabled={isSubmitting || !selectedProductForSet}
                                        >
                                            Əlavə et
                                        </button>
                                    </div>
                                </div>
                                
                                {formData.setItems.length > 0 && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Set məhsulları:
                                        </label>
                                        <div className="space-y-2">
                                            {formData.setItems.map((item, index) => {
                                                const product = products.find(p => p._id === item.productId);
                                                return (
                                                    <div key={index} className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                                                        <span className="text-sm text-gray-700">
                                                            {product?.name || 'Məhsul tapılmadı'} - {item.quantity} ədəd
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    setItems: prev.setItems.filter((_, i) => i !== index)
                                                                }));
                                                            }}
                                                            className="text-red-500 hover:text-red-700"
                                                            disabled={isSubmitting}
                                                        >
                                                            <i className="bi bi-trash"></i>
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    
                    {/* Rich Text Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Təsvir
                </label>

                        {/* Rich Text Toolbar */}
                        <div className="flex flex-wrap gap-1 mb-2 p-2 bg-gray-50 rounded-lg border">
                            <button
                                type="button"
                                onClick={() => execCommand('bold')}
                                className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100"
                                title="Qalın"
                            >
                                <i className="bi bi-type-bold"></i>
                            </button>
                            <button
                                type="button"
                                onClick={() => execCommand('italic')}
                                className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100"
                                title="İtalik"
                            >
                                <i className="bi bi-type-italic"></i>
                            </button>
                            <button
                                type="button"
                                onClick={() => execCommand('underline')}
                                className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100"
                                title="Alt xətt"
                            >
                                <i className="bi bi-type-underline"></i>
                            </button>
                            <button
                                type="button"
                                onClick={() => execCommand('insertUnorderedList')}
                                className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100"
                                title="Siyahı"
                            >
                                <i className="bi bi-list-ul"></i>
                            </button>
                            <button
                                type="button"
                                onClick={() => execCommand('insertOrderedList')}
                                className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100"
                                title="Nömrəli siyahı"
                            >
                                <i className="bi bi-list-ol"></i>
                            </button>
                            <button
                                type="button"
                                onClick={() => execCommand('foreColor', '#ff6b35')}
                                className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100"
                                title="Narıncı rəng"
                            >
                                <i className="bi bi-palette-fill" style={{color: '#ff6b35'}}></i>
                            </button>
                            <button
                                type="button"
                                onClick={() => execCommand('foreColor', '#3b82f6')}
                                className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100"
                                title="Mavi rəng"
                            >
                                <i className="bi bi-palette-fill" style={{color: '#3b82f6'}}></i>
                            </button>
                            <button
                                type="button"
                                onClick={() => execCommand('foreColor', '#10b981')}
                                className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100"
                                title="Yaşıl rəng"
                            >
                                <i className="bi bi-palette-fill" style={{color: '#10b981'}}></i>
                            </button>
                            <button
                                type="button"
                                onClick={() => execCommand('foreColor', '#000000')}
                                className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100"
                                title="Qara rəng"
                            >
                                <i className="bi bi-palette-fill" style={{color: '#000000'}}></i>
                            </button>
                            <button
                                type="button"
                                onClick={() => execCommand('foreColor', '#6b7280')}
                                className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100"
                                title="Boz rəng"
                            >
                                <i className="bi bi-palette-fill" style={{color: '#6b7280'}}></i>
                            </button>
                            
                            {/* Rəng Seçimi Dropdown */}
                            <div className="relative color-picker">
                                <button
                                    type="button"
                                    className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100 flex items-center gap-1"
                                    title="Rəng seç"
                                    onClick={() => setColorPickerOpen(!colorPickerOpen)}
                                >
                                    <i className="bi bi-palette-fill"></i>
                                    <i className="bi bi-chevron-down text-xs"></i>
                                </button>
                                
                                {colorPickerOpen && (
                                    <div className="absolute top-full left-0 mt-1 p-2 bg-white border border-gray-300 rounded-lg shadow-lg z-10 grid grid-cols-4 gap-1">
                                        {[
                                            '#000000', '#6b7280', '#ef4444', '#f97316',
                                            '#eab308', '#10b981', '#3b82f6', '#8b5cf6',
                                            '#ec4899', '#ffffff', '#f3f4f6', '#d1d5db'
                                        ].map(color => (
                                            <button
                                                key={color}
                                                type="button"
                                                onClick={() => {
                                                    execCommand('foreColor', color);
                                                    setColorPickerOpen(false);
                                                }}
                                                className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                                                style={{ backgroundColor: color }}
                                                title={`Rəng: ${color}`}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* Rich Text Editor */}
                        <div
                            ref={descriptionRef}
                            contentEditable
                            onInput={handleDescriptionChange}
                            className="w-full min-h-[120px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent overflow-y-auto"
                            style={{ outline: 'none' }}
                            disabled={isSubmitting}
                            placeholder="Məhsul təsvirini daxil edin..."
                        />
                    </div>
                    
                    {/* Submit Buttons */}
                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                    <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-6 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200 disabled:opacity-50"
                    >
                        Ləğv et
                    </button>
                            <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors duration-200 disabled:opacity-50 flex items-center"
                        >
                            {isSubmitting ? (
                                <>
                                    <i className="bi bi-hourglass-split animate-spin mr-2"></i>
                                    Yüklənir...
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-check-lg mr-2"></i>
                                    {product ? 'Yenilə' : 'Əlavə Et'}
                                </>
                            )}
                            </button>
                    </div>
                </form>
                </div>
        </div>
    )
}

export default ProductModal