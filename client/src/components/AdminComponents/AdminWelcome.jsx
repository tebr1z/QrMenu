import { useState, useEffect, useContext } from "react";
import React from 'react'
import { motion } from "framer-motion";
import { useNavigate } from 'react-router-dom';
import { ContextUser } from '../../context/CheckUserContext';
import { getDefaultAdminRoute, canAccessRoute } from '../../config/roles';

const AdminWelcome = () => {
    const [adminName, setadminName] = useState('')
    const { userRole, userPermissions } = useContext(ContextUser);
    const navigate = useNavigate();

    useEffect(() => {
        setadminName(localStorage.getItem('userName'))
    }, [])

    useEffect(() => {
        if (userRole && !canAccessRoute(userRole, userPermissions, 'Welcome')) {
            navigate(getDefaultAdminRoute(userRole, userPermissions), { replace: true });
        }
    }, [userRole, userPermissions, navigate]);

    return (
        <div className="flex items-center justify-center h-[100vh]  w-full">
            <motion.div
                className="text-4xl font-bold text-gray-800 text-center "
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 2 }}
            >
                Admin Panelinə Xoş Gəlmisiniz <br /> <span className="text-orange-500">{adminName}</span>
            </motion.div>
        </div>
    )
}

export default AdminWelcome
