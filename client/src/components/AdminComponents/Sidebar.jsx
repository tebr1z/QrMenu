import React, { useState, useContext, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { ContextUser } from '../../context/CheckUserContext';
import { toast } from 'react-toastify';

const SET_REQUESTS_LAST_SEEN_KEY = 'setRequestsLastSeenAt';

const Sidebar = ({ isOpen, onClose, collapsed = false }) => {
    const { apiClient, clearAuth } = useContext(ContextUser)
    const navigate = useNavigate()
    const location = useLocation()
    const [hasNewSetRequests, setHasNewSetRequests] = useState(false)

    useEffect(() => {
        if (location.pathname === '/Admin/SetRequests') {
            localStorage.setItem(SET_REQUESTS_LAST_SEEN_KEY, new Date().toISOString())
            setHasNewSetRequests(false)
        } else {
            const lastSeen = localStorage.getItem(SET_REQUESTS_LAST_SEEN_KEY)
            apiClient.get('/setrequest?limit=1')
                .then((res) => {
                    const list = Array.isArray(res.data) ? res.data : []
                    if (list.length === 0) {
                        setHasNewSetRequests(false)
                        return
                    }
                    const newest = new Date(list[0].createdAt).getTime()
                    const seen = lastSeen ? new Date(lastSeen).getTime() : 0
                    setHasNewSetRequests(newest > seen)
                })
                .catch(() => setHasNewSetRequests(false))
        }
    }, [location.pathname, apiClient])

    // logout start
    const logout = async () => {
        try {
            const response = await apiClient.post(`/Auth/Logout`)
            toast.success(response.data.message)
        } catch (error) {
            console.log('Logout error:', error)
            // Even if server logout fails, clear local state
            toast.info('Yerli sessiya təmizləndi')
        } finally {
            // Always clear local authentication state
            if (clearAuth) {
                clearAuth();
            } else {
                localStorage.removeItem('admin_session_data');
                localStorage.removeItem('userName');
            }

            // Force redirect to Sign page
            window.location.href = '/Sign'
        }
    }


    // toogle start 
    const [showSubLinks, setshowSubLinks] = useState(false)


    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
                    onClick={onClose}
                ></div>
            )}
            
            {/* Sidebar */}
            <div className={`fixed left-0 top-0 h-screen bg-[#2C2C2C] z-50 shadow-lg transition-transform duration-300 ease-in-out ${
                isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
            } ${collapsed ? 'md:w-20' : 'md:w-64'} w-64`}>
                {/* Mobile Close Button */}
                <button
                    onClick={onClose}
                    className="md:hidden absolute top-4 right-4 text-white hover:text-orange-500 text-2xl z-10"
                >
                    <i className="bi bi-x-lg"></i>
                </button>
                
                <div className="h-full pt-[40px] pb-20">
                    <div className="sidebar p-2 w-full overflow-y-auto text-center h-full">
                    <div className="text-gray-100 text-xl">
                        <div className={`p-2.5 mt-1 flex items-center ${collapsed ? 'justify-center' : ''}`}>
                            <i className="bi bi-app-indicator px-2 py-1 rounded-md bg-orange-600"></i>
                            {!collapsed && <h1 className="font-bold text-gray-200 text-[15px] ml-3">Admin Panel</h1>}
                        </div>
                        <div className="my-2 bg-gray-600 h-[1px]"></div>
                    </div>
                    <div className={`p-2.5 flex items-center rounded-md ${collapsed ? 'px-3 justify-center' : 'px-4'} duration-300 cursor-pointer bg-gray-700 text-white`}>
                        <i className="bi bi-search text-sm"></i>
                        {!collapsed && (
                            <input
                                type="text"
                                placeholder="Axtar"
                                className="text-[15px] ml-4 w-full bg-transparent focus:outline-none"
                            />
                        )}
                    </div>
                    <button
                        onClick={() => setshowSubLinks(!showSubLinks)}
                        className={`p-2.5 mt-3 flex items-center rounded-md ${collapsed ? 'px-3 justify-center' : 'px-4'} duration-300 cursor-pointer hover:bg-orange-600 text-white w-full`}
                        title={collapsed ? 'Restorant Haqqında' : undefined}
                    >
                        <i className="bi bi-bookmark-fill"></i>
                        {!collapsed && <span className="text-[15px] ml-4 text-gray-200 font-bold">Restorant Haqqında</span>}
                    </button>
                    {
                        showSubLinks && !collapsed &&
                        <div className="mt-2 pl-6 border-l-4 border-orange-600">
                            <NavLink
                                to="/Admin/Contact"
                                onClick={onClose}
                                className={({ isActive }) => `p-2.5 mt-2 flex items-center rounded-md px-4 duration-300 cursor-pointer hover:bg-orange-500 text-gray-100 ${isActive ? 'bg-orange-600 font-bold' : ''}`}
                            >
                                <i className="bi bi-info-circle"></i>
                                <span className="text-[14px] ml-4 font-semibold">Əlaqə Məlumatı</span>
                            </NavLink>
                            {/* <Link
                                to="/Admin/Map"
                                className="p-2.5 mt-2 flex items-center rounded-md px-4 duration-300 cursor-pointer hover:bg-orange-500 text-gray-100 "
                            >
                                <i className="bi bi-geo-alt"></i>
                                <span className="text-[14px] ml-4 font-semibold">Ünvan Xəritə</span>
                            </Link> */}
                        </div>
                    }

                    <NavLink to="/Admin/Menu" onClick={onClose} className={({ isActive }) => `p-2.5 mt-3 flex items-center rounded-md ${collapsed ? 'px-3 justify-center' : 'px-4'} duration-300 cursor-pointer hover:bg-orange-600 text-white ${isActive ? 'bg-orange-600 font-bold' : ''}`}>
                        <i className="bi bi-bookmark-fill"></i>
                        {!collapsed && <span className="text-[15px] ml-4 text-gray-200 font-bold">Menu</span>}
                    </NavLink>
                    <NavLink to="/Admin/Category" onClick={onClose} className={({ isActive }) => `p-2.5 mt-3 flex items-center rounded-md ${collapsed ? 'px-3 justify-center' : 'px-4'} duration-300 cursor-pointer hover:bg-orange-600 text-white ${isActive ? 'bg-orange-600 font-bold' : ''}`}>
                        <i className="bi bi-house-door-fill"></i>
                        {!collapsed && <span className="text-[15px] ml-4 text-gray-200 font-bold">Kateqoriya</span>}
                    </NavLink>
                    <NavLink to="/Admin/Product" onClick={onClose} className={({ isActive }) => `p-2.5 mt-3 flex items-center rounded-md ${collapsed ? 'px-3 justify-center' : 'px-4'} duration-300 cursor-pointer hover:bg-orange-600 text-white ${isActive ? 'bg-orange-600 font-bold' : ''}`}>
                        <i className="bi bi-bookmark-fill"></i>
                        {!collapsed && <span className="text-[15px] ml-4 text-gray-200 font-bold">Məhsul</span>}
                    </NavLink>
                    <NavLink to="/Admin/Tables" onClick={onClose} className={({ isActive }) => `p-2.5 mt-3 flex items-center rounded-md ${collapsed ? 'px-3 justify-center' : 'px-4'} duration-300 cursor-pointer hover:bg-orange-600 text-white ${isActive ? 'bg-orange-600 font-bold' : ''}`}>
                        <i className="bi bi-table"></i>
                        {!collapsed && <span className="text-[15px] ml-4 text-gray-200 font-bold">Masa əlavə et</span>}
                    </NavLink>
                    <NavLink to="/Admin/TableManage" onClick={onClose} className={({ isActive }) => `p-2.5 mt-3 flex items-center rounded-md ${collapsed ? 'px-3 justify-center' : 'px-4'} duration-300 cursor-pointer hover:bg-orange-600 text-white ${isActive ? 'bg-orange-600 font-bold' : ''}`}>
                        <i className="bi bi-gear"></i>
                        {!collapsed && <span className="text-[15px] ml-4 text-gray-200 font-bold">Masaların idarəsi</span>}
                    </NavLink>
                    <NavLink to="/Admin/Accounts" onClick={onClose} className={({ isActive }) => `p-2.5 mt-3 flex items-center rounded-md ${collapsed ? 'px-3 justify-center' : 'px-4'} duration-300 cursor-pointer hover:bg-orange-600 text-white ${isActive ? 'bg-orange-600 font-bold' : ''}`}>
                        <i className="bi bi-receipt"></i>
                        {!collapsed && <span className="text-[15px] ml-4 text-gray-200 font-bold">Hesabların idarəsi</span>}
                    </NavLink>
                    <NavLink to="/Admin/Finance" onClick={onClose} className={({ isActive }) => `p-2.5 mt-3 flex items-center rounded-md ${collapsed ? 'px-3 justify-center' : 'px-4'} duration-300 cursor-pointer hover:bg-orange-600 text-white ${isActive ? 'bg-orange-600 font-bold' : ''}`}>
                        <i className="bi bi-wallet2"></i>
                        {!collapsed && <span className="text-[15px] ml-4 text-gray-200 font-bold">Kassa / Maliyyə</span>}
                    </NavLink>
                    <NavLink to="/Admin/SetRequests" onClick={onClose} className={({ isActive }) => `p-2.5 mt-3 flex items-center rounded-md relative ${collapsed ? 'px-3 justify-center' : 'px-4'} duration-300 cursor-pointer hover:bg-orange-600 text-white ${isActive ? 'bg-orange-600 font-bold' : ''}`}>
                        <i className="bi bi-palette"></i>
                        {!collapsed && (
                            <span className="text-[15px] ml-4 text-gray-200 font-bold flex items-center gap-2">
                                Set sorğuları
                                {hasNewSetRequests && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-500 text-white uppercase">
                                        Yeni
                                    </span>
                                )}
                            </span>
                        )}
                        {collapsed && hasNewSetRequests && (
                            <span className="absolute top-1/2 right-2 -translate-y-1/2 w-2 h-2 rounded-full bg-green-500" title="Yeni sorğular var"></span>
                        )}
                    </NavLink>
                    <NavLink to="/Admin/StockControl" onClick={onClose} className={({ isActive }) => `p-2.5 mt-3 flex items-center rounded-md ${collapsed ? 'px-3 justify-center' : 'px-4'} duration-300 cursor-pointer hover:bg-orange-600 text-white ${isActive ? 'bg-orange-600 font-bold' : ''}`}>
                        <i className="bi bi-box-seam"></i>
                        {!collapsed && <span className="text-[15px] ml-4 text-gray-200 font-bold">Stok Kontrol</span>}
                    </NavLink>
                    <NavLink to="/Admin/SoldProducts" onClick={onClose} className={({ isActive }) => `p-2.5 mt-3 flex items-center rounded-md ${collapsed ? 'px-3 justify-center' : 'px-4'} duration-300 cursor-pointer hover:bg-orange-600 text-white ${isActive ? 'bg-orange-600 font-bold' : ''}`}>
                        <i className="bi bi-bar-chart-line"></i>
                        {!collapsed && <span className="text-[15px] ml-4 text-gray-200 font-bold">Satılan məhsullar</span>}
                    </NavLink>
                    <button
                        onClick={logout}
                        className={`p-2.5 w-full mt-3 flex items-center rounded-md ${collapsed ? 'px-3 justify-center' : 'px-4'} duration-300 cursor-pointer hover:bg-orange-600 text-white`}
                        title={collapsed ? 'Çıxış' : undefined}
                    >
                        <i className="bi bi-bookmark-fill"></i>
                        {!collapsed && <span className="text-[15px] ml-4 text-gray-200 font-bold">Çıxış</span>}
                    </button>
                    {/* <div className="my-4 bg-gray-600 h-[1px]"></div>
                    <div
                        className="p-2.5 mt-3 flex items-center rounded-md px-4 duration-300 cursor-pointer hover:bg-orange-600 text-white"
                        onClick={toggleDropdown}
                    >
                        <i className="bi bi-chat-left-text-fill"></i>
                        <div className="flex justify-between w-full items-center">
                            <span className="text-[15px] ml-4 text-gray-200 font-bold">Chatbox</span>
                            <span className={`text-sm ${isDropdownOpen ? 'rotate-180' : ''}`} id="arrow">
                                <i className="bi bi-chevron-down"></i>
                            </span>
                        </div>
                    </div>
                    {isDropdownOpen && (
                        <div className="text-left text-sm mt-2 w-4/5 mx-auto text-gray-200 font-bold" id="submenu">
                            <h1 className="cursor-pointer p-2 hover:bg-orange-600 rounded-md mt-1">Social</h1>
                            <h1 className="cursor-pointer p-2 hover:bg-orange-600 rounded-md mt-1">Personal</h1>
                            <h1 className="cursor-pointer p-2 hover:bg-orange-600 rounded-md mt-1">Friends</h1>
                        </div>
                    )}
                    <div className="p-2.5 mt-3 flex items-center rounded-md px-4 duration-300 cursor-pointer hover:bg-orange-600 text-white">
                        <i className="bi bi-box-arrow-in-right"></i>
                        <span className="text-[15px] ml-4 text-gray-200 font-bold">Logout</span>
                    </div> */}
                    </div>
                </div>
            </div>
        </>
    );
};

export default Sidebar;
