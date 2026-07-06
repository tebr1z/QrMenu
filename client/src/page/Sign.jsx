import React, { useContext, useState } from 'react'
import HeaderAdmin from '../components/HeaderAdmin'
import { toast } from 'react-toastify'
import { ContextUser } from '../context/CheckUserContext'
import { getDefaultAdminRoute } from '../config/roles'

const Sign = () => {
    const { apiClient, setAuthStatus } = useContext(ContextUser)

    const [loginType, setLoginType] = useState('username')
    const [signInput, setSignInput] = useState({
        login: '',
        password: ''
    })

    const handleChange = (e) => {
        setSignInput({
            ...signInput,
            [e.target.name]: e.target.value
        })
    }

    const signFunc = async (e) => {
        if (e) {
            e.preventDefault();
        }

        const login = signInput.login.trim()
        if (!login) {
            toast.error(loginType === 'email' ? 'E-poçt daxil edin' : 'İstifadəçi adı daxil edin')
            return
        }

        if (loginType === 'email' && !login.includes('@')) {
            toast.error('Düzgün e-poçt ünvanı daxil edin')
            return
        }

        try {
            const response = await apiClient.post(`/Auth/Login`, {
                login,
                password: signInput.password,
            })
            const payload = response.data.payload
            toast.success(response.data.message)
            setAuthStatus(true, payload)
            const role = payload?.Role || payload?.role;
            const permissions = payload?.permissions;
            window.location.href = getDefaultAdminRoute(role, permissions);
        } catch (error) {
            console.log(error)
            toast.error(error.response?.data?.error || 'Giriş uğursuz oldu')
        }
    }

    return (
        <div>
            <HeaderAdmin />

            <div className=" pt-[60px] flex items-center justify-center bg-gray-100 pb-[100px]">
                <div className="bg-white shadow-lg rounded-lg p-8 max-w-sm w-full">
                    <h2 className="text-2xl font-bold text-center text-gray-800">Daxil olun</h2>
                    <p className="text-center text-sm text-gray-500 mt-2 mb-6">
                        İstifadəçi adı və ya e-poçt ilə giriş edin
                    </p>

                    <div className="flex rounded-lg border border-gray-200 p-1 mb-6 bg-gray-50">
                        <button
                            type="button"
                            onClick={() => setLoginType('username')}
                            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${
                                loginType === 'username'
                                    ? 'bg-orange-500 text-white shadow'
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            İstifadəçi adı
                        </button>
                        <button
                            type="button"
                            onClick={() => setLoginType('email')}
                            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${
                                loginType === 'email'
                                    ? 'bg-orange-500 text-white shadow'
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            E-poçt
                        </button>
                    </div>

                    <form onSubmit={signFunc}>
                        <div className="mb-4">
                            <label htmlFor="login" className="block text-gray-700 font-medium mb-2">
                                {loginType === 'email' ? 'E-poçt' : 'İstifadəçi adı'}
                            </label>
                            <input
                                onChange={handleChange}
                                name="login"
                                value={signInput.login}
                                type={loginType === 'email' ? 'email' : 'text'}
                                autoComplete={loginType === 'email' ? 'email' : 'username'}
                                placeholder={loginType === 'email' ? 'ornek@mail.com' : 'istifadeci_adi'}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <label htmlFor="password" className="block text-gray-700 font-medium mb-2">Şifrə</label>
                            <input
                                onChange={handleChange}
                                name="password"
                                value={signInput.password}
                                type="password"
                                autoComplete="current-password"
                                placeholder="Şifrənizi daxil edin"
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-1"
                        >
                            Daxil olun
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default Sign
