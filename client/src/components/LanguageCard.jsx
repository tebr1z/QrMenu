import React from 'react'

const LanguageCard = () => {
    return (
        <div className='bg-[#e1e1e1] rounded p-[10px] flex flex-col items-center justify-center'>
            <div className="w-[50px] h-[50px] rounded-full overflow-hidden">
                <img
                    className="w-full h-full object-cover"
                    src="https://menu.myqrcodemenu.com/files/flags/az.svg"
                    alt="Azerbaijan Flag"
                />
            </div>

            <div className='pt-[10px]'>
                <p className='font-medium text-black'>Azerbaijan</p>
            </div>
        </div>
    )
}

export default LanguageCard