import React, { useEffect, useState } from 'react'
import { createContext } from 'react'
export const ContextUser = createContext()
import axios from "axios";
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const CheckUserContext = ({ children }) => {
    const navigate = useNavigate()
    const apiUrl = import.meta.env.VITE_API;

    const apiClient = axios.create({
        baseURL: apiUrl,
    });

    const [hasJwtToken, sethasJwtToken] = useState(null)

    apiClient.interceptors.response.use(
        (response) => response,
        (error) => {
            if (error.response?.status === 403) {
                navigate("/");
                sethasJwtToken(false)
            }
            return Promise.reject(error);
        }
    );

    useEffect(() => {
        const cookies = document.cookie;
        const jwtToken = cookies.split(';').some(c => c.trim().startsWith('jwtToken='));
        sethasJwtToken(jwtToken);
    }, [])

    return (
        <ContextUser.Provider value={{
            apiClient,
            hasJwtToken,
            sethasJwtToken
        }}>
            {
                children
            }
        </ContextUser.Provider>
    )
}

export default CheckUserContext
