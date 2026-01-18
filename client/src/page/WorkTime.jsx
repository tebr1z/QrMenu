import React from 'react'

const WorkTime = () => {
    return (
        <div className='min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-[100px]'>
            <div className='container mx-auto px-4 py-8 max-w-2xl'>
                {/* Header */}
                <div className='text-center mb-8'>
                    <div className='inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full shadow-lg mb-4'>
                        <i className='bi bi-clock text-white text-2xl'></i>
                    </div>
                    <h1 className='text-3xl font-bold text-gray-800 mb-2'>İş Saatları</h1>
                    <p className='text-gray-600'>Bizimlə əlaqə saxlamaq üçün iş saatlarımızı yoxlayın</p>
                </div>

                {/* Work Time Card */}
                <div className='bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 hover:shadow-2xl transition-all duration-300'>
                    <div className='bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4'>
                        <div className='flex items-center gap-3'>
                            <i className='bi bi-calendar-check text-white text-xl'></i>
                            <h2 className='text-white font-bold text-lg'>İş Saatımız</h2>
                        </div>
                    </div>
                    
                    <div className='p-6'>
                        <div className='flex items-center justify-between py-4 border-b border-gray-100 last:border-b-0'>
                            <div className='flex items-center gap-3'>
                                <div className='w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center'>
                                    <i className='bi bi-clock-history text-orange-600 text-xl'></i>
                                </div>
                                <div>
                                    <p className='text-gray-500 text-sm'>Açılış</p>
                                    <p className='text-gray-800 font-semibold text-lg'>12:00</p>
                                </div>
                            </div>
                            
                            <div className='flex-1 mx-4'>
                                <div className='h-px bg-gradient-to-r from-gray-200 via-orange-300 to-gray-200'></div>
                            </div>
                            
                            <div className='flex items-center gap-3'>
                                <div className='w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center'>
                                    <i className='bi bi-moon-stars text-orange-600 text-xl'></i>
                                </div>
                                <div className='text-right'>
                                    <p className='text-gray-500 text-sm'>Bağlanış</p>
                                    <p className='text-gray-800 font-semibold text-lg'>02:00</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className='mt-6 pt-6 border-t border-gray-100'>
                            <div className='flex items-center gap-2 text-sm text-gray-600 bg-blue-50 px-4 py-3 rounded-lg'>
                                <i className='bi bi-info-circle text-blue-500'></i>
                                <span>Hər gün eyni saatlarda açıq</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default WorkTime