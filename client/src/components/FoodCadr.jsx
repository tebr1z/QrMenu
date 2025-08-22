import React from 'react'
import { Link } from 'react-router-dom'
const FoodCadr = ({ item }) => {

    return (
        <Link to={`/Details/${item.name}`}
            className={`h-[200px] w-full relative bg-no-repeat bg-cover bg-center rounded ${(!item.image || item.image.trim() === '' || item.image.includes('placeholder.png') || item.image.startsWith('data:image/svg+xml') || item.image.includes('iseu.bsu.by')) ? 'bg-gray-200' : ''}`}
            style={{ backgroundImage: (item.image && item.image.trim() !== '' && !item.image.includes('placeholder.png') && !item.image.startsWith('data:image/svg+xml') && !item.image.includes('iseu.bsu.by')) ? `url(${item.image})` : 'none' }}
        >
            <div className="absolute inset-0 bg-black bg-opacity-20 rounded"></div>

            <div className='w-full absolute z-10 h-full flex flex-col justify-end items-center text-center text-white pb-[10px]'>
                {(!item.image || item.image.trim() === '' || item.image.includes('placeholder.png') || item.image.startsWith('data:image/svg+xml') || item.image.includes('iseu.bsu.by')) && (
                    <div className="flex-1 flex items-center justify-center">
                        <i className="bi bi-image text-4xl text-gray-400"></i>
                    </div>
                )}
                <p className="text-white text-[18px] font-medium text-lg">{item.name}</p>
            </div>
        </Link >
    )
}

export default FoodCadr