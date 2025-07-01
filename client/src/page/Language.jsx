import React from 'react'
import LanguageCard from '../components/LanguageCard'

const Language = () => {
    return (
        <div className='mx-auto container pb-[100px]'>
            <div className='grid grid-cols-4 gap-4 max-[991px]:grid-cols-3 max-[768px]:grid-cols-2 pt-[30px] max-[768px]:px-[15px]'>
                <LanguageCard />
                <LanguageCard />
                <LanguageCard />
            </div>
        </div>
    )
}

export default Language