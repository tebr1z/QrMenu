import React, { useContext, useEffect, useState } from 'react'
import FoodDetail from '../components/FoodDetail'
import { useParams } from 'react-router-dom';
import { ContextAdmin } from '../context/AdminContext';
import Loading from '../components/Loading';
const Detail = () => {

    const { getProductByCategoryFunc, getProductByCategory, getProductByCategoryLoading, setGetProductByCategoryLoading, changeHeaderImgFunc, category } = useContext(ContextAdmin)
    const { name } = useParams()

    useEffect(() => {
        getProductByCategoryFunc(name)
        
        return () => {
            setGetProductByCategoryLoading(true)
            changeHeaderImgFunc('', '')
        }

    }, [name])

    useEffect(() => {
        const headerData = category.find((cat) => cat.name === name);
        if (headerData) {
            changeHeaderImgFunc(headerData.image, headerData.name);
        } else {
            changeHeaderImgFunc('', '');
        }
        return () => {
            changeHeaderImgFunc('', '');
        };
    }, [category, name]);


    const [filterProduct, setfilterProduct] = useState([])
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
        const filterResponse = getProductByCategory.filter((pro) =>
            normalizeString(pro.name.toLowerCase()).includes(normalizeString(filterInput.toLowerCase()))
        )
        setfilterProduct(filterResponse)
        console.log(filterResponse)
    }


    if (getProductByCategoryLoading) {
        return <Loading />
    } else {
        return (
            <div className='pb-[100px]'>
                <div className='px-[20px]'>
                    <p className='pt-[30px]  text-[28px] text-black font-medium'>
                        {name}
                    </p>
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
                                placeholder="Bu kateqoriyadakı məhsulları axtarın..."
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

                {
                    getProductByCategory.length > 0 ? <div className='container mx-auto'>
                        <div className='grid grid-cols-3 gap-4 max-[991px]:grid-cols-2 max-[768px]:grid-cols-1 pt-[30px] '>
                            {

                                filterProduct.length > 0 ? filterProduct.map((item, index) => (
                                    <FoodDetail key={index} item={item} />
                                )) :
                                    getProductByCategory.map((item, index) => (
                                        <FoodDetail key={index} item={item} />
                                    ))
                            }
                        </div>
                    </div> : <div className='flex justify-center items-center h-[30vh]'>
                        <p className="text-center text-xl text-gray-700 font-semibold">Məhsul tapılmadı</p>
                    </div>

                }


            </div>
        )
    }

}

export default Detail