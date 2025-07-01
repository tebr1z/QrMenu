import React from 'react'

const FoodDetail = ({ item }) => {
    return (
        <div className="w-full flex justify-between items-center space-x-1 p-[15px] bg-gray-100 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="flex flex-col justify-between h-full  w-[100%]">
                <div className="mb-2">
                    <p className="text-lg font-semibold text-gray-800">{item.name}</p>
                </div>
                <div className="mb-2">
                    <p className="text-[14px] text-gray-600">
                        {item.description}
                    </p>
                </div>
                <div>
                    <p className="text-lg font-bold text-orange-600">{item.price}₼</p>
                </div>
            </div>
            <div className="w-[150px] h-[85px] flex-shrink-0">
                <img style={{
                    mixBlendMode: 'darken',
                }} className="w-full h-full object-contain rounded-md" src={`${item.image}`} alt="Toyuq Şorbası" />
            </div>
        </div>

    )
}

export default FoodDetail
