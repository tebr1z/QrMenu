import React, { useContext, useState, useEffect, useRef } from 'react'
import { ContextAdmin } from '../../context/AdminContext'
import { ContextUser } from '../../context/CheckUserContext'
import { toast } from 'react-toastify'

const ProductModal = ({ isOpen, onClose, product }) => {
    const { addProductFunc, updateProductFunc, categories, productLoading } = useContext(ContextAdmin)
    const { hasJwtToken } = useContext(ContextUser)
    
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        freeMinutes: '',
        category: '',
        image: null
    })
    
    const [imagePreview, setImagePreview] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const descriptionRef = useRef(null)
    
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
                    category: product.category?._id || product.category || '',
                    image: null
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
                    category: '',
                    image: null
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
            submitData.append('category', formData.category)
            
            if (formData.image) {
                submitData.append('image', formData.image)
            }
            
            if (product) {
                // Update existing product
                await updateProductFunc(product._id, submitData)
                toast.success('Məhsul uğurla yeniləndi')
        } else {
                // Add new product
                await addProductFunc(submitData)
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