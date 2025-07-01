import React, { useContext } from 'react'
import { ContextAdmin } from '../context/AdminContext'

const Header = () => {
    const { headerImg, headerName } = useContext(ContextAdmin)
    return (
        <div className="relative w-full h-64 bg-gray-300">
            <img
                src={`${headerImg ? headerImg : "https://api.hel.fi/linkedevents/media/images/35227983_451457415298989_3511539843593142272_o.jpg"}`}
                alt="Banner"
                className="w-full h-full object-cover"
            />

            <div className="absolute inset-0 bg-black opacity-50"></div>

            <div className="absolute inset-0 flex flex-col justify-center items-center text-center text-white z-10">
                <h1 className="text-4xl font-bold">Menu Qr Code</h1>
                <p className="mt-2 text-lg">{headerName ? headerName : 'Menu ilə tanış ol'}</p>
            </div>
        </div>

    )
}

export default Header
