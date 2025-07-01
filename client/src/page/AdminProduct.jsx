import React, { useContext, useEffect, useState } from 'react'
import AdminProductList from '../components/AdminComponents/AdminProductList'
import ProductModal from '../components/AdminComponents/ProductModal';
import { ContextAdmin } from '../context/AdminContext';



const AdminProduct = () => {
    const { category, product } = useContext(ContextAdmin)
    const [isOpen, setIsOpen] = useState(false);
    const [editProduct, seteditProduct] = useState(null);
    const [filterProduct, setfilterProduct] = useState([])

    const handleModalToggle = (product) => {
        setIsOpen(!isOpen);
        seteditProduct(product);
    };

    const [sectionInput, setsectionInput] = useState('')
    const handleChangeSectionInput = (e) => {
        setsectionInput(e.target.value)
        const filterRespons = product.filter((product, index) => {
            return (
                product.category.name === e.target.value
            )
        })
        setfilterProduct(filterRespons)
        console.log(filterRespons)
    }




    return (
        <div className='w-full h-[100vh] flex justify-center pb-[100px] pt-[50px]'>
            <div className="p-4 bg-gray-100 w-full ">
                <div className='flex justify-between items-center max-[768px]:flex-col max-[768px]:items-start'>
                    <p className="text-2xl font-bold text-gray-800 mb-6">Məhsul Siyahısı</p>
                    <div className="mb-6">
                        <select
                            value={sectionInput}
                            onChange={handleChangeSectionInput}
                            id="filter"
                            className="block w-full px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        >
                            <option value="" >Hamısı</option>
                            {
                                category &&
                                category.map((item, index) => (
                                    <option key={index} value={item.name}>{item.name}</option>
                                ))
                            }
                        </select>
                    </div>
                    <button
                        onClick={() => handleModalToggle(null)}
                        className="mb-6 px-6 py-3 text-[14px] bg-orange-500 text-white font-semibold rounded-lg shadow-md hover:bg-orange-600 transition duration-300">
                        Məhsul Əlavə Et
                        <i className="fa-solid fa-plus pl-[10px]"></i>
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto min-h-[80%] max-h-[100%]  pb-[70px]">

                    {
                        filterProduct.length > 0 ?
                            filterProduct.map((product, index) => (
                                <AdminProductList
                                    handleModalToggle={handleModalToggle}
                                    key={index}
                                    product={product}
                                />
                            )) : product &&
                            product.map((product, index) => (
                                <AdminProductList
                                    handleModalToggle={handleModalToggle}
                                    key={index}
                                    product={product}
                                />
                            ))
                    }
                </div>
            </div>
            <ProductModal
                editProduct={editProduct}
                handleModalToggle={handleModalToggle}
                isOpen={isOpen}
                setIsOpen={setIsOpen}
            />
        </div>
    )
}

export default AdminProduct
