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
        if (hasJwtToken === false) {
            navigate("/Sign");
        } else if (hasJwtToken !== null) {
            setLoading(false);
        }
    }, [hasJwtToken]);

    if (loading) {
        return <Loading />;
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
