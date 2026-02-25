import React, { useContext, useEffect, useState } from 'react';
import HeaderAdmin from '../components/HeaderAdmin';
import Sidebar from '../components/AdminComponents/Sidebar';
import { Outlet, useNavigate } from 'react-router-dom';
import { ContextUser } from '../context/CheckUserContext';
import Loading from '../components/Loading';

const Admin = () => {
    const { hasJwtToken, checkJwtToken } = useContext(ContextUser)
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // Check authentication status
        const checkAuth = () => {
            const isAuthenticated = checkJwtToken();
            if (!isAuthenticated) {
                window.location.href = '/Sign';
            } else {
                setLoading(false);
            }
        };

        // Add a small delay to allow context to initialize
        const timer = setTimeout(checkAuth, 100);

        return () => clearTimeout(timer);
    }, [checkJwtToken]);

    // Show loading while checking session
    if (loading) {
        return <Loading />;
    }

    // Don't render anything if not authenticated
    if (!hasJwtToken) {
        return null;
    }

    return (
        <div className='min-h-screen flex bg-gray-50'>
            {/* Hamburger Menu Button - Mobile Only */}
            <button
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden fixed top-4 left-4 z-50 bg-[#2C2C2C] text-white p-2 rounded-lg shadow-lg hover:bg-orange-600 transition"
            >
                <i className="bi bi-list text-2xl"></i>
            </button>
            
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                collapsed={isSidebarCollapsed}
            />
            <div className={`flex-1 pb-20 w-full ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
                {/* Desktop collapse toggle */}
                <div className="hidden md:flex items-center justify-start p-4">
                    <button
                        onClick={() => setIsSidebarCollapsed(prev => !prev)}
                        className="bg-[#2C2C2C] text-white px-3 py-2 rounded-lg shadow hover:bg-orange-600 transition flex items-center gap-2"
                    >
                        <i className={`bi ${isSidebarCollapsed ? 'bi-chevron-right' : 'bi-chevron-left'}`}></i>
                        <span className="text-sm font-semibold">
                            {isSidebarCollapsed ? 'Aç' : 'Kapat'}
                        </span>
                    </button>
                </div>
                <Outlet />
            </div>
        </div>
    );
};

export default Admin;
