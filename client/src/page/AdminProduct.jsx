import React, { useContext, useState, useEffect } from 'react'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ContextAdmin } from '../context/AdminContext'
import { ContextUser } from '../context/CheckUserContext'
import AdminProductList from '../components/AdminComponents/AdminProductList'
import ProductModal from '../components/AdminComponents/ProductModal'
import Loading from '../components/Loading'
import { toast } from 'react-toastify'

// Sortable Product Item Component
const SortableProductItem = ({ product, handleModalToggle }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: product._id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <AdminProductList
                handleModalToggle={handleModalToggle}
                product={product}
            />
        </div>
    );
};

const AdminProduct = () => {
    const { products, getProductsFunc, categories, getCategoriesFunc, productLoading, updateProductOrderFunc } = useContext(ContextAdmin)
    const { hasJwtToken } = useContext(ContextUser)
    
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );
    
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedProduct, setSelectedProduct] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('')
    
    // Load data on component mount
    useEffect(() => {
        if (hasJwtToken) {
            loadData()
        }
    }, [hasJwtToken])
    
    const loadData = async () => {
        try {
            await Promise.all([
                getProductsFunc(),
                getCategoriesFunc()
            ])
        } catch (error) {
            console.error('Data loading error:', error)
            toast.error('Məlumatlar yüklənərkən xəta baş verdi')
        }
    }
    
    // Handle modal toggle
    const handleModalToggle = (product = null) => {
        if (!hasJwtToken) {
            toast.error('Səssiyanız bitib. Yenidən daxil olun.')
            return
        }
        
        setSelectedProduct(product)
        setIsModalOpen(true)
    }
    
    const handleModalClose = () => {
        setIsModalOpen(false)
        setSelectedProduct(null)
    }
    
    // Handle drag end for products
    const handleDragEnd = async (event) => {
        const { active, over } = event;
        
        console.log('Product drag end event:', { active, over });

        if (active.id !== over.id) {
            const oldIndex = filteredProducts.findIndex(prod => prod._id === active.id);
            const newIndex = filteredProducts.findIndex(prod => prod._id === over.id);
            
            console.log('Moving product from index', oldIndex, 'to index', newIndex);

            const newProducts = arrayMove(filteredProducts, oldIndex, newIndex);
            console.log('New products order:', newProducts);
            
            // If we have a category filter, use that category ID
            let categoryId = null;
            
            if (selectedCategory) {
                // Use the selected category ID
                categoryId = selectedCategory;
            } else {
                // Get the category ID from the first product (assuming all products are from same category when filtered)
                categoryId = newProducts[0]?.category?._id || newProducts[0]?.category;
            }
            
            if (categoryId) {
                console.log('Updating order for category:', categoryId);
                // Update order in backend
                await updateProductOrderFunc(newProducts, categoryId);
            } else {
                console.log('No category ID found for products');
                toast.error('Kateqoriya ID tapılmadı');
            }
        } else {
            console.log('No change in product position');
        }
    };
    
    // Filter products based on search and category
    const filteredProducts = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            product.description.toLowerCase().includes(searchTerm.toLowerCase())
        
        const matchesCategory = !selectedCategory || 
                               product.category?._id === selectedCategory ||
                               product.category === selectedCategory
        
        return matchesSearch && matchesCategory
    }).sort((a, b) => {
        // Sort by order first, then by creation date
        const orderA = a.order || 0;
        const orderB = b.order || 0;
        
        if (orderA !== orderB) {
            return orderA - orderB;
        }
        
        // If order is the same, sort by creation date (newest first)
        return new Date(b.createdAt) - new Date(a.createdAt);
    })
    
    if (!hasJwtToken) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <i className="bi bi-shield-lock text-6xl text-gray-400 mb-4"></i>
                    <h2 className="text-xl font-semibold text-gray-600">Giriş tələb olunur</h2>
                    <p className="text-gray-500 mt-2">Bu səhifəyə daxil olmaq üçün yenidən giriş edin</p>
                </div>
            </div>
        )
    }
    
    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Məhsulların İdarəsi</h1>
                        <p className="text-gray-600 mt-2">Məhsulları əlavə edin, düzəliş edin və silin</p>
                    </div>
                    <button
                        onClick={() => handleModalToggle()}
                        className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors duration-200 font-medium flex items-center shadow-lg"
                    >
                        <i className="bi bi-plus-lg mr-2"></i>
                        Yeni Məhsul
                    </button>
                </div>
                
                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Search */}
                    <div className="relative">
                        <i className="bi bi-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                        <input
                            type="text"
                            placeholder="Məhsul axtar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                    </div>
                    
                    {/* Category Filter */}
                    <div>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        >
                            <option value="">Bütün Kateqoriyalar</option>
                            {categories.map(category => (
                                <option key={category._id} value={category._id}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    
                    {/* Clear Filters */}
                    <div>
                        <button
                            onClick={() => {
                                setSearchTerm('')
                                setSelectedCategory('')
                            }}
                            className="w-full px-4 py-2 text-gray-600 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                        >
                            <i className="bi bi-x-circle mr-2"></i>
                            Filtrləri Təmizlə
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Content */}
            {productLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loading />
                </div>
            ) : (
                <>
                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                            <div className="flex items-center">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <i className="bi bi-box text-blue-600 text-xl"></i>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-gray-600">Ümumi Məhsul</p>
                                    <p className="text-xl font-bold text-gray-800">{products.length}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                            <div className="flex items-center">
                                <div className="p-2 bg-green-100 rounded-lg">
                                    <i className="bi bi-eye text-green-600 text-xl"></i>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-gray-600">Göstərilən</p>
                                    <p className="text-xl font-bold text-gray-800">{filteredProducts.length}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                            <div className="flex items-center">
                                <div className="p-2 bg-orange-100 rounded-lg">
                                    <i className="bi bi-tags text-orange-600 text-xl"></i>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-gray-600">Kateqoriya</p>
                                    <p className="text-xl font-bold text-gray-800">{categories.length}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                            <div className="flex items-center">
                                <div className="p-2 bg-purple-100 rounded-lg">
                                    <i className="bi bi-currency-dollar text-purple-600 text-xl"></i>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-gray-600">Orta Qiymət</p>
                                    <p className="text-xl font-bold text-gray-800">
                                        {products.length > 0 
                                            ? (products.reduce((sum, p) => sum + (p.price || 0), 0) / products.length).toFixed(2)
                                            : '0.00'
                                        } ₼
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Products Grid */}
                    {filteredProducts.length === 0 ? (
                        <div className="text-center py-12">
                            <i className="bi bi-box text-6xl text-gray-300 mb-4"></i>
                            <h3 className="text-xl font-semibold text-gray-600 mb-2">
                                {searchTerm || selectedCategory ? 'Məhsul tapılmadı' : 'Hələ məhsul yoxdur'}
                            </h3>
                            <p className="text-gray-500 mb-6">
                                {searchTerm || selectedCategory 
                                    ? 'Axtarış kriteriyalarınızı dəyişdirin və ya yeni məhsul əlavə edin'
                                    : 'İlk məhsulunuzu əlavə etmək üçün "Yeni Məhsul" düyməsini basın'
                                }
                            </p>
                            {!searchTerm && !selectedCategory && (
                                <button
                                    onClick={() => handleModalToggle()}
                                    className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors duration-200"
                                >
                                    <i className="bi bi-plus-lg mr-2"></i>
                                    İlk Məhsulu Əlavə Et
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Info message when no category is selected */}
                            {!selectedCategory && (
                                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <div className="flex items-center">
                                        <i className="bi bi-info-circle text-blue-500 mr-2"></i>
                                        <p className="text-blue-700">
                                            Məhsulların sırasını dəyişmək üçün əvvəlcə kateqoriya seçin
                                        </p>
                                    </div>
                                </div>
                            )}
                            
                            {selectedCategory ? (
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={handleDragEnd}
                                >
                                    <SortableContext
                                        items={filteredProducts.map(prod => prod._id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                            {filteredProducts.map(product => (
                                                <SortableProductItem
                                                    key={product._id}
                                                    product={product}
                                                    handleModalToggle={handleModalToggle}
                                                />
                                            ))}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {filteredProducts.map(product => (
                                        <AdminProductList
                                            key={product._id}
                                            product={product}
                                            handleModalToggle={handleModalToggle}
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </>
            )}
            
            {/* Product Modal */}
            <ProductModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                product={selectedProduct}
            />
        </div>
    )
}

export default AdminProduct
