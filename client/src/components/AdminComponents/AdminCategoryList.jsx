import React, { useContext } from 'react'
import Loading from '../Loading'
import { ContextAdmin } from '../../context/AdminContext'

const AdminCategoryList = ({ category, handleModalToggle }) => {
    const { deleteCategoryFunc, categoryLoading } = useContext(ContextAdmin)
    return (
        <div
            key={category._id}
            className="flex items-center max-[768px]:flex-col bg-white shadow-md rounded-lg p-4 hover:shadow-lg transition cursor-move group"
        >
            {/* Drag Handle */}
            <div className="mr-3 text-gray-400 hover:text-gray-600 cursor-move p-1 rounded hover:bg-gray-100 transition-colors">
                <i className="bi bi-grip-vertical text-xl group-hover:text-orange-500"></i>
            </div>

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
                <h2 className="text-lg font-semibold text-gray-800">
                    {category.name}
                </h2>
            </div>

            <div className="flex space-x-2">
                <button
                    onClick={() => handleModalToggle(category)}
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
