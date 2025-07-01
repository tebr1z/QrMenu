import React from 'react'

const Loading = () => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="absolute inset-0 bg-opacity-60 backdrop-blur-sm"></div>
            <div className="relative flex justify-center items-center">
                <div className="w-16 h-16 border-4 border-t-4 border-orange-500 border-solid rounded-full animate-ping"></div>
            </div>
        </div>
    )
}

export default Loading
