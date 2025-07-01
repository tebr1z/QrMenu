import React from 'react'
import { Link } from 'react-router-dom'
const FoodCadr = ({ item }) => {

    return (
        <Link to={`/Details/${item.name}`}
            className={`h-[200px] w-full relative bg-no-repeat bg-cover bg-center rounded`}
            style={{ backgroundImage: `url(${item.image})` }}
        >
            <div className="absolute inset-0 bg-black bg-opacity-20 rounded"></div>

            <div className='w-full absolute z-10 h-full flex flex-col justify-end items-center text-center text-white  pb-[10px]'>
                <p className="text-white text-[18px] font-medium text-lg">{item.name}</p>
            </div>
        </Link >
    )
}

export default FoodCadr