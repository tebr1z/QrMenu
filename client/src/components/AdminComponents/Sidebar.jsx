import React, { useState, useContext } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ContextUser } from '../../context/CheckUserContext';
import { toast } from 'react-toastify';
const Sidebar = () => {
    const { apiClient, sethasJwtToken } = useContext(ContextUser)
    const navigate = useNavigate()
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    // logout start
    const logout = async () => {
        try {
            const response = await apiClient.post(`/Auth/Logout`)
            toast.success(response.data.message)
            sethasJwtToken(false)
            navigate("/Sign")
        } catch (error) {
            console.log(error)
        }
    }


    // toogle start 
    const [showSubLinks, setshowSubLinks] = useState(false)


    return (
        <div className='h-[100vh] pt-[10px] relative max-[991px]:fixed max-[991px]:z-50'>
            <span
                className="text-orange-500 text-4xl p-2 cursor-pointer absolute  top-0 "
                onClick={toggleSidebar}
            >

                {
                    isSidebarOpen ? <i className="fa-solid fa-rectangle-xmark"></i> :
                        <i className="fa-solid fa-bars"></i>
                }

            </span>
            <div className="h-full pt-[40px]">
                {isSidebarOpen && (
                    <div className="sidebar p-2 w-[300px] overflow-y-auto text-center h-full bg-[#2C2C2C]">
                        <div className="text-gray-100 text-xl">
                            <div className="p-2.5 mt-1 flex items-center">
                                <i className="bi bi-app-indicator px-2 py-1 rounded-md bg-orange-600"></i>
                                <h1 className="font-bold text-gray-200 text-[15px] ml-3">Admin Panel</h1>
                                <i
                                    className="bi bi-x cursor-pointer ml-auto"
                                    onClick={toggleSidebar}
                                ></i>
                            </div>
                            <div className="my-2 bg-gray-600 h-[1px]"></div>
                        </div>
                        <div className="p-2.5 flex items-center rounded-md px-4 duration-300 cursor-pointer bg-gray-700 text-white">
                            <i className="bi bi-search text-sm"></i>
                            <input
                                type="text"
                                placeholder="Axtar"
                                className="text-[15px] ml-4 w-full bg-transparent focus:outline-none"
                            />
                        </div>
                        <button
                            onClick={() => setshowSubLinks(!showSubLinks)}
                            className="p-2.5 mt-3 flex items-center rounded-md px-4 duration-300 cursor-pointer hover:bg-orange-600 text-white w-full">
                            <i className="bi bi-bookmark-fill"></i>
                            <span className="text-[15px] ml-4 text-gray-200 font-bold">Restorant Haqqında</span>
                        </button>
                        {
                            showSubLinks &&
                            <div className="mt-2 pl-6 border-l-4 border-orange-600">
                                <NavLink
                                    to="/Admin/Contact"
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

                        <NavLink to="/Admin/Menu" className={({ isActive }) => `p-2.5 mt-3 flex items-center rounded-md px-4 duration-300 cursor-pointer hover:bg-orange-600 text-white ${isActive ? 'bg-orange-600 font-bold' : ''}`}>
                            <i className="bi bi-bookmark-fill"></i>
                            <span className="text-[15px] ml-4 text-gray-200 font-bold">Menu</span>
                        </NavLink>
                        <NavLink to="/Admin/Category" className={({ isActive }) => `p-2.5 mt-3 flex items-center rounded-md px-4 duration-300 cursor-pointer hover:bg-orange-600 text-white ${isActive ? 'bg-orange-600 font-bold' : ''}`}>
                            <i className="bi bi-house-door-fill"></i>
                            <span className="text-[15px] ml-4 text-gray-200 font-bold">Kateqoriya</span>
                        </NavLink>
                        <NavLink to="/Admin/Product" className={({ isActive }) => `p-2.5 mt-3 flex items-center rounded-md px-4 duration-300 cursor-pointer hover:bg-orange-600 text-white ${isActive ? 'bg-orange-600 font-bold' : ''}`}>
                            <i className="bi bi-bookmark-fill"></i>
                            <span className="text-[15px] ml-4 text-gray-200 font-bold">Məhsul</span>
                        </NavLink>
                        <NavLink to="/Admin/Tables" className={({ isActive }) => `p-2.5 mt-3 flex items-center rounded-md px-4 duration-300 cursor-pointer hover:bg-orange-600 text-white ${isActive ? 'bg-orange-600 font-bold' : ''}`}>
                            <i className="bi bi-table"></i>
                            <span className="text-[15px] ml-4 text-gray-200 font-bold">Masa əlavə et</span>
                        </NavLink>
                        <NavLink to="/Admin/TableManage" className={({ isActive }) => `p-2.5 mt-3 flex items-center rounded-md px-4 duration-300 cursor-pointer hover:bg-orange-600 text-white ${isActive ? 'bg-orange-600 font-bold' : ''}`}>
                            <i className="bi bi-gear"></i>
                            <span className="text-[15px] ml-4 text-gray-200 font-bold">Masaların idarəsi</span>
                        </NavLink>
                        <NavLink to="/Admin/Accounts" className={({ isActive }) => `p-2.5 mt-3 flex items-center rounded-md px-4 duration-300 cursor-pointer hover:bg-orange-600 text-white ${isActive ? 'bg-orange-600 font-bold' : ''}`}>
                            <i className="bi bi-receipt"></i>
                            <span className="text-[15px] ml-4 text-gray-200 font-bold">Hesabların idarəsi</span>
                        </NavLink>
                        <button
                            onClick={logout}
                            className="p-2.5 w-full mt-3 flex items-center rounded-md px-4 duration-300 cursor-pointer hover:bg-orange-600 text-white">
                            <i className="bi bi-bookmark-fill"></i>
                            <span className="text-[15px] ml-4 text-gray-200 font-bold">Çıxış</span>
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
                )}
            </div>
        </div>

    );
};

export default Sidebar;
