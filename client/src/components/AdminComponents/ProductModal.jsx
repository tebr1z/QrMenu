import React, { useContext, useState, useEffect, useRef, useMemo } from 'react'
import { ContextAdmin } from '../../context/AdminContext'
import { ContextUser } from '../../context/CheckUserContext'
import { toast } from 'react-toastify'
import { UNIT_LABELS, calcSetItemDeduction, formatWarehouseStock, simulateAfterDeduct, getPackSizeGrams } from '../../utils/stockUnits'

const ProductModal = ({ isOpen, onClose, product }) => {
    const { addProductFunc, updateProductFunc, getProductsFunc, categories, products, productLoading } = useContext(ContextAdmin)
    const { hasJwtToken, apiClient } = useContext(ContextUser)
    const [savingSetItems, setSavingSetItems] = useState(false)
    
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        oldPrice: '',
        freeMinutes: '',
        freeMinutesForPS: '',
        category: '',
        image: null,
        stockQuantity: '',
        stockUnit: 'piece',
        portionSize: '',
        portionUnit: 'g',
        lowStockThreshold: '5',
        purchasePrice: '',
        showInCustomerMenu: true,
        isSet: false,
        setItems: [],
        ingredients: []
    })
    
    const [setSection, setSetSection] = useState('qr')
    const [selectedLinkedProductForSet, setSelectedLinkedProductForSet] = useState('')
    const [selectedIngredientProduct, setSelectedIngredientProduct] = useState('')
    const [selectedIngredientAmount, setSelectedIngredientAmount] = useState(1)
    const [selectedIngredientUnit, setSelectedIngredientUnit] = useState('piece')
    
    const [imagePreview, setImagePreview] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [colorPickerOpen, setColorPickerOpen] = useState(false)
    const descriptionRef = useRef(null)
    const [selectedProductForSet, setSelectedProductForSet] = useState('')
    const [selectedQuantityForSet, setSelectedQuantityForSet] = useState(1)
    const [setDeductAmount, setSetDeductAmount] = useState('100')
    const [setDeductUnit, setSetDeductUnit] = useState('g')

    const linkedProductForSetPreview = useMemo(() => {
        if (!selectedLinkedProductForSet) return null;
        return products.find((p) => String(p._id) === String(selectedLinkedProductForSet)) || null;
    }, [selectedLinkedProductForSet, products]);

    const qrSetItems = useMemo(
        () => formData.setItems.filter((i) => (i.section || 'qr') === 'qr'),
        [formData.setItems]
    );

    const qrItemsPendingAnbar = useMemo(() => {
        const configured = new Set(
            formData.setItems
                .filter((i) => i.section === 'internal')
                .map((i) => String(i.linkedProductId || i.productId))
        );
        return qrSetItems.filter((q) => !configured.has(String(q.productId)));
    }, [formData.setItems, qrSetItems]);

    const previewSetDeduction = useMemo(() => {
        if (setSection !== 'internal' || !linkedProductForSetPreview) return null;
        const draftItem = {
            deductAmount: parseFloat(setDeductAmount) || 0,
            deductUnit: setDeductUnit,
        };
        return calcSetItemDeduction(draftItem, linkedProductForSetPreview);
    }, [setSection, linkedProductForSetPreview, setDeductAmount, setDeductUnit]);

    const previewAfterSale = useMemo(() => {
        if (!previewSetDeduction || !linkedProductForSetPreview) return null;
        if (previewSetDeduction.amount <= 0) return null;
        return simulateAfterDeduct(
            linkedProductForSetPreview,
            previewSetDeduction.amount,
            previewSetDeduction.unit
        );
    }, [previewSetDeduction, linkedProductForSetPreview]);

    const normalizeSetItemsForSubmit = (items) => (items || []).map((item) => {
        const productId = item.productId?._id || item.productId;
        const linkedProductId = item.linkedProductId?._id || item.linkedProductId;
        const section = item.section === 'internal' ? 'internal' : 'qr';
        const base = {
            productId: String(productId),
            quantity: Math.max(1, Number(item.quantity) || 1),
            section,
        };
        if (section === 'internal') {
            return {
                ...base,
                linkedProductId: String(linkedProductId || productId),
                deductAmount: Number(item.deductAmount) || 0,
                deductUnit: item.deductUnit || 'g',
            };
        }
        return base;
    }).filter((i) => i.productId);

    const persistSetItems = async (nextSetItems, isSet = true) => {
        if (!product?._id) return false;
        try {
            setSavingSetItems(true);
            await apiClient.put(`/Product/UpdateSetItems/${product._id}`, {
                isSet,
                setItems: normalizeSetItemsForSubmit(nextSetItems),
            });
            await getProductsFunc();
            return true;
        } catch (err) {
            console.error('Set saxlanmadı:', err);
            toast.error(err.response?.data?.error || 'Set saxlanmadı');
            return false;
        } finally {
            setSavingSetItems(false);
        }
    };
    
    // Reset form when modal opens/closes or product changes
    useEffect(() => {
        if (isOpen) {
            if (product) {
                // Edit mode
                setFormData({
                    name: product.name || '',
                    description: product.description || '',
                    price: product.price || '',
                    oldPrice: product.oldPrice ?? '',
                    freeMinutes: product.freeMinutes || '',
                    freeMinutesForPS: product.freeMinutesForPS || '',
                    category: product.category?._id || product.category || '',
                    image: null,
                    stockQuantity: product.stockQuantity ?? '',
                    stockUnit: product.stockUnit || 'piece',
                    portionSize: product.portionSize || '',
                    portionUnit: product.portionUnit || 'g',
                    lowStockThreshold: product.lowStockThreshold ?? 5,
                    purchasePrice: product.purchasePrice || '',
                    showInCustomerMenu: product.showInCustomerMenu !== false,
                    isSet: product.isSet || false,
                    setItems: (product.setItems || []).map((item) => ({
                        ...item,
                        productId: item.productId?._id || item.productId,
                        linkedProductId: item.linkedProductId?._id || item.linkedProductId,
                        section: item.section || 'qr',
                    })),
                    ingredients: product.ingredients || []
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
                    oldPrice: '',
                    freeMinutes: '',
                    freeMinutesForPS: '',
                    category: '',
                    image: null,
                    stockQuantity: '',
                    stockUnit: 'piece',
                    portionSize: '',
                    portionUnit: 'g',
                    lowStockThreshold: '5',
                    purchasePrice: '',
                    showInCustomerMenu: true,
                    isSet: false,
                    setItems: [],
                    ingredients: []
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
        
        const priceNum = (formData.price === '' || formData.price === null)
            ? (formData.showInCustomerMenu ? NaN : 0)
            : parseFloat(formData.price)
        if (Number.isNaN(priceNum)) {
            toast.error('Düzgün qiymət daxil edin')
            return
        }
        if (priceNum < 0) {
            toast.error('Qiymət mənfi ola bilməz')
            return
        }
        if (formData.showInCustomerMenu && priceNum <= 0) {
            toast.error('Menyuda görünən məhsulun qiyməti 0 ola bilməz')
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
            submitData.append('price', priceNum)
            submitData.append('oldPrice', formData.oldPrice !== '' ? parseFloat(formData.oldPrice) : 0)
            submitData.append('freeMinutes', parseInt(formData.freeMinutes) || 0)
            submitData.append('freeMinutesForPS', formData.freeMinutesForPS || '')
            submitData.append('category', formData.category)
            submitData.append('stockQuantity', parseFloat(formData.stockQuantity) || 0)
            submitData.append('stockUnit', formData.stockUnit || 'piece')
            submitData.append('portionSize', parseFloat(formData.portionSize) || 0)
            submitData.append('portionUnit', formData.portionUnit || 'g')
            submitData.append('lowStockThreshold', parseFloat(formData.lowStockThreshold) || 5)
            submitData.append('purchasePrice', parseFloat(formData.purchasePrice) || 0)
            submitData.append('showInCustomerMenu', formData.showInCustomerMenu ? 'true' : 'false')
            submitData.append('isSet', formData.isSet ? 'true' : 'false')
            submitData.append('setItems', JSON.stringify(normalizeSetItemsForSubmit(formData.setItems)))
            submitData.append('ingredients', JSON.stringify(formData.ingredients))
            
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
                await updateProductFunc(product._id, submitData)
            } else {
                await addProductFunc(submitData)
            }
            await getProductsFunc()
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
                    
                    {/* Qiymət, Köhnə qiymət (indirimli), Pulsuz dəqiqə */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Qiymət (yeni / indirimli, ₼) {formData.showInCustomerMenu ? '*' : ''}
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
                                required={formData.showInCustomerMenu}
                            />
                            {!formData.showInCustomerMenu && (
                                <p className="text-xs text-gray-500 mt-1">Menyuda gizli məhsul üçün 0.00 ola bilər</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Köhnə qiymət (indirimli göstərmək üçün, ₼)
                            </label>
                            <input
                                type="number"
                                name="oldPrice"
                                value={formData.oldPrice}
                                onChange={handleInputChange}
                                step="0.01"
                                min="0"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                placeholder="Boş saxla"
                                disabled={isSubmitting}
                            />
                            <p className="text-xs text-gray-500 mt-1">Doldursanız: köhnə qiymət üstü xətt qara, yeni qiymət qırmızı.</p>
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
                    
                    {/* Ingredients (tost → kolbasa, ketçup və s.) */}
                    {!formData.isSet && (
                        <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                            <h3 className="font-semibold text-gray-800 mb-2">İçindəki məhsullar (resept)</h3>
                            <p className="text-xs text-gray-600 mb-3">Satış olanda bu məhsullar avtomatik anbardan çıxılır (məs: tost → kolbasa, ketçup, çörək)</p>
                            <div className="flex flex-wrap gap-2 mb-3">
                                <select
                                    value={selectedIngredientProduct}
                                    onChange={(e) => setSelectedIngredientProduct(e.target.value)}
                                    className="flex-1 min-w-[140px] px-3 py-2 border rounded-lg"
                                    disabled={isSubmitting}
                                >
                                    <option value="">Məhsul seçin</option>
                                    {products.filter(p => p._id !== product?._id && !p.isSet).map(p => (
                                        <option key={p._id} value={p._id}>{p.name}</option>
                                    ))}
                                </select>
                                <input type="number" min="0.001" step="0.001" value={selectedIngredientAmount}
                                    onChange={(e) => setSelectedIngredientAmount(parseFloat(e.target.value) || 1)}
                                    className="w-20 px-2 py-2 border rounded-lg" />
                                <select value={selectedIngredientUnit} onChange={(e) => setSelectedIngredientUnit(e.target.value)}
                                    className="px-2 py-2 border rounded-lg">
                                    <option value="piece">ədəd</option>
                                    <option value="kg">kq</option>
                                    <option value="g">qr</option>
                                </select>
                                <button type="button" className="px-3 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold"
                                    onClick={() => {
                                        if (!selectedIngredientProduct) return;
                                        if (formData.ingredients.find(i => i.productId === selectedIngredientProduct)) {
                                            toast.error('Bu məhsul artıq əlavə edilib');
                                            return;
                                        }
                                        setFormData(prev => ({
                                            ...prev,
                                            ingredients: [...prev.ingredients, {
                                                productId: selectedIngredientProduct,
                                                amount: selectedIngredientAmount,
                                                unit: selectedIngredientUnit,
                                            }],
                                        }));
                                    }}>Əlavə et</button>
                            </div>
                            {formData.ingredients.length > 0 && (
                                <ul className="space-y-1">
                                    {formData.ingredients.map((ing, idx) => {
                                        const p = products.find(x => x._id === ing.productId);
                                        return (
                                            <li key={idx} className="flex justify-between text-sm bg-white p-2 rounded border">
                                                <span>{p?.name || '—'} — {ing.amount} {UNIT_LABELS[ing.unit]}</span>
                                                <button type="button" className="text-red-500" onClick={() => setFormData(prev => ({
                                                    ...prev, ingredients: prev.ingredients.filter((_, i) => i !== idx)
                                                }))}><i className="bi bi-trash" /></button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    )}
                    
                    {/* Müştəri menyusu görünürlüyü */}
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.showInCustomerMenu}
                                onChange={(e) => setFormData(prev => ({ ...prev, showInCustomerMenu: e.target.checked }))}
                                className="w-4 h-4 mt-0.5 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                                disabled={isSubmitting}
                            />
                            <div>
                                <span className="text-sm font-medium text-gray-800">Müştəri menyusunda göstər</span>
                                <p className="text-xs text-gray-500 mt-1">
                                    Söndürsəniz məhsul QR menyuda görünməz, amma kassa, stok və setlərdə işləməyə davam edir.
                                </p>
                            </div>
                        </label>
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
                            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setSetSection('qr')}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${setSection === 'qr' ? 'bg-orange-500 text-white' : 'bg-white border'}`}>
                                        1-ci hissə (QR)
                                    </button>
                                    <button type="button" onClick={() => setSetSection('internal')}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${setSection === 'internal' ? 'bg-blue-600 text-white' : 'bg-white border'}`}>
                                        Anbar hissəsi
                                    </button>
                                </div>
                                <p className="text-xs text-gray-600">
                                    {setSection === 'qr'
                                        ? 'Əvvəl menyuda görünəcək məhsulları əlavə edin.'
                                        : '1-ci hissədə əlavə etdiyiniz məhsul üçün qr/kq miqdarı yazın — yenidən məhsul seçməyə ehtiyac yoxdur.'}
                                </p>

                                {setSection === 'qr' && (
                                    <div className="flex flex-wrap gap-2 items-end">
                                        <select
                                            value={selectedProductForSet}
                                            onChange={(e) => setSelectedProductForSet(e.target.value)}
                                            className="flex-1 min-w-[140px] px-3 py-2 border rounded-lg text-sm"
                                            disabled={isSubmitting}
                                        >
                                            <option value="">Menyuda görünən ad</option>
                                            {products.filter(p => p._id !== product?._id && !p.isSet).map(p => (
                                                <option key={p._id} value={p._id}>{p.name}</option>
                                            ))}
                                        </select>
                                        <input
                                            type="number"
                                            min="1"
                                            value={selectedQuantityForSet}
                                            onChange={(e) => setSelectedQuantityForSet(parseInt(e.target.value, 10) || 1)}
                                            className="w-16 px-2 py-2 border rounded-lg text-sm"
                                            title="Say (göstərim)"
                                        />
                                        <button
                                            type="button"
                                            className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                                            disabled={isSubmitting || !selectedProductForSet}
                                            onClick={async () => {
                                                if (!selectedProductForSet) return;
                                                const newItem = {
                                                    productId: selectedProductForSet,
                                                    quantity: selectedQuantityForSet,
                                                    section: 'qr',
                                                };
                                                const nextItems = [...formData.setItems, newItem];
                                                setFormData(prev => ({
                                                    ...prev,
                                                    isSet: true,
                                                    setItems: nextItems,
                                                }));
                                                setSelectedProductForSet('');
                                                setSelectedQuantityForSet(1);
                                                if (product?._id) {
                                                    const ok = await persistSetItems(nextItems, true);
                                                    if (ok) toast.success('QR hissə saxlanıldı');
                                                } else {
                                                    toast.info('Məhsulu ilk dəfə «Yenilə/Əlavə et» ilə saxlayın');
                                                }
                                            }}
                                        >
                                            Əlavə et
                                        </button>
                                    </div>
                                )}

                                {setSection === 'internal' && (
                                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg space-y-3">
                                        <div className="text-sm font-semibold text-blue-900">Anbar — 1 set satışında çıxacaq</div>
                                        {qrSetItems.length === 0 ? (
                                            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                                                Əvvəl <strong>1-ci hissə (QR)</strong> tabında məhsul əlavə edin.
                                            </p>
                                        ) : (
                                            <>
                                                <div className="flex flex-wrap gap-2 items-end">
                                                    <div className="flex-1 min-w-[140px]">
                                                        <label className="text-[10px] text-gray-600 block mb-1">1-ci hissədən məhsul</label>
                                                        <select
                                                            value={selectedLinkedProductForSet}
                                                            onChange={(e) => {
                                                                const id = e.target.value;
                                                                setSelectedLinkedProductForSet(id);
                                                                const lp = products.find((p) => String(p._id) === String(id));
                                                                if (lp?.stockUnit === 'kg') setSetDeductUnit('kg');
                                                                else setSetDeductUnit('g');
                                                            }}
                                                            className="w-full px-3 py-2 border rounded-lg text-sm"
                                                            disabled={isSubmitting}
                                                        >
                                                            <option value="">QR-də əlavə etdiyiniz məhsul</option>
                                                            {qrItemsPendingAnbar.map((item) => {
                                                                const p = products.find(x => String(x._id) === String(item.productId));
                                                                return (
                                                                    <option key={item.productId} value={item.productId}>
                                                                        {p?.name || item.productId}
                                                                    </option>
                                                                );
                                                            })}
                                                        </select>
                                                        {qrItemsPendingAnbar.length === 0 && qrSetItems.length > 0 && (
                                                            <p className="text-[10px] text-emerald-700 mt-1">Bütün QR məhsulları üçün anbar qaydası var</p>
                                                        )}
                                                    </div>
                                                    <div className="w-24">
                                                        <label className="text-[10px] text-gray-600 block mb-1">1 setdə çıxan</label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.001"
                                                            value={setDeductAmount}
                                                            onChange={(e) => setSetDeductAmount(e.target.value)}
                                                            className="w-full px-2 py-2 border rounded-lg text-sm"
                                                            placeholder="100"
                                                        />
                                                    </div>
                                                    <div className="w-20">
                                                        <label className="text-[10px] text-gray-600 block mb-1">Vahid</label>
                                                        <select
                                                            value={setDeductUnit}
                                                            onChange={(e) => setSetDeductUnit(e.target.value)}
                                                            className="w-full px-2 py-2 border rounded-lg text-sm"
                                                        >
                                                            <option value="g">qr</option>
                                                            <option value="kg">kq</option>
                                                        </select>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                                                        disabled={
                                                            isSubmitting
                                                            || !selectedLinkedProductForSet
                                                            || !(parseFloat(setDeductAmount) > 0)
                                                        }
                                                        onClick={async () => {
                                                            if (!selectedLinkedProductForSet || !(parseFloat(setDeductAmount) > 0)) {
                                                                toast.error('Məhsul və miqdar daxil edin');
                                                                return;
                                                            }
                                                            const newItem = {
                                                                productId: selectedLinkedProductForSet,
                                                                linkedProductId: selectedLinkedProductForSet,
                                                                quantity: 1,
                                                                section: 'internal',
                                                                deductAmount: parseFloat(setDeductAmount),
                                                                deductUnit: setDeductUnit,
                                                            };
                                                            const nextItems = [...formData.setItems, newItem];
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                isSet: true,
                                                                setItems: nextItems,
                                                            }));
                                                            setSelectedLinkedProductForSet('');
                                                            setSetDeductAmount('100');
                                                            setSetDeductUnit('g');
                                                            if (product?._id) {
                                                                const ok = await persistSetItems(nextItems, true);
                                                                if (ok) toast.success('Anbar qaydası saxlanıldı');
                                                            } else {
                                                                toast.info('Məhsulu ilk dəfə «Yenilə/Əlavə et» ilə saxlayın');
                                                            }
                                                        }}
                                                    >
                                                        Əlavə et
                                                    </button>
                                                </div>
                                                {linkedProductForSetPreview && (
                                                    <div className="text-xs space-y-1 border-t border-blue-100 pt-2">
                                                        <div className="text-gray-600">
                                                            Anbar: <strong>{formatWarehouseStock(linkedProductForSetPreview).text}</strong>
                                                            {getPackSizeGrams(linkedProductForSetPreview) > 0 && (
                                                                <span className="text-gray-500">
                                                                    {' '}(1 paket = {linkedProductForSetPreview.portionSize} qr)
                                                                </span>
                                                            )}
                                                        </div>
                                                        {previewSetDeduction?.amount > 0 && (
                                                            <div className="text-emerald-800 font-semibold">
                                                                1 set satışı = {previewSetDeduction.label}
                                                            </div>
                                                        )}
                                                        {previewAfterSale && (
                                                            <div className="text-blue-800">
                                                                Satışdan sonra: {previewAfterSale.text}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}

                                {formData.setItems.length > 0 && (
                                    <div className="space-y-2 border-t pt-3">
                                        <div className="text-xs font-semibold text-gray-600 flex items-center gap-2">
                                            Set tərkibi
                                            {savingSetItems && <span className="text-orange-500">Saxlanır...</span>}
                                            {product?._id && !savingSetItems && (
                                                <span className="text-emerald-600">✓ backend</span>
                                            )}
                                        </div>
                                        {formData.setItems.map((item, index) => {
                                            const p = products.find(x => String(x._id) === String(item.productId));
                                            const linked = products.find(x => String(x._id) === String(item.linkedProductId || item.productId));
                                            const isQr = (item.section || 'qr') === 'qr';
                                            const deduct = !isQr ? calcSetItemDeduction(item, linked) : null;
                                            const anbarForQr = isQr
                                                ? formData.setItems.find(
                                                    (i) => i.section === 'internal'
                                                        && String(i.linkedProductId || i.productId) === String(item.productId)
                                                )
                                                : null;
                                            const anbarDeduct = anbarForQr ? calcSetItemDeduction(anbarForQr, linked || p) : null;
                                            return (
                                                <div key={index} className={`flex items-center justify-between p-2 rounded border text-sm ${isQr ? 'bg-orange-50' : 'bg-blue-50'}`}>
                                                    <span>
                                                        [{isQr ? 'QR' : 'Anbar'}] {p?.name || linked?.name || '—'}
                                                        {isQr
                                                            ? ` · ${item.quantity || 1} ədəd`
                                                            : ` · ${deduct?.label || `${item.deductAmount} ${UNIT_LABELS[item.deductUnit || 'g']}/set`}`}
                                                        {isQr && !anbarForQr && (
                                                            <span className="text-amber-600 text-xs ml-1">· anbar qaydası yoxdur</span>
                                                        )}
                                                        {isQr && anbarDeduct && (
                                                            <span className="text-blue-700 text-xs ml-1">· anbar: {anbarDeduct.label}</span>
                                                        )}
                                                        {!isQr && linked && (
                                                            <span className="text-gray-500 text-xs ml-1">
                                                                · stok: {formatWarehouseStock(linked).text}
                                                            </span>
                                                        )}
                                                    </span>
                                                    <button type="button" onClick={async () => {
                                                        const removed = formData.setItems[index];
                                                        const removedId = String(removed?.productId || '');
                                                        const nextItems = formData.setItems.filter((_, i) => i !== index).filter((item) => {
                                                            if (item.section !== 'internal') return true;
                                                            return String(item.linkedProductId || item.productId) !== removedId;
                                                        });
                                                        setFormData(prev => ({ ...prev, setItems: nextItems }));
                                                        if (product?._id) {
                                                            await persistSetItems(nextItems, formData.isSet);
                                                        }
                                                    }} className="text-red-500"><i className="bi bi-trash" /></button>
                                                </div>
                                            );
                                        })}
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