import React, { useContext } from 'react'
import FoodCadr from '../components/FoodCadr'
import { ContextAdmin } from '../context/AdminContext'

const AdminMenu = () => {
    const { categories } = useContext(ContextAdmin)
    return (
        <div className='w-full min-h-[60vh] flex justify-center pb-[100px] pt-[50px]'>
            <div className='w-full px-[30px] max-[768px]:px-[20px]'>
                <div className='grid grid-cols-3 gap-4 max-[1250px]:grid-cols-2 max-[768px]:grid-cols-1 max-[768px]:px-[15px]'>
                    {categories?.length ? categories.map((item) => (
                        <FoodCadr key={item._id || item.name} item={item} />
                    )) : (
                        <p className="col-span-full text-center text-gray-500 py-12">Kateqoriya tapılmadı.</p>
                    )}
                </div>
            </div>
        </div>
    )
}

export default AdminMenu