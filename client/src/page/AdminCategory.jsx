import React, { useContext, useState } from 'react'
import AdminCategoryList from '../components/AdminComponents/AdminCategoryList'
import CategoryModal from '../components/AdminComponents/CategoryModal';
import { ContextAdmin } from '../context/AdminContext';

const AdminCategory = () => {
    const { category } = useContext(ContextAdmin)
    const [isOpen, setIsOpen] = useState(false);
    const [editCategory, setEditCategory] = useState(null);
    const [FilterCategory, setFilterCategory] = useState([])

    const handleModalToggle = (categoryToogle) => {
        setIsOpen(!isOpen);
        setEditCategory(categoryToogle)
    };

    const [sectionInput, setsectionInput] = useState('')
    const handleChangeSectionInput = (e) => {
        setsectionInput(e.target.value)
        const filterRespons = category.filter((category, index) => {
            return (
                category.name === e.target.value
            )
        })
        setFilterCategory(filterRespons)
    }

    return (
        <div className='w-full h-[100vh] flex justify-center pb-[100px] pt-[50px]'>
            <div className="p-4 bg-gray-100 w-full ">
                <div className='flex justify-between items-center max-[768px]:flex-col max-[768px]:items-start'>
                    <p className="text-2xl font-bold text-gray-800 mb-6">Kateqoriya Siyahısı</p>
                    <div className="mb-6">
                        <select
                            value={sectionInput}
                            onChange={handleChangeSectionInput}
                            id="filter"
                            className="block w-full px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        >
                            <option value="">Bütün Kateqoryalar</option>
                            {
                                category && category.map((category, index) => (
                                    <option key={index} value={category.name}>{category.name}</option>
                                ))
                            }
                        </select>
                    </div>
                    <button
                        onClick={() => handleModalToggle(null)}
                        className="mb-6 px-6 py-3 text-[14px] bg-orange-500 text-white font-semibold rounded-lg shadow-md hover:bg-orange-600 transition duration-300">
                        Kateqoriya Əlavə Et
                        <i className="fa-solid fa-plus pl-[10px]"></i>
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 overflow-y-auto min-h-[35%] max-h-[100%]   pb-[70px]">
                    {

                        FilterCategory.length > 0 ?
                            FilterCategory.map((category, index) => (
                                <AdminCategoryList
                                    handleModalToggle={handleModalToggle}
                                    key={index}
                                    category={category}
                                    setIsOpen={setIsOpen}
                                />
                            )) :
                            category &&
                            category.map((category, index) => (
                                <AdminCategoryList
                                    handleModalToggle={handleModalToggle}
                                    key={index}
                                    category={category}
                                    setIsOpen={setIsOpen}
                                />
                            ))
                    }
                </div>
            </div>
            <CategoryModal
                editCategory={editCategory}
                handleModalToggle={handleModalToggle}
                isOpen={isOpen}
                setIsOpen={setIsOpen}
            />
        </div>
    )
}

export default AdminCategory