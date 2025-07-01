import React, { useContext } from 'react'
import FoodCadr from '../components/FoodCadr'
import { ContextAdmin } from '../context/AdminContext'

const AdminMenu = () => {
    const { category } = useContext(ContextAdmin)
    return (
        <div className='w-full h-[100vh] flex justify-center pb-[100px] pt-[50px]'>
            <div className='w-full px-[30px] max-[768px]:px-[20px]'>
                <div className='grid  grid-cols-3 gap-4 max-[1250px]:grid-cols-2 max-[768px]:grid-cols-1  max-[768px]:px-[15px] h-full overflow-y-auto'>
                    {
                        category && category.map((item, index) => (
                            <FoodCadr key={index} item={item} />
                        ))
                    }
                </div>
            </div>
        </div>
    )
}

export default AdminMenu