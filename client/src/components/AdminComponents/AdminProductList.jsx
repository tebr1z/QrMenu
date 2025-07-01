import React, { useContext } from 'react'
import { ContextAdmin } from '../../context/AdminContext'
import Loading from '../Loading'

const AdminProductList = ({ product, handleModalToggle }) => {
    const { deleteProductFunc, productLoading } = useContext(ContextAdmin)
    return (
        <div
            key={product.id}
            className="flex flex-col bg-white shadow-md rounded-lg p-4 hover:shadow-lg transition"
        >
            {/* Resim */}
            <div className="w-full h-40 rounded-lg overflow-hidden border border-gray-300">
                <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-contain"
                />
            </div>
            {/* İçerik */}
            <div className="mt-4 flex-1">
                <h2 className="text-lg font-semibold text-gray-800">
                    {product.name}
                </h2>
                <p className="text-sm text-gray-500">{product.description}</p>
                <p className="text-lg font-bold text-gray-700 mt-2">
                    {product.price.toFixed(2)} ₼
                </p>
            </div>
            {/* Butonlar */}
            <div className="flex mt-4 space-x-2">
                <button
                    onClick={() => handleModalToggle(product)}
                    className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
                >
                    Düzəliş et
                </button>
                <button
                    onClick={() => deleteProductFunc(product._id)}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                    Sil
                </button>
            </div>
            {
                productLoading &&
                <Loading />
            }
        </div>
    )
}

export default AdminProductList