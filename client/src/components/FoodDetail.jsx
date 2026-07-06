import React from 'react'

const FoodDetail = ({ item }) => {

    const hasValidImage = item.image && item.image.trim() !== '' && !item.image.includes('placeholder.png') && !item.image.startsWith('data:image/svg+xml') && !item.image.includes('iseu.bsu.by')

    return (
        <div className="group w-full bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-[2px] hover:ring-1 hover:ring-[var(--color-primary)]/20 relative overflow-hidden">
            <div className="absolute bottom-0 left-0 right-0 h-[6px] bg-blue-500"></div>
            <div className="flex items-start gap-4 p-4">
                <div className="w-[110px] h-[110px] md:w-[120px] md:h-[120px] rounded-lg bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {hasValidImage ? (
                        <img
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            src={item.image}
                            alt={item.name}
                            onError={(e) => {
                                e.target.style.display = 'none'
                                e.target.parentElement.classList.add('bg-gray-200')
                            }}
                        />
                    ) : (
                        <i className="bi bi-image text-3xl text-gray-400"></i>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                        <p className="text-[15px] md:text-[16px] font-semibold text-gray-800 break-words text-left">{item.name}</p>
                        <div className="whitespace-nowrap text-right">
                            {item.oldPrice != null && Number(item.oldPrice) > 0 ? (
                                <>
                                    <span className="text-[13px] md:text-[14px] text-black line-through mr-1">{Number(item.oldPrice)} AZN</span>
                                    <span className="text-[14px] md:text-[15px] font-bold text-red-600">{item.price} AZN</span>
                                </>
                            ) : (
                                <span className="text-[14px] md:text-[15px] font-bold text-black">{item.price} AZN</span>
                            )}
                        </div>
                    </div>
                    {item.description && (
                        <div className="text-left break-words text-[13px] md:text-[14px] mt-1 leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: item.description }} />
                    )}
                </div>
            </div>
        </div>

    )
}

export default FoodDetail
