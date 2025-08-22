import React from 'react'

const FoodDetail = ({ item }) => {
    // Function to clean HTML for display
    const cleanHtmlForDisplay = (content) => {
        if (!content) return '';
        
        // If content contains HTML tags, clean them but preserve basic formatting
        if (content.includes('<') || content.includes('>')) {
            // Create a temporary div to parse HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = content;
            
            // Remove complex styles but keep basic formatting
            const elements = tempDiv.querySelectorAll('*');
            elements.forEach(element => {
                if (element.style) {
                    // Keep only basic styles
                    const color = element.style.color;
                    const fontWeight = element.style.fontWeight;
                    const fontStyle = element.style.fontStyle;
                    
                    element.removeAttribute('style');
                    
                    if (color) element.style.color = color;
                    if (fontWeight) element.style.fontWeight = fontWeight;
                    if (fontStyle) element.style.fontStyle = fontStyle;
                }
            });
            
            return tempDiv.innerHTML;
        }
        
        // If it's plain text, return as is
        return content;
    };

    const formattedDescription = cleanHtmlForDisplay(item.description);

    return (
        <div className="w-full flex justify-between items-center space-x-1 p-[15px] bg-gray-100 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="flex flex-col justify-between h-full  w-[100%]">
                <div className="mb-2">
                    <p className="text-lg font-semibold text-gray-800">{item.name}</p>
                </div>
                {formattedDescription && (
                    <div className="mb-3">
                        <div className="text-[14px] text-gray-600 leading-relaxed whitespace-pre-line" dangerouslySetInnerHTML={{ __html: formattedDescription }} />
                    </div>
                )}
                <div className="mb-3">
                    <p className="text-lg font-bold text-orange-600">{item.price}₼</p>
                </div>
            </div>
            <div className="w-[150px] h-[85px] flex-shrink-0">
                <img style={{
                    mixBlendMode: 'darken',
                }} className="w-full h-full object-contain rounded-md" src={`${item.image}`} alt="Toyuq Şorbası" />
            </div>
        </div>

    )
}

export default FoodDetail
