import React, { useContext, useState } from 'react'
import Loading from '../Loading'
import { ContextAdmin } from '../../context/AdminContext'
import { ContextUser } from '../../context/CheckUserContext'
import { toast } from 'react-toastify'

const AdminCategoryList = ({ category, handleModalToggle }) => {
    const { deleteCategoryFunc, categoryLoading, getCategoriesFunc } = useContext(ContextAdmin)
    const { apiClient, hasJwtToken } = useContext(ContextUser)
    const [togglingMenu, setTogglingMenu] = useState(false)
    const isVisibleInMenu = category.showInCustomerMenu !== false

    const handleToggleCustomerMenu = async () => {
        if (!hasJwtToken) {
            toast.error('Səssiyanız bitib. Yenidən daxil olun.')
            return
        }
        setTogglingMenu(true)
        try {
            const response = await apiClient.patch(`/Category/ToggleCustomerMenu/${category._id}`)
            await getCategoriesFunc()
            toast.success(response.data?.message || 'Görünürlük yeniləndi')
        } catch (error) {
            console.error('Toggle category menu visibility error:', error)
            toast.error(error.response?.data?.error || 'Görünürlük dəyişdirilərkən xəta baş verdi')
        } finally {
            setTogglingMenu(false)
        }
    }

    return (
        <div
            key={category._id}
            className="flex items-center max-[768px]:flex-col bg-white shadow-md rounded-lg p-4 hover:shadow-lg transition group"
        >

            <div className="w-20 h-20 flex-shrink-0 rounded-full overflow-hidden border border-gray-300 bg-gray-50 flex items-center justify-center">
                {category.image && 
                 category.image.trim() !== '' && 
                 !category.image.includes('placeholder.png') && 
                 !category.image.startsWith('data:image/svg+xml') &&
                 !category.image.includes('iseu.bsu.by') ? (
                    <img
                        src={category.image}
                        alt={category.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            console.log('Image load error for:', category.name, 'URL:', category.image);
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                        }}
                    />
                ) : null}
                <div className={`flex items-center justify-center text-gray-400 ${(category.image && 
                 category.image.trim() !== '' && 
                 !category.image.includes('placeholder.png') && 
                 !category.image.startsWith('data:image/svg+xml') &&
                 !category.image.includes('iseu.bsu.by')) ? 'hidden' : 'flex'}`}>
                    <i className="bi bi-image text-xl"></i>
                </div>
            </div>

            <div className="flex-1 ml-4 max-[768px]:py-[20px]">
                <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-semibold text-gray-800">
                        {category.name}
                    </h2>
                    {!isVisibleInMenu && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-700">
                            <i className="bi bi-eye-slash mr-1"></i>
                            Menyuda gizli
                        </span>
                    )}
                </div>
            </div>

            <div className="flex space-x-2">
                <button
                    type="button"
                    onClick={handleToggleCustomerMenu}
                    disabled={togglingMenu}
                    title={isVisibleInMenu ? 'Müştəri menyusundan gizlət' : 'Müştəri menyusunda göstər'}
                    className={`px-3 py-2 rounded transition-colors duration-200 disabled:opacity-50 ${
                        isVisibleInMenu
                            ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            : 'bg-violet-100 text-violet-700 hover:bg-violet-200'
                    }`}
                >
                    {togglingMenu ? (
                        <i className="bi bi-hourglass-split animate-spin"></i>
                    ) : (
                        <i className={`bi ${isVisibleInMenu ? 'bi-eye' : 'bi-eye-slash'}`}></i>
                    )}
                </button>
                <button
                    onClick={() => {
                        console.log('Düzəliş et button clicked for category:', category);
                        handleModalToggle(category);
                    }}
                    className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
                >
                    Düzəliş et
                </button>
                <button
                    onClick={() => deleteCategoryFunc(category._id)}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                    Sil
                </button>
            </div>

            {
                categoryLoading &&
                <Loading />
            }

        </div>

    )
}

export default AdminCategoryList
