import React, { useContext, useState } from 'react'
import FoodCadr from '../components/FoodCadr'
import { ContextAdmin } from '../context/AdminContext'
const Home = () => {
    const { category } = useContext(ContextAdmin)

    const [filterCategory, setfilterCategory] = useState([])
    const [filterInput, setfilterInput] = useState('')
    const handleChangeFilterInput = (e) => {
        setfilterInput(e.target.value)
    }

    function normalizeString(str) {
        return str
            .replace(/ə/g, 'e')
            .replace(/ı/g, 'i')
            .replace(/ö/g, 'o')
            .replace(/ü/g, 'u')
            .replace(/ğ/g, 'g')
            .replace(/ç/g, 'c')
            .replace(/ş/g, 's');
    }

    const FilterFunc = () => {
        const filterResponse = category.filter((cat) =>
            normalizeString(cat.name.toLowerCase()).includes(normalizeString(filterInput.toLowerCase()))
        )
        setfilterCategory(filterResponse)
        console.log(filterResponse)
    }


    return (
        <div className='pb-[100px]'>
            <div className='px-[20px]'>
                <h1 className='pt-[30px]  text-[32px] text-black font-medium'>Menu</h1>
                <div className="max-w-md mx-auto pt-[10px]">
                    <label
                        htmlFor="default-search"
                        className="mb-2 text-sm font-medium text-gray-900 sr-only dark:text-white"
                    >
                        Search
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                            <svg
                                className="w-4 h-4 text-gray-500 dark:text-gray-400"
                                aria-hidden="true"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 20 20"
                            >
                                <path
                                    stroke="currentColor"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"
                                />
                            </svg>
                        </div>
                        <input
                            value={filterInput}
                            onChange={handleChangeFilterInput}
                            type="search"
                            id="default-search"
                            className="block w-full p-4 ps-10 text-sm text-black border border-none rounded-lg bg-gray-200 placeholder-gray-500 focus:ring-gray-500 focus:border-gray-500"
                            placeholder="Kateqoriyaları axtarın..."
                        />
                        <button
                            onClick={FilterFunc}
                            className="text-white absolute end-2.5 bottom-2 bg-gray-800 hover:bg-gray-700   font-medium rounded-lg text-sm px-4 py-2"
                        >
                            Axtar
                        </button>
                    </div>
                </div>

            </div>

            <div className='container mx-auto'>
                <div className='grid grid-cols-3 gap-4 max-[991px]:grid-cols-2 max-[768px]:grid-cols-1 pt-[30px] max-[768px]:px-[15px]'>
                    {

                        filterCategory.length > 0 ?
                            filterCategory.map((item, index) => (
                                <FoodCadr key={index} item={item} />
                            )) :
                            category && category.map((item, index) => (
                                <FoodCadr key={index} item={item} />
                            ))
                    }
                </div>
            </div>
        </div>
    )
}

export default Home
