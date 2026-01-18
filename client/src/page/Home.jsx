import React, { useContext, useState, useEffect } from 'react'
import FoodCadr from '../components/FoodCadr'
import { ContextAdmin } from '../context/AdminContext'
import Loading from '../components/Loading'

const Home = () => {
    const { categories, products } = useContext(ContextAdmin)

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

    // Real-time filter - update on input change
    useEffect(() => {
        if (filterInput.trim() === '') {
            setfilterCategory([])
        } else {
            const filterResponse = categories.filter((cat) =>
                normalizeString(cat.name.toLowerCase()).includes(normalizeString(filterInput.toLowerCase()))
            )
            setfilterCategory(filterResponse)
        }
    }, [filterInput, categories])

    // Show loading if categories or products are not loaded yet
    if (categories.length === 0 || !products) {
        return <Loading />
    }

    return (
        <div className='pb-[100px]'>
            <div className='px-[20px]'>
                {/* heading removed as requested */}
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
                            aria-label="Kateqoriyaları axtarın"
                            autoComplete="off"
                        />
                    </div>
                </div>

            </div>

            <div className='container mx-auto'>
                <div className='grid grid-cols-2 gap-x-4 gap-y-8 pt-[24px] px-[8px] md:px-[12px] max-[768px]:px-[6px]'>
                    {
                        filterCategory.length > 0 ?
                            filterCategory.map((item) => (
                                <FoodCadr key={item._id || item.id || item.name} item={item} />
                            )) :
                            categories && categories.map((item) => (
                                <FoodCadr key={item._id || item.id || item.name} item={item} />
                            ))
                    }
                </div>
            </div>
        </div>
    )
}

export default Home
