import React, { useContext, useState } from 'react'
import HeaderAdmin from '../components/HeaderAdmin'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { ContextUser } from '../context/CheckUserContext'
import { useNavigate } from 'react-router-dom'
const Sign = () => {
    const navigate = useNavigate()
    const { apiClient, sethasJwtToken } = useContext(ContextUser)

    const [signInput, setsignInput] = useState({
        email: '',
        password: ''
    })
    const handleChange = (e) => {
        setsignInput({
            ...signInput,
            [e.target.name]: e.target.value
        })
    }

    const signFunc = async () => {
        try {
            const response = await apiClient.post(`/Auth/Login`, signInput)
            toast.success(response.data.message)
            localStorage.setItem('userName', response.data.payload.Name)
            sethasJwtToken(true)
            navigate("/Admin")
        } catch (error) {
            console.log(error)
            toast.error(error.response.data.error)
        }
    }

    return (
        <div>

            <HeaderAdmin />

            <div className=" pt-[60px] flex items-center justify-center bg-gray-100 pb-[100px]">
                <div className="bg-white shadow-lg rounded-lg p-8 max-w-sm w-full">
                    <h2 className="text-2xl font-bold text-center text-gray-800">Daxil olun</h2>
                    <div>
                        <div className="mb-4">
                            <label htmlFor="email" className="block text-gray-700 font-medium mb-2">Email</label>
                            <input
                                onChange={handleChange}
                                name='email'
                                value={setsignInput.email}
                                type="email"
                                placeholder="E-poçtunuzu daxil edin"
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-700 font-medium mb-2">Şifrə</label>
                            <input
                                onChange={handleChange}
                                name='password'
                                value={setsignInput.password}
                                type="password"
                                placeholder="Şifrənizi daxil edin"
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                            />
                        </div>

                        {/* <div className="flex items-center justify-between mb-4">
                            <label className="flex items-center text-sm text-gray-600">
                                <input type="checkbox" className="mr-2" /> Remember me
                            </label>
                            <Link
                                className="text-sm text-orange-500 hover:underline">Forgot password?
                            </Link>
                        </div> */}

                        <button
                            onClick={signFunc}
                            type="submit"
                            className="w-full bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-1"
                        >
                            Daxil olun
                        </button>
                    </div>

                </div>
            </div>
        </div>
    )
}

export default Sign
