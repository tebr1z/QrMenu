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
        withCredentials: true, // Important for cookies
    });

    const [hasJwtToken, sethasJwtToken] = useState(null)

    // Function to set session in localStorage
    const setSession = (token) => {
        localStorage.setItem('admin_session_data', JSON.stringify({
            timestamp: Date.now(),
            hasToken: true,
            token: token
        }));
        sethasJwtToken(true);
    };

    // Function to clear session
    const clearSession = () => {
        localStorage.removeItem('admin_session_data');
        sethasJwtToken(false);
    };

    apiClient.interceptors.response.use(
        (response) => response,
        (error) => {
            if (error.response?.status === 403) {
                // Clear localStorage session data
                localStorage.removeItem('admin_session_data');
                navigate("/");
                sethasJwtToken(false)
            }
            return Promise.reject(error);
        }
    );

    useEffect(() => {
        const checkSession = () => {
            // Better cookie checking function
            const getCookie = (name) => {
                const value = `; ${document.cookie}`;
                const parts = value.split(`; ${name}=`);
                if (parts.length === 2) return parts.pop().split(';').shift();
                return null;
            };
            
            // Debug: Log all cookies
            console.log('All cookies:', document.cookie);
            
            // First check localStorage for session (more reliable in development)
            const sessionData = localStorage.getItem('admin_session_data');
            if (sessionData) {
                try {
                    const parsed = JSON.parse(sessionData);
                    const sessionAge = Date.now() - parsed.timestamp;
                    const maxSessionAge = 24 * 60 * 60 * 1000; // 24 saat
                    
                    console.log('Session age:', Math.round(sessionAge / 1000 / 60), 'minutes');
                    
                    if (sessionAge < maxSessionAge && parsed.hasToken) {
                        console.log('Valid session found in localStorage');
                        sethasJwtToken(true);
                        return;
                    }
                } catch (error) {
                    console.error('Session data parse error:', error);
                }
            }
            
            // Then check for JWT token in cookies
            const jwtToken = getCookie('jwtToken');
            console.log('JWT Token found:', jwtToken ? 'Yes' : 'No');
            if (jwtToken) {
                console.log('Token length:', jwtToken.length);
            }
            
            if (jwtToken && jwtToken.length > 10) { // Basic validation
                console.log('Valid JWT token found, setting session to true');
                setSession(jwtToken); // Use the new setSession function
            } else {
                console.log('No valid session found, setting to false');
                clearSession(); // Use the new clearSession function
            }
        };

        // Initial check with delay to allow cookies to be set
        setTimeout(checkSession, 1000);
        
        // Check session every 5 minutes
        const sessionCheckInterval = setInterval(checkSession, 5 * 60 * 1000);
        
        return () => clearInterval(sessionCheckInterval);
    }, [])

    return (
        <ContextUser.Provider value={{
            apiClient,
            hasJwtToken,
            sethasJwtToken,
            setSession,
            clearSession
        }}>
            {
                children
            }
        </ContextUser.Provider>
    )
}

export default CheckUserContext
