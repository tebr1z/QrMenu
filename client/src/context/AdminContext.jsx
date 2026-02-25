import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react'
export const ContextAdmin = createContext()
import { toast } from 'react-toastify'
import axios from "axios";

const AdminContext = ({ children }) => {
    // Create separate apiClient for AdminContext
    const apiUrl = import.meta.env.VITE_API || '/api';
    const apiClient = useMemo(() => {
        const client = axios.create({
            baseURL: apiUrl,
            withCredentials: true,
            timeout: 10000,
        });

        // Add request interceptor for AdminContext
        client.interceptors.request.use(
            (config) => {
                const getCookie = (name) => {
                    const value = `; ${document.cookie}`;
                    const parts = value.split(`; ${name}=`);
                    if (parts.length === 2) return parts.pop().split(';').shift();
                    return null;
                };
                
                const token = getCookie('jwtToken');
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                
                // If FormData is being sent, don't set Content-Type header
                // Let the browser set it automatically with boundary
                if (config.data instanceof FormData) {
                    delete config.headers['Content-Type'];
                }
                
                return config;
            },
            (error) => Promise.reject(error)
        );

        return client;
    }, [apiUrl]);

    // start Category
    const [categoryLoading, setCategoryLoading] = useState(false)

    const [categories, setCategories] = useState([])
    const getCategoriesFunc = useCallback(async () => {
        try {
            const response = await apiClient.get('/Category/GetCategory')
            setCategories(response.data)
        } catch (error) {
            console.log('Get categories error:', error)
            toast.error('Kateqoriyalar yüklənərkən xəta baş verdi')
        }
    }, [apiClient])

    const [newCategory, setNewCategory] = useState()
    const addCategoryFunc = useCallback(async (category) => {
        setCategoryLoading(true)
        try {
            console.log('Adding category with data:', category);
            const data = new FormData()
            data.append('name', category.name)
            data.append('imageCategory', category.imageFile)
            
            console.log('FormData entries:');
            for (let [key, value] of data.entries()) {
                console.log(`${key}:`, value);
            }

            const response = await apiClient.post('/Category/AddCategory', data)
            console.log('Server response:', response.data);
            setNewCategory(response.data)
            toast.success(response.data.message)
            setCategoryLoading(false)
        } catch (error) {
            console.log('Add category error:', error)
            toast.error(error.response?.data?.error || 'Kateqoriya əlavə edilərkən xəta baş verdi')
            setCategoryLoading(false)
        }
    }, [apiClient])

    const [updateCategory, setUpdateCategory] = useState()
    const updateCategoryFunc = useCallback(async (id, category) => {
        setCategoryLoading(true)
        try {
            console.log('Updating category with ID:', id);
            console.log('Category data:', category);
            const data = new FormData()
            data.append('name', category.name)
            data.append('imageCategory', category.imageFile)
            
            console.log('FormData entries:');
            for (let [key, value] of data.entries()) {
                console.log(`${key}:`, value);
            }
            
            const response = await apiClient.put(`/Category/UpdateCategory/${id}`, data)
            console.log('Server response:', response.data);
            setUpdateCategory(response.data.category)
            toast.success(response.data.message)
            setCategoryLoading(false)
        } catch (error) {
            console.log('Update category error:', error)
            toast.error(error.response?.data?.error || 'Kateqoriya yenilənərkən xəta baş verdi')
            setCategoryLoading(false)
        }
    }, [apiClient])

    const [deleteCategory, setDeleteCategory] = useState()
    const deleteCategoryFunc = useCallback(async (id) => {
        setCategoryLoading(true)
        try {
            const response = await apiClient.delete(`/Category/DeleteCategory/${id}`)
            setDeleteCategory(response.data)
            toast.success(response.data.message)
            setCategoryLoading(false)
        } catch (error) {
            console.log('Delete category error:', error)
            toast.error(error.response?.data?.error || 'Kateqoriya silinərkən xəta baş verdi')
            setCategoryLoading(false)
        }
    }, [apiClient])

    const updateCategoryOrderFunc = useCallback(async (categories) => {
        setCategoryLoading(true)
        try {
            console.log('Sending categories for order update:', categories);
            const response = await apiClient.put('/Category/UpdateCategoryOrder', { categories })
            console.log('Update category order response:', response.data);
            toast.success(response.data.message)
            // Refresh categories from backend to get updated order
            await getCategoriesFunc()
            setCategoryLoading(false)
        } catch (error) {
            console.log('Update category order error:', error)
            console.log('Error response:', error.response?.data)
            console.log('Error status:', error.response?.status)
            toast.error(error.response?.data?.error || 'Kateqoriya sırası yenilənərkən xəta baş verdi')
            setCategoryLoading(false)
        }
    }, [apiClient, getCategoriesFunc])

    // start Product
    const [productLoading, setProductLoading] = useState(false)

    const [products, setProducts] = useState([])
    const getProductsFunc = useCallback(async () => {
        try {
            const response = await apiClient.get('/Product/GetProduct')
            // Sort products by order and creation date
            const sortedProducts = response.data.sort((a, b) => {
                const orderA = a.order || 0;
                const orderB = b.order || 0;
                
                if (orderA !== orderB) {
                    return orderA - orderB;
                }
                
                return new Date(b.createdAt) - new Date(a.createdAt);
            });
            setProducts(sortedProducts)
        } catch (error) {
            console.log('Get products error:', error)
            toast.error('Məhsullar yüklənərkən xəta baş verdi')
        }
    }, [apiClient])

    const [newProduct, setNewProduct] = useState()
    const addProductFunc = useCallback(async (product) => {
        setProductLoading(true)
        try {
            console.log('Sending product data to server:', product);
            console.log('FormData entries:');
            for (let [key, value] of product.entries()) {
                console.log(`${key}:`, value);
            }
            
            const response = await apiClient.post('/Product/AddProduct', product)
            console.log('Server response:', response.data);
            setNewProduct(response.data)
            toast.success(response.data.message)
            setProductLoading(false)
        } catch (error) {
            console.log('Add Product Error:', error)
            console.log('Error response:', error.response)
            
            if (error.response?.data?.error) {
                toast.error(error.response.data.error)
            } else {
                toast.error('Məhsul əlavə edilərkən xəta baş verdi')
            }
            setProductLoading(false)
        }
    }, [apiClient])

    const [updateProduct, setUpdateProduct] = useState()
    const updateProductFunc = useCallback(async (id, product) => {
        setProductLoading(true)
        try {
            console.log('Updating product with ID:', id);
            console.log('Sending product data to server:', product);
            console.log('FormData type check:', product instanceof FormData);
            console.log('FormData entries:');
            for (let [key, value] of product.entries()) {
                console.log(`${key}:`, value);
            }
            
            // Log request config
            console.log('Request config before sending:');
            console.log('- URL:', `/Product/UpdateProduct/${id}`);
            console.log('- Method:', 'PUT');
            console.log('- Data type:', typeof product);
            console.log('- Headers:', apiClient.defaults.headers);
            
            const response = await apiClient.put(`/Product/UpdateProduct/${id}`, product)
            console.log('Server response:', response.data);
            setUpdateProduct(response.data.product)
            toast.success(response.data.message)
            setProductLoading(false)
        } catch (error) {
            console.log('Update Product Error:', error)
            console.log('Error response:', error.response)
            
            if (error.response?.data?.error) {
                toast.error(error.response.data.error)
            } else {
                toast.error('Məhsul yenilənərkən xəta baş verdi')
            }
            setProductLoading(false)
        }
    }, [apiClient])

    const [deleteProduct, setDeleteProduct] = useState()
    const deleteProductFunc = useCallback(async (id) => {
        setProductLoading(true)
        try {
            const response = await apiClient.delete(`/Product/DeleteProduct/${id}`)
            setDeleteProduct(response.data)
            toast.success(response.data.message)
            setProductLoading(false)
        } catch (error) {
            console.log('Delete product error:', error)
            toast.error(error.response?.data?.error || 'Məhsul silinərkən xəta baş verdi')
            setProductLoading(false)
        }
    }, [apiClient])

    const [getProductByCategoryLoading, setGetProductByCategoryLoading] = useState(true)
    const [getProductByCategory, setGetProductByCategory] = useState([])
    const getProductByCategoryFunc = useCallback(async (name) => {
        try {
            const response = await apiClient.get(`/Product/GetProduct/${name}`)
            setGetProductByCategory(response.data)
            setGetProductByCategoryLoading(false)
        } catch (error) {
            console.log(error)
            setGetProductByCategory([])
            setGetProductByCategoryLoading(false)
        }
    }, [apiClient])

    const setGetProductByCategoryLoadingFunc = useCallback((loading) => {
        setGetProductByCategoryLoading(loading)
    }, [])

    const updateProductOrderFunc = useCallback(async (products, categoryId) => {
        setProductLoading(true)
        try {
            console.log('Sending products for order update:', products);
            console.log('Category ID:', categoryId);
            const response = await apiClient.put('/Product/UpdateProductOrder', { products, categoryId })
            console.log('Update product order response:', response.data);
            toast.success(response.data.message)
            
            // Update local state with new order
            setProducts(prevProducts => {
                const updatedProducts = [...prevProducts];
                
                // Update the order of products in the category
                products.forEach((product, index) => {
                    const productIndex = updatedProducts.findIndex(p => p._id === product._id);
                    if (productIndex !== -1) {
                        updatedProducts[productIndex] = { ...updatedProducts[productIndex], order: index };
                    }
                });
                
                // Sort by order and creation date
                return updatedProducts.sort((a, b) => {
                    const orderA = a.order || 0;
                    const orderB = b.order || 0;
                    
                    if (orderA !== orderB) {
                        return orderA - orderB;
                    }
                    
                    return new Date(b.createdAt) - new Date(a.createdAt);
                });
            });
            
            setProductLoading(false)
        } catch (error) {
            console.log('Update product order error:', error)
            console.log('Error response:', error.response?.data)
            console.log('Error status:', error.response?.status)
            toast.error(error.response?.data?.error || 'Məhsul sırası yenilənərkən xəta baş verdi')
            setProductLoading(false)
        }
    }, [apiClient])


    // header Img change Start
    const [headerImg, setheaderImg] = useState('')
    const [headerName, setheaderName] = useState('')
    const changeHeaderImgFunc = useCallback((imgUrl, name) => {
        setheaderImg(imgUrl)
        setheaderName(name)
    }, [])

    // contact start
    const [contactLoading, setcontactLoading] = useState(false)
    const [contactData, setcontactData] = useState()
    const getContactData = useCallback(async () => {
        try {
            const response = await apiClient.get('/Contact')
            setcontactData(response.data[0])
        } catch (error) {
            console.log(error)
            setcontactData(null)
        }
    }, [apiClient])

    const [updateContact, setupdateContact] = useState()
    const updateContactFunc = useCallback(async (contact, id) => {

        setcontactLoading(true)
        try {
            const response = await apiClient.put(`/Contact/update/${id}`, contact)
            setupdateContact(response.data.webAbout)
            toast.success(response.data.message)
            setcontactLoading(false)
        } catch (error) {
            console.log(error)
            toast.error(error.response.data.error)
            setcontactLoading(false)
        }
    }, [apiClient])

    // ---------------------------------------

    // Initial data loading - run only once
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                await Promise.all([
                    getCategoriesFunc(),
                    getProductsFunc(),
                    getContactData()
                ]);
            } catch (error) {
                console.log('Initial data loading error:', error);
            }
        };
        
        loadInitialData();
    }, []); // Empty dependency array - run only once

    // category
    useEffect(() => {
        if (newCategory || deleteCategory || updateCategory) {
            const loadCategories = async () => {
                try {
                    await getCategoriesFunc();
                } catch (error) {
                    console.log('Error loading categories:', error);
                }
            };
            loadCategories();
        }
    }, [newCategory, deleteCategory, updateCategory])

    // product
    useEffect(() => {
        if (newProduct || deleteProduct || updateProduct) {
            const loadProducts = async () => {
                try {
                    await getProductsFunc();
                } catch (error) {
                    console.log('Error loading products:', error);
                }
            };
            loadProducts();
        }
    }, [newProduct, deleteProduct, updateProduct])

    // contact
    useEffect(() => {
        if (updateContact) {
            const loadContact = async () => {
                try {
                    await getContactData();
                } catch (error) {
                    console.log('Error loading contact:', error);
                }
            };
            loadContact();
        }
    }, [updateContact])

    // show contact or work time
    const [showContactOrWork, setshowContactOrWork] = useState(false)
    const showContactOrWorkFunc = useCallback(() => {
        setshowContactOrWork(!showContactOrWork)
    }, [showContactOrWork])

    // Table management (local only)
    const [tables, setTables] = useState(() => {
        const saved = localStorage.getItem('adminTables');
        return saved ? JSON.parse(saved) : [];
    });
    const [finishedOrders, setFinishedOrders] = useState(() => {
        const saved = localStorage.getItem('finishedOrders');
        return saved ? JSON.parse(saved) : [];
    });
    
    useEffect(() => {
        localStorage.setItem('adminTables', JSON.stringify(tables));
    }, [tables]);
    useEffect(() => {
        localStorage.setItem('finishedOrders', JSON.stringify(finishedOrders));
    }, [finishedOrders]);

    return (
        <ContextAdmin.Provider value={{
            // category start
            categoryLoading,
            categories,
            getCategoriesFunc,
            addCategoryFunc,
            deleteCategoryFunc,
            updateCategoryFunc,
            updateCategoryOrderFunc,
            // product start
            productLoading,
            products,
            getProductsFunc,
            addProductFunc,
            updateProductFunc,
            deleteProductFunc,
            updateProductOrderFunc,
            getProductByCategoryFunc,
            getProductByCategory,
            getProductByCategoryLoading,
            setGetProductByCategoryLoadingFunc,
            // header img change
            changeHeaderImgFunc,
            headerImg,
            headerName,
            // contact start
            contactData,
            updateContactFunc,
            contactLoading,
            showContactOrWorkFunc,
            showContactOrWork,
            tables,
            setTables,
            finishedOrders,
            setFinishedOrders,
        }}>
            {
                children
            }
        </ContextAdmin.Provider>
    )
}

export default AdminContext