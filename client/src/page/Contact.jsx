import React, { useContext } from 'react'
import { ContextAdmin } from '../context/AdminContext'

const Contact = () => {
    const { contactData } = useContext(ContextAdmin)
    
    return (
        <div className='min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-[100px]'>
            <div className='container mx-auto px-4 py-8 max-w-4xl'>
                {/* Header */}
                <div className='text-center mb-8'>
                    <div className='inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full shadow-lg mb-4'>
                        <i className='bi bi-telephone text-white text-2xl'></i>
                    </div>
                    <h1 className='text-3xl font-bold text-gray-800 mb-2'>Əlaqə</h1>
                    <p className='text-gray-600'>Bizimlə əlaqə saxlamaq üçün məlumatlar</p>
                </div>

                <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mb-6'>
                    {/* Wi-Fi Card */}
                    <div className='bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 hover:shadow-2xl transition-all duration-300'>
                        <div className='bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4'>
                            <div className='flex items-center gap-3'>
                                <i className='bi bi-wifi text-white text-xl'></i>
                                <h2 className='text-white font-bold text-lg'>Wi-Fi Məlumat</h2>
                            </div>
                        </div>
                        <div className='p-6 space-y-4'>
                            <div className='flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors'>
                                <div className='w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0'>
                                    <i className='bi bi-wifi text-blue-600 text-xl'></i>
                                </div>
                                <div className='flex-1'>
                                    <p className='text-gray-500 text-sm mb-1'>Wi-Fi Adı</p>
                                    <p className='text-gray-800 font-semibold'>{contactData ? contactData.wifiName : 'Wifi Adı'}</p>
                                </div>
                            </div>
                            <div className='flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors'>
                                <div className='w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0'>
                                    <i className='bi bi-key text-blue-600 text-xl'></i>
                                </div>
                                <div className='flex-1'>
                                    <p className='text-gray-500 text-sm mb-1'>Wi-Fi Şifrə</p>
                                    <p className='text-gray-800 font-semibold'>2025 2025</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact Info Card */}
                    <div className='bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 hover:shadow-2xl transition-all duration-300'>
                        <div className='bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4'>
                            <div className='flex items-center gap-3'>
                                <i className='bi bi-info-circle text-white text-xl'></i>
                                <h2 className='text-white font-bold text-lg'>Əlaqə Məlumatı</h2>
                            </div>
                        </div>
                        <div className='p-6 space-y-4'>
                            <div className='flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors'>
                                <div className='w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0'>
                                    <i className='bi bi-geo-alt text-orange-600 text-xl'></i>
                                </div>
                                <div className='flex-1'>
                                    <p className='text-gray-500 text-sm mb-1'>Ünvan</p>
                                    <p className='text-gray-800 font-semibold text-sm leading-relaxed'>Bakixanov qəsəbəsi məhəllə 4094/94 Waze/Bolt/Uber PrimeZone</p>
                                </div>
                            </div>
                            <div className='flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors'>
                                <div className='w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0'>
                                    <i className='bi bi-telephone-fill text-orange-600 text-xl'></i>
                                </div>
                                <div className='flex-1'>
                                    <p className='text-gray-500 text-sm mb-1'>Telefon</p>
                                    <a 
                                        href={`tel:${contactData && contactData.phone ? contactData.phone : '+994552403436'}`} 
                                        className='text-orange-600 font-semibold hover:text-orange-700 transition-colors'
                                    >
                                        {contactData && contactData.phone ? contactData.phone : '+994 55 240 34 36'}
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Map */}
                <div className='bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100'>
                    <div className='bg-gradient-to-r from-green-500 to-green-600 px-6 py-4'>
                        <div className='flex items-center gap-3'>
                            <i className='bi bi-map text-white text-xl'></i>
                            <h2 className='text-white font-bold text-lg'>Xəritə</h2>
                        </div>
                    </div>
                    <div className='p-0'>
                        <iframe
                            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d451.5345479957471!2d49.97224597803632!3d40.41881287389975!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x403063545bf5aa25%3A0xd8c4c4e1898fcf46!2sPrime%20Zone%20Playstation%20beIN%20sports!5e0!3m2!1sen!2saz!4v1762173877922!5m2!1sen!2saz"
                            width="100%"
                            height={400}
                            style={{ border: 0 }}
                            allowFullScreen=""
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            className='w-full'
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Contact