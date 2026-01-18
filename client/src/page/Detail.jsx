import React, { useContext, useEffect, useState } from 'react'
import FoodDetail from '../components/FoodDetail'
import { useParams } from 'react-router-dom';
import { ContextAdmin } from '../context/AdminContext';
import Loading from '../components/Loading';

const Detail = () => {
    const { getProductByCategoryFunc, getProductByCategory, getProductByCategoryLoading, setGetProductByCategoryLoadingFunc, changeHeaderImgFunc, categories } = useContext(ContextAdmin)
    const { name } = useParams()

    useEffect(() => {
        const loadProductData = async () => {
            try {
                await getProductByCategoryFunc(name);
            } catch (error) {
                // Error loading product data - handled silently
            }
        };
        
        loadProductData();
        
        return () => {
            setGetProductByCategoryLoadingFunc(true)
            changeHeaderImgFunc('', '')
        }
    }, [name])

    useEffect(() => {
        if (categories && categories.length > 0) {
            const updateHeader = () => {
                const headerData = categories.find((cat) => cat.name === name);
                if (headerData) {
                    changeHeaderImgFunc(headerData.image, headerData.name);
                } else {
                    changeHeaderImgFunc('', '');
                }
            };
            updateHeader();
        }
        return () => {
            changeHeaderImgFunc('', '');
        };
    }, [categories, name]);

    const [filterProduct, setfilterProduct] = useState([])
    const [filterInput, setfilterInput] = useState('')
    const handleChangeFilterInput = (e) => {
        setfilterInput(e.target.value)
    }
    // Smart normalization - handles Azerbaijani characters
    function normalizeString(str) {
        return str
            .toLowerCase()
            .replace(/ə/g, 'e')
            .replace(/ı/g, 'i')
            .replace(/ö/g, 'o')
            .replace(/ü/g, 'u')
            .replace(/ğ/g, 'g')
            .replace(/ç/g, 'c')
            .replace(/ş/g, 's')
            .replace(/[^a-z0-9]/g, '') // Remove special characters
            .trim();
    }

    // Smart fuzzy matching - lightweight and fast
    function fuzzyMatch(searchTerm, productName) {
        const normalizedSearch = normalizeString(searchTerm);
        const normalizedProduct = normalizeString(productName);
        
        // Exact match after normalization
        if (normalizedProduct.includes(normalizedSearch)) {
            return true;
        }
        
        // If search is too short, only exact match
        if (normalizedSearch.length < 2) {
            return false;
        }
        
        // Character-based fuzzy matching (lightweight)
        let searchIndex = 0;
        let productIndex = 0;
        let matchCount = 0;
        
        // Check if characters appear in order (allowing some gaps)
        while (productIndex < normalizedProduct.length && searchIndex < normalizedSearch.length) {
            if (normalizedProduct[productIndex] === normalizedSearch[searchIndex]) {
                matchCount++;
                searchIndex++;
            }
            productIndex++;
        }
        
        // If most characters match (at least 70% of search term)
        const matchRatio = matchCount / normalizedSearch.length;
        if (matchRatio >= 0.7) {
            return true;
        }
        
        // Check for common character substitutions (lightweight - only first 3 chars)
        // This handles: cola → kola, q → k, etc.
        const substitutions = {
            'k': ['q', 'c'], // kola matches "cola" or "qola"
            'q': ['k'],      // qola matches "kola"
            'c': ['k'],      // cola matches "kola" (but not ç)
            'g': ['ğ'],
            's': ['ş'],
            'o': ['ö'],
            'u': ['ü'],
            'i': ['ı', 'e'],
            'e': ['ə', 'i']
        };
        
        // Try with character substitutions (only first 3 chars to keep it fast)
        const maxSubstitutions = Math.min(3, normalizedSearch.length);
        for (let i = 0; i < maxSubstitutions; i++) {
            const char = normalizedSearch[i];
            const alternatives = substitutions[char] || [];
            
            for (const alt of alternatives) {
                const modifiedSearch = normalizedSearch.substring(0, i) + alt + normalizedSearch.substring(i + 1);
                if (normalizedProduct.includes(modifiedSearch)) {
                    return true;
                }
            }
        }
        
        return false;
    }

    // Real-time filter with smart fuzzy matching (client-side only, no server load)
    useEffect(() => {
        if (filterInput.trim() === '') {
            setfilterProduct([])
        } else {
            // All processing happens on client-side - no server requests
            const filterResponse = getProductByCategory.filter((pro) => 
                fuzzyMatch(filterInput.trim(), pro.name)
            );
            setfilterProduct(filterResponse)
        }
    }, [filterInput, getProductByCategory])

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
                            htmlFor="product-search"
                            className="mb-2 text-sm font-medium text-gray-900 sr-only dark:text-white"
                        >
                            Məhsul axtarışı
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
                                id="product-search"
                                className="block w-full p-4 ps-10 text-sm text-black border border-none rounded-lg bg-gray-200 placeholder-gray-500 focus:ring-gray-500 focus:border-gray-500"
                                placeholder="Bu kateqoriyadakı məhsulları axtarın..."
                                aria-label="Məhsul axtarışı"
                                autoComplete="off"
                            />
                        </div>
                    </div>

                </div>

                {
                    getProductByCategory.length > 0 ? (
                        filterProduct.length > 0 || filterInput.trim() === '' ? (
                            <div className='container mx-auto'>
                                <div className='grid grid-cols-3 gap-4 max-[991px]:grid-cols-2 max-[768px]:grid-cols-1 pt-[30px] '>
                                    {
                                        filterProduct.length > 0 ? filterProduct.map((item) => (
                                            <FoodDetail key={item._id || item.id || item.name} item={item} />
                                        )) :
                                            getProductByCategory.map((item) => (
                                                <FoodDetail key={item._id || item.id || item.name} item={item} />
                                            ))
                                    }
                                </div>
                            </div>
                        ) : (
                            <div className='flex justify-center items-center h-[30vh]'>
                                <p className="text-center text-xl text-gray-700 font-semibold">Axtarışa uyğun məhsul tapılmadı</p>
                            </div>
                        )
                    ) : (
                        <div className='flex justify-center items-center h-[30vh]'>
                            <p className="text-center text-xl text-gray-700 font-semibold">Məhsul tapılmadı</p>
                        </div>
                    )
                }


            </div>
        )
    }

}

export default Detail