import React, { useContext, useState } from 'react'
import { ContextAdmin } from '../../context/AdminContext'
import { ContextUser } from '../../context/CheckUserContext'
import Loading from '../Loading'
import { toast } from 'react-toastify'

const AdminProductList = ({ product, handleModalToggle }) => {
    const { deleteProductFunc, productLoading } = useContext(ContextAdmin)
    const { apiClient, hasJwtToken } = useContext(ContextUser)
    const [isDeleting, setIsDeleting] = useState(false)
    
    // Function to clean HTML for display
    const cleanHtmlForDisplay = (content) => {
        if (!content) return '';
        
        // If content contains HTML tags, clean them but preserve basic formatting
        if (content.includes('<') || content.includes('>')) {
            // Create a temporary div to parse HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = content;
            
            // Remove complex styles but keep basic formatting
            const elements = tempDiv.querySelectorAll('*');
            elements.forEach(element => {
                if (element.style) {
                    // Keep only basic styles
                    const color = element.style.color;
                    const fontWeight = element.style.fontWeight;
                    const fontStyle = element.style.fontStyle;
                    
                    element.removeAttribute('style');
                    
                    if (color) element.style.color = color;
                    if (fontWeight) element.style.fontWeight = fontWeight;
                    if (fontStyle) element.style.fontStyle = fontStyle;
                }
            });
            
            return tempDiv.innerHTML;
        }
        
        // If it's plain text, return as is
        return content;
    };

    // Safe delete function with token check
    const handleDelete = async () => {
        if (!hasJwtToken) {
            toast.error('Səssiyanız bitib. Yenidən daxil olun.');
            return;
        }

        if (!window.confirm('Bu məhsulu silmək istədiyinizə əminsiniz?')) {
            return;
        }

        setIsDeleting(true);
        try {
            await deleteProductFunc(product._id);
            toast.success('Məhsul uğurla silindi');
        } catch (error) {
            console.error('Delete error:', error);
            toast.error('Məhsul silinərkən xəta baş verdi');
        } finally {
            setIsDeleting(false);
        }
    };

    // Safe edit function with token check
    const handleEdit = () => {
        if (!hasJwtToken) {
            toast.error('Səssiyanız bitib. Yenidən daxil olun.');
            return;
        }
        handleModalToggle(product);
    };

    const descriptionElement = cleanHtmlForDisplay(product.description);

    return (
        <div
            key={product._id}
            className="flex flex-col bg-white shadow-lg rounded-xl p-6 hover:shadow-xl transition-all duration-300 border border-gray-100 relative group"
        >
            {/* Drag Handle */}
            <div className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 cursor-move p-1 rounded hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100">
                <i className="bi bi-grip-vertical text-lg"></i>
            </div>
            {/* Image */}
            <div className="w-full h-48 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgNzBDMTE2LjU2OSA3MCAxMzAgODMuNDMxIDMwIDEwMEMxMzAgMTE2LjU2OSAxMTYuNTY5IDEzMCAxMDAgMTMwQzgzLjQzMSAxMzAgNzAgMTE2LjU2OSA3MCAxMEM3MCA4My40MzEgODMuNDMxIDcwIDEwMCA3MFoiIGZpbGw9IiNEMzE3RjYiLz4KPHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIwIDIwQzIyLjA5MDkgMjAgMjQgMTguMDkwOSAyNCAxNkMyNCAxMy45MDkxIDIyLjA5MDkgMTIgMjAgMTJDMTcuOTA5MSAxMiAxNiAxMy45MDkxIDE2IDE2QzE2IDE4LjA5MDkgMTcuOTA5MSAyMCAyMCAyMFoiIGZpbGw9IiNGRkZGRkYiLz4KPC9zdmc+Cg==';
                    }}
                />
            </div>
            
            {/* Content */}
            <div className="mt-4 flex-1">
                <h2 className="text-xl font-bold text-gray-800 mb-2 line-clamp-2">
                    {product.name}
                </h2>
                
                {/* Rich Text Description */}
                {descriptionElement && (
                    <div className="mb-3" dangerouslySetInnerHTML={{ __html: descriptionElement }} />
                )}
                
                {/* Price and Free Minutes */}
                <div className="mb-3">
                    <div className="flex items-center justify-between">
                        <p className="text-xl font-bold text-orange-600">
                            {product.price ? product.price.toFixed(2) : '0.00'} ₼
                        </p>
                        {product.freeMinutes > 0 && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                <i className="bi bi-clock mr-1"></i>
                                {product.freeMinutes} dəq
                            </span>
                        )}
                    </div>
                </div>
                
                {/* Category */}
                {product.category && (
                    <p className="text-xs text-gray-500 mt-2">
                        Kateqoriya: {product.category.name || product.category}
                    </p>
                )}
            </div>
            
            {/* Buttons */}
            <div className="flex mt-4 space-x-2">
                <button
                    onClick={handleEdit}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <i className="bi bi-pencil-square mr-1"></i>
                    Düzəliş et
                </button>
                <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isDeleting ? (
                        <i className="bi bi-hourglass-split animate-spin"></i>
                    ) : (
                        <i className="bi bi-trash"></i>
                    )}
                </button>
            </div>
            
            {productLoading && <Loading />}
        </div>
    )
}

export default AdminProductList