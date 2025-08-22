import React, { useContext, useEffect, useState } from 'react';
import HeaderAdmin from '../components/HeaderAdmin';
import Sidebar from '../components/AdminComponents/Sidebar';
import { Outlet, useNavigate } from 'react-router-dom';
import { ContextUser } from '../context/CheckUserContext';
import Loading from '../components/Loading';

const Admin = () => {
    const { hasJwtToken, checkJwtToken } = useContext(ContextUser)
    const [loading, setLoading] = useState(true);
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
            <Sidebar />
            <div className='flex-1 ml-64 pb-20'>
                <Outlet />
            </div>
        </div>
    );
};

export default Admin;
