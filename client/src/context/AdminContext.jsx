import React, { createContext, useState, useContext, useEffect } from 'react'
export const ContextAdmin = createContext()
import { ContextUser } from './CheckUserContext'
import { toast } from 'react-toastify'
const AdminContext = ({ children }) => {
    const { apiClient } = useContext(ContextUser)
    // start Category
    const [categoryLoading, setCategoryLoading] = useState(false)

    const [category, setcategory] = useState([])
    const getCategory = async () => {
        try {
            const response = await apiClient.get('/Category/GetCategory')
            setcategory(response.data)
        } catch (error) {
            console.log(error)
        }
    }

    const [newCategory, setNewCategory] = useState()
    const newCategoryFunc = async (category) => {
        setCategoryLoading(true)
        try {
            const data = new FormData()
            data.append('name', category.name)
            data.append('imageCategory', category.imageFile)

            const response = await apiClient.post('/Category/AddCategory', data)
            setNewCategory(response.data)
            toast.success(response.data.message)
            setCategoryLoading(false)
        } catch (error) {
            console.log(error)
            toast.error(error.response.data.error)
            setCategoryLoading(false)
        }
    }

    const [updateCategory, setUpdateCategory] = useState()
    const updateCategoryFunc = async (id, category) => {
        setCategoryLoading(true)
        try {
            const data = new FormData()
            data.append('name', category.name)
            data.append('imageCategory', category.imageFile)
            const response = await apiClient.put(`/Category/UpdateCategory/${id}`, data)
            setUpdateCategory(response.data.category)
            toast.success(response.data.message)
            setCategoryLoading(false)
        } catch (error) {
            console.log(error)
            toast.error(error.response.data.error)
            setCategoryLoading(false)
        }
    }

    const [deleteCategory, setDeleteCategory] = useState()
    const deleteCategoryFunc = async (id) => {
        setCategoryLoading(true)
        try {
            const response = await apiClient.delete(`/Category/DeleteCategory/${id}`)
            setDeleteCategory(response.data)
            toast.success(response.data.message)
            setCategoryLoading(false)
        } catch (error) {
            console.log(error)
            toast.error(error.response.data.error)
            setCategoryLoading(false)
        }
    }

    // start Prodcut
    const [productLoading, setProductLoading] = useState(false)

    const [product, setProduct] = useState([])
    const getProduct = async () => {
        try {
            const response = await apiClient.get('/Product/GetProduct')
            setProduct(response.data)
        } catch (error) {
            console.log(error)
        }
    }

    const [newProduct, setNewProduct] = useState()
    const newProductFunc = async (product) => {
        setProductLoading(true)
        try {
            const data = new FormData()
            data.append('name', product.name)
            data.append('price', product.price)
            data.append('category', product.category_id)
            data.append('description', product.description)
            data.append('imageProduct', product.imageFile)
            const response = await apiClient.post('/Product/AddProduct', data)
            setNewProduct(response.data)
            toast.success(response.data.message)
            setProductLoading(false)
        } catch (error) {
            console.log(error)
            toast.error(error.response.data.error)
            setProductLoading(false)
        }
    }

    const [updateProduct, setUpdateProduct] = useState()
    const updateProductFunc = async (id, product) => {
        setProductLoading(true)
        try {
            const data = new FormData()
            data.append('name', product.name)
            data.append('price', product.price)
            data.append('category', product.category_id)
            data.append('description', product.description)
            data.append('imageProduct', product.imageFile)
            const response = await apiClient.put(`/Product/UpdateProduct/${id}`, data)
            setUpdateProduct(response.data.product)
            toast.success(response.data.message)
            setProductLoading(false)
        } catch (error) {
            console.log(error)
            toast.error(error.response.data.error)
            setProductLoading(false)
        }
    }

    const [deleteProduct, setDeleteProduct] = useState()
    const deleteProductFunc = async (id) => {
        setProductLoading(true)
        try {
            const response = await apiClient.delete(`/Product/DeleteProduct/${id}`)
            setDeleteProduct(response.data)
            toast.success(response.data.message)
            setProductLoading(false)
        } catch (error) {
            console.log(error)
            toast.error(error.response.data.error)
            setProductLoading(false)
        }
    }

    const [getProductByCategoryLoading, setGetProductByCategoryLoading] = useState(true)
    const [getProductByCategory, setGetProductByCategory] = useState([])
    const getProductByCategoryFunc = async (name) => {
        try {
            const response = await apiClient.get(`/Product/GetProduct/${name}`)
            setGetProductByCategory(response.data)
            setGetProductByCategoryLoading(false)
        } catch (error) {
            console.log(error)
            setGetProductByCategory([])
            setGetProductByCategoryLoading(false)
        }
    }


    // header Img change Start
    const [headerImg, setheaderImg] = useState('')
    const [headerName, setheaderName] = useState('')
    const changeHeaderImgFunc = (imgUrl, name) => {
        setheaderImg(imgUrl)
        setheaderName(name)
    }

    // contact start
    const [contactLoading, setcontactLoading] = useState(false)
    const [contactData, setcontactData] = useState()
    const getContactData = async () => {
        try {
            const response = await apiClient.get('/Contact')
            setcontactData(response.data[0])
        } catch (error) {
            console.log(error)
            setcontactData(null)
        }
    }

    const [updateContact, setupdateContact] = useState()
    const updateContactFunc = async (contact, id) => {

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
    }

    // ---------------------------------------

    // category
    useEffect(() => {
        getCategory()
    }, [newCategory, deleteCategory, updateCategory])

    // product
    useEffect(() => {
        getProduct()
    }, [newProduct, deleteProduct, updateProduct])

    // contact
    useEffect(() => {
        getContactData()
    }, [updateContact])

    // show contact or work time
    const [showContactOrWork, setshowContactOrWork] = useState(false)
    const showContactOrWorkFunc = () => {
        setshowContactOrWork(!showContactOrWork)
    }

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
            category,
            newCategoryFunc,
            deleteCategoryFunc,
            updateCategoryFunc,
            // product start
            productLoading,
            product,
            newProductFunc,
            updateProductFunc,
            deleteProductFunc,
            getProductByCategoryFunc,
            getProductByCategory,
            getProductByCategoryLoading,
            setGetProductByCategoryLoading,
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
            setFinishedOrders
        }}>
            {
                children
            }
        </ContextAdmin.Provider>
    )
}

export default AdminContext