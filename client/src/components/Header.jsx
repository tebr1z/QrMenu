import React, { useContext } from 'react'
import { ContextAdmin } from '../context/AdminContext'

const Header = () => {
    const adminContext = useContext(ContextAdmin)
    const headerImg = adminContext?.headerImg
    const headerName = adminContext?.headerName
    
    return (
        <div className="relative w-full h-64 bg-gray-300">
            <img
                src={`${headerImg ? headerImg : "https://api.hel.fi/linkedevents/media/images/35227983_451457415298989_3511539843593142272_o.jpg"}`}
                alt={headerName ? `${headerName} - Prime Zone banner` : "Prime Zone restoran banner"}
                className="w-full h-full object-cover"
                loading="eager"
            />

            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/60"></div>

            <div className="absolute inset-0 flex flex-col justify-center items-center text-center text-white z-10">
                <h1 className="text-4xl font-bold tracking-wide">Prime Zone</h1>
                <p className="mt-2 text-lg">{headerName ? headerName : 'Menu ilə tanış ol'}</p>
            </div>
        </div>

    )
}

export default Header
