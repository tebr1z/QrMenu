import React from 'react'

const WhatsAppButton = () => {
    return (
        <a
            href="https://wa.me/994552403436"
            target="_blank"
            rel="noopener noreferrer"
            className="fixed z-40 bottom-20 right-5 w-14 h-14 rounded-full bg-[#25D366] shadow-lg flex items-center justify-center text-white hover:shadow-xl hover:scale-105 float-y"
            aria-label="WhatsApp ilə əlaqə"
        >
            <i className="bi bi-whatsapp text-2xl"></i>
        </a>
    )
}

export default WhatsAppButton


