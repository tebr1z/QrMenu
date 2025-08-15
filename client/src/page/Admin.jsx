import React, { useContext, useEffect, useState } from 'react';
import HeaderAdmin from '../components/HeaderAdmin';
import Sidebar from '../components/AdminComponents/Sidebar';
import { Outlet, useNavigate } from 'react-router-dom';
import { ContextUser } from '../context/CheckUserContext';
import Loading from '../components/Loading';

const Admin = () => {
    const { hasJwtToken } = useContext(ContextUser)
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        // Add a small delay to allow context to initialize
        const timer = setTimeout(() => {
            if (hasJwtToken === false) {
                navigate("/Sign");
            } else if (hasJwtToken === true) {
                setLoading(false);
            }
        }, 100);

        return () => clearTimeout(timer);
    }, [hasJwtToken, navigate]);

    // Show loading while checking session
    if (loading || hasJwtToken === null) {
        return <Loading />;
    }

    // Don't render anything if not authenticated
    if (hasJwtToken === false) {
        return null;
    }

    return (
        <div className='h-full flex '>
            {/* <HeaderAdmin /> */}
            <Sidebar />
            <Outlet />
        </div>
    );
};

export default Admin;
