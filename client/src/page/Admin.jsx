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
            
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            <div className='flex-1 md:ml-64 pb-20 w-full'>
                <Outlet />
            </div>
        </div>
    );
};

export default Admin;
