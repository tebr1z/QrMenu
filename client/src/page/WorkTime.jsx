import React, { useContext } from 'react'
import { ContextAdmin } from '../context/AdminContext'

const WorkTime = () => {

    const { contactData } = useContext(ContextAdmin)

    return (
        <div className='container mx-auto pb-[70px]'>
            <div className='pt-[30px] px-[10px]'>
                <div className='bg-[#e1e1e1] p-[15px] rounded'>
                    <p className='text-[#333333] font-medium'>İş saatları</p>
                </div>

                <div className='pt-[20px]'>
                    {contactData &&
                        contactData.day.map((day, index) => (
                            <div key={index} className='bg-[#e1e1e1] p-[9px] mb-[10px] rounded flex justify-between items-center'>
                                <p className='text-[#333333] font-medium'>{day.name}</p>
                                <p>{day.openingTime} - {day.closingTime}</p>
                            </div>
                        ))
                    }
                </div>

            </div>
        </div>
    )
}

export default WorkTime