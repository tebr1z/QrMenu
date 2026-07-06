import React, { useState, useContext, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ContextUser } from '../../context/CheckUserContext';
import { toast } from 'react-toastify';
import { canAccessRoute } from '../../config/roles';

const SET_REQUESTS_LAST_SEEN_KEY = 'setRequestsLastSeenAt';
const COMPLAINTS_LAST_SEEN_KEY = 'complaintsLastSeenAt';

const Sidebar = ({ isOpen, onClose, collapsed = false }) => {
    const { apiClient, clearAuth, userRole, userPermissions } = useContext(ContextUser)
    const location = useLocation()
    const [hasNewSetRequests, setHasNewSetRequests] = useState(false)
    const [hasNewComplaints, setHasNewComplaints] = useState(false)
    const can = (segment) => canAccessRoute(userRole, userPermissions, segment);

    useEffect(() => {
        if (!can('SetRequests')) return;
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
    }, [location.pathname, apiClient, userRole])

    useEffect(() => {
        if (!can('Complaints')) return;
        const refreshComplaintBadge = () => {
            if (location.pathname === '/Admin/Complaints') {
                setHasNewComplaints(false)
                return
            }
            const lastSeen = localStorage.getItem(COMPLAINTS_LAST_SEEN_KEY)
            apiClient.get('/complaint?limit=20')
                .then((res) => {
                    const list = Array.isArray(res.data) ? res.data : []
                    const hasUnread = list.some((c) => c.isRead !== true)
                    if (!hasUnread) {
                        setHasNewComplaints(false)
                        return
                    }
                    const newest = list[0] ? new Date(list[0].createdAt).getTime() : 0
                    const seen = lastSeen ? new Date(lastSeen).getTime() : 0
                    setHasNewComplaints(hasUnread || newest > seen)
                })
                .catch(() => setHasNewComplaints(false))
        }

        if (location.pathname === '/Admin/Complaints') {
            localStorage.setItem(COMPLAINTS_LAST_SEEN_KEY, new Date().toISOString())
            setHasNewComplaints(false)
        } else {
            refreshComplaintBadge()
        }

        window.addEventListener('complaints-updated', refreshComplaintBadge)
        return () => window.removeEventListener('complaints-updated', refreshComplaintBadge)
    }, [location.pathname, apiClient, userRole])

    const logout = async () => {
        try {
            const response = await apiClient.post(`/Auth/Logout`)
            toast.success(response.data.message)
        } catch (error) {
            console.log('Logout error:', error)
            toast.info('Yerli sessiya təmizləndi')
        } finally {
            if (clearAuth) {
                clearAuth();
            } else {
                localStorage.removeItem('admin_session_data');
                localStorage.removeItem('userName');
            }
            window.location.href = '/Sign'
        }
    }

    const [showSubLinks, setshowSubLinks] = useState(false)

    const navClass = ({ isActive }) =>
        `p-2.5 mt-3 flex items-center rounded-md ${collapsed ? 'px-3 justify-center' : 'px-4'} duration-300 cursor-pointer hover:bg-orange-600 text-white ${isActive ? 'bg-orange-600 font-bold' : ''}`;

    return (
        <>
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
                    onClick={onClose}
                ></div>
            )}

            <div className={`fixed left-0 top-0 h-screen bg-[#2C2C2C] z-50 shadow-lg transition-transform duration-300 ease-in-out ${
                isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
            } ${collapsed ? 'md:w-20' : 'md:w-64'} w-64`}>
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

                    {can('Contact') && (
                        <>
                            <button
                                onClick={() => setshowSubLinks(!showSubLinks)}
                                className={`p-2.5 mt-3 flex items-center rounded-md ${collapsed ? 'px-3 justify-center' : 'px-4'} duration-300 cursor-pointer hover:bg-orange-600 text-white w-full`}
                                title={collapsed ? 'Restorant Haqqında' : undefined}
                            >
                                <i className="bi bi-bookmark-fill"></i>
                                {!collapsed && <span className="text-[15px] ml-4 text-gray-200 font-bold">Restorant Haqqında</span>}
                            </button>
                            {showSubLinks && !collapsed && (
                                <div className="mt-2 pl-6 border-l-4 border-orange-600">
                                    <NavLink
                                        to="/Admin/Contact"
                                        onClick={onClose}
                                        className={({ isActive }) => `p-2.5 mt-2 flex items-center rounded-md px-4 duration-300 cursor-pointer hover:bg-orange-500 text-gray-100 ${isActive ? 'bg-orange-600 font-bold' : ''}`}
                                    >
                                        <i className="bi bi-info-circle"></i>
                                        <span className="text-[14px] ml-4 font-semibold">Əlaqə Məlumatı</span>
                                    </NavLink>
                                </div>
                            )}
                        </>
                    )}

                    {can('Menu') && (
                        <NavLink to="/Admin/Menu" onClick={onClose} className={navClass}>
                            <i className="bi bi-bookmark-fill"></i>
                            {!collapsed && <span className="text-[15px] ml-4 text-gray-200 font-bold">Menu</span>}
                        </NavLink>
                    )}
                    {can('Category') && (
                        <NavLink to="/Admin/Category" onClick={onClose} className={navClass}>
                            <i className="bi bi-house-door-fill"></i>
                            {!collapsed && <span className="text-[15px] ml-4 text-gray-200 font-bold">Kateqoriya</span>}
                        </NavLink>
                    )}
                    {can('Product') && (
                        <NavLink to="/Admin/Product" onClick={onClose} className={navClass}>
                            <i className="bi bi-bookmark-fill"></i>
                            {!collapsed && <span className="text-[15px] ml-4 text-gray-200 font-bold">Məhsul</span>}
                        </NavLink>
                    )}
                    {can('Tables') && (
                        <NavLink to="/Admin/Tables" onClick={onClose} className={navClass}>
                            <i className="bi bi-table"></i>
                            {!collapsed && <span className="text-[15px] ml-4 text-gray-200 font-bold">Masa əlavə et</span>}
                        </NavLink>
                    )}
                    {can('TableManage') && (
                        <NavLink to="/Admin/TableManage" onClick={onClose} className={navClass}>
                            <i className="bi bi-gear"></i>
                            {!collapsed && <span className="text-[15px] ml-4 text-gray-200 font-bold">Masaların idarəsi</span>}
                        </NavLink>
                    )}
                    {can('Accounts') && (
                        <NavLink to="/Admin/Accounts" onClick={onClose} className={navClass}>
                            <i className="bi bi-receipt"></i>
                            {!collapsed && <span className="text-[15px] ml-4 text-gray-200 font-bold">Hesabların idarəsi</span>}
                        </NavLink>
                    )}
                    {can('Finance') && (
                        <NavLink to="/Admin/Finance" onClick={onClose} className={navClass}>
                            <i className="bi bi-wallet2"></i>
                            {!collapsed && <span className="text-[15px] ml-4 text-gray-200 font-bold">Günlük Xərclər</span>}
                        </NavLink>
                    )}
                    {can('SetRequests') && (
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
                    )}
                    {can('Complaints') && (
                        <NavLink to="/Admin/Complaints" onClick={onClose} className={({ isActive }) => `p-2.5 mt-3 flex items-center rounded-md relative ${collapsed ? 'px-3 justify-center' : 'px-4'} duration-300 cursor-pointer hover:bg-orange-600 text-white ${isActive ? 'bg-orange-600 font-bold' : ''}`}>
                            <i className="bi bi-chat-left-text-fill"></i>
                            {!collapsed && (
                                <span className="text-[15px] ml-4 text-gray-200 font-bold flex items-center gap-2">
                                    Şikayət qutusu
                                    {hasNewComplaints && (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500 text-white uppercase">
                                            Yeni
                                        </span>
                                    )}
                                </span>
                            )}
                            {collapsed && hasNewComplaints && (
                                <span className="absolute top-1/2 right-2 -translate-y-1/2 w-2 h-2 rounded-full bg-rose-500" title="Yeni şikayətlər var"></span>
                            )}
                        </NavLink>
                    )}
                    {can('StockControl') && (
                        <NavLink to="/Admin/StockControl" onClick={onClose} className={navClass}>
                            <i className="bi bi-box-seam"></i>
                            {!collapsed && <span className="text-[15px] ml-4 text-gray-200 font-bold">Stok Kontrol</span>}
                        </NavLink>
                    )}
                    {can('SetIngredients') && (
                        <NavLink to="/Admin/SetIngredients" onClick={onClose} className={navClass}>
                            <i className="bi bi-layers"></i>
                            {!collapsed && <span className="text-[15px] ml-4 text-gray-200 font-bold">Set məhsulları</span>}
                        </NavLink>
                    )}
                    {can('SoldProducts') && (
                        <NavLink to="/Admin/SoldProducts" onClick={onClose} className={navClass}>
                            <i className="bi bi-bar-chart-line"></i>
                            {!collapsed && <span className="text-[15px] ml-4 text-gray-200 font-bold">Satılan məhsullar</span>}
                        </NavLink>
                    )}
                    {can('SalesReport') && (
                        <NavLink to="/Admin/SalesReport" onClick={onClose} className={navClass}>
                            <i className="bi bi-graph-up-arrow"></i>
                            {!collapsed && <span className="text-[15px] ml-4 text-gray-200 font-bold">Satış Hesabatı</span>}
                        </NavLink>
                    )}
                    {can('EmployeePayroll') && (
                        <NavLink to="/Admin/EmployeePayroll" onClick={onClose} className={navClass}>
                            <i className="bi bi-person-badge"></i>
                            {!collapsed && <span className="text-[15px] ml-4 text-gray-200 font-bold">İşçi Maaş</span>}
                        </NavLink>
                    )}
                    {can('Users') && (
                        <NavLink to="/Admin/Users" onClick={onClose} className={navClass}>
                            <i className="bi bi-people-fill"></i>
                            {!collapsed && <span className="text-[15px] ml-4 text-gray-200 font-bold">İstifadəçilər</span>}
                        </NavLink>
                    )}
                    {can('AuditLog') && (
                        <NavLink to="/Admin/AuditLog" onClick={onClose} className={navClass}>
                            <i className="bi bi-journal-text"></i>
                            {!collapsed && <span className="text-[15px] ml-4 text-gray-200 font-bold">Fəaliyyət jurnalı</span>}
                        </NavLink>
                    )}
                    <button
                        onClick={logout}
                        className={`p-2.5 w-full mt-3 flex items-center rounded-md ${collapsed ? 'px-3 justify-center' : 'px-4'} duration-300 cursor-pointer hover:bg-orange-600 text-white`}
                        title={collapsed ? 'Çıxış' : undefined}
                    >
                        <i className="bi bi-box-arrow-right"></i>
                        {!collapsed && <span className="text-[15px] ml-4 text-gray-200 font-bold">Çıxış</span>}
                    </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Sidebar;
