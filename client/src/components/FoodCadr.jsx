import React from 'react'
import { Link } from 'react-router-dom'
const FoodCadr = ({ item }) => {

    const hasValidImage = item.image && item.image.trim() !== '' && !item.image.includes('placeholder.png') && !item.image.startsWith('data:image/svg+xml') && !item.image.includes('iseu.bsu.by')

    return (
        <Link to={`/Details/${item.name}`} className="w-full rounded-xl overflow-hidden bg-white shadow-lg hover:shadow-2xl transition-shadow relative">
            <div className={`w-full h-[185px] md:h-[185px] ${hasValidImage ? '' : 'bg-gray-200'} flex items-center justify-center`}>
                {hasValidImage ? (
                    <img
                        className="w-full h-full object-cover"
                        src={item.image}
                        alt={item.name}
                        onError={(e) => {
                            e.target.style.display = 'none'
                            e.target.parentElement.classList.add('bg-gray-200')
                        }}
                    />
                ) : (
                    <i className="bi bi-image text-4xl text-gray-400"></i>
                )}
            </div>
            <div className='px-[12px] py-[12px] text-center bg-white'>
                <p className="text-[14px] md:text-[15px] font-semibold text-gray-800 uppercase tracking-wide truncate">{item.name}</p>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-[8px] bg-blue-600 shadow-[0_-2px_8px_rgba(37,99,235,0.6)]"></div>
        </Link>
    )
}

export default FoodCadr