import React, { useEffect, useState } from 'react'
import { createContext } from 'react'
export const ContextUser = createContext()
import axios from "axios";
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const CheckUserContext = ({ children }) => {
    const navigate = useNavigate()
    const apiUrl = import.meta.env.VITE_API || '/api';

    const apiClient = axios.create({
        baseURL: apiUrl,
        withCredentials: true, // Important for cookies
        timeout: 10000, // 10 second timeout
    });

    // Add request interceptor to include Authorization header
    apiClient.interceptors.request.use(
        (config) => {
            // Get token from localStorage
            const sessionData = localStorage.getItem('admin_session_data');
            if (sessionData) {
                try {
                    const parsed = JSON.parse(sessionData);
                    const sessionAge = Date.now() - parsed.timestamp;
                    const maxSessionAge = 24 * 60 * 60 * 1000; // 24 saat
                    
                    if (sessionAge < maxSessionAge && parsed.hasToken) {
                        // Get token from cookies as fallback
                        const getCookie = (name) => {
                            const value = `; ${document.cookie}`;
                            const parts = value.split(`; ${name}=`);
                            if (parts.length === 2) return parts.pop().split(';').shift();
                            return null;
                        };
                        
                        const token = getCookie('jwtToken');
                        if (token) {
                            console.log('Adding Authorization header with token');
                            config.headers.Authorization = `Bearer ${token}`;
                        } else {
                            console.log('No token found in cookies for Authorization header');
                        }
                    }
                } catch (error) {
                    console.error('Session data parse error:', error);
                }
            }
            
            // If FormData is being sent, don't set Content-Type header
            // Let the browser set it automatically with boundary
            if (config.data instanceof FormData) {
                delete config.headers['Content-Type'];
            }
            
            return config;
        },
        (error) => {
            return Promise.reject(error);
        }
    );

    const [hasJwtToken, sethasJwtToken] = useState(false)

    // Simple function to check if JWT token exists in cookies
    const checkJwtToken = () => {
        const getCookie = (name) => {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop().split(';').shift();
            return null;
        };
        
        // First check localStorage for session data (primary method)
        const sessionData = localStorage.getItem('admin_session_data');
        if (sessionData) {
            try {
                const parsed = JSON.parse(sessionData);
                const sessionAge = Date.now() - parsed.timestamp;
                const maxSessionAge = 24 * 60 * 60 * 1000; // 24 saat
                
                if (sessionAge < maxSessionAge && parsed.hasToken) {
                    console.log('Valid session found in localStorage');
                    sethasJwtToken(true);
                    return true;
                }
            } catch (error) {
                console.error('Session data parse error:', error);
            }
        }
        
        // Then check cookies as backup
        const jwtToken = getCookie('jwtToken');
        const hasToken = jwtToken && jwtToken.length > 10;
        
        console.log('=== Cookie Debug Info ===');
        console.log('Document cookie:', document.cookie);
        console.log('JWT Token check:', hasToken ? 'Found' : 'Not found');
        console.log('Cookie value:', jwtToken);
        console.log('Cookie length:', jwtToken ? jwtToken.length : 0);
        console.log('========================');
        
        if (hasToken) {
            console.log('Token found in cookies, updating localStorage');
            sethasJwtToken(true);
            localStorage.setItem('admin_session_data', JSON.stringify({
                timestamp: Date.now(),
                hasToken: true
            }));
            return true;
        }
        
        console.log('No valid session found');
        sethasJwtToken(false);
        return false;
    };

    // Function to set authentication status
    const setAuthStatus = (status) => {
        console.log('Setting auth status:', status);
        sethasJwtToken(status);
        
        // If setting to true, also store in localStorage for persistence
        if (status) {
            localStorage.setItem('admin_session_data', JSON.stringify({
                timestamp: Date.now(),
                hasToken: true
            }));
        } else {
            localStorage.removeItem('admin_session_data');
        }
    };

    // Function to clear authentication
    const clearAuth = () => {
        console.log('Clearing authentication');
        localStorage.removeItem('admin_session_data');
        localStorage.removeItem('userName');
        sethasJwtToken(false);
    };

    apiClient.interceptors.response.use(
        (response) => response,
        (error) => {
            console.log('API Error:', error.response?.status, error.response?.data);
            
            // Handle authentication errors
            if (error.response?.status === 401 || error.response?.status === 403) {
                console.log('Authentication error detected');
                
                // Check if we have a valid session before clearing auth
                const sessionData = localStorage.getItem('admin_session_data');
                if (sessionData) {
                    try {
                        const parsed = JSON.parse(sessionData);
                        const sessionAge = Date.now() - parsed.timestamp;
                        const maxSessionAge = 24 * 60 * 60 * 1000; // 24 saat
                        
                        if (sessionAge < maxSessionAge && parsed.hasToken) {
                            console.log('Valid session exists, this might be a server-side issue');
                            // Don't clear auth if we have a valid session
                            return Promise.reject(error);
                        }
                    } catch (error) {
                        console.error('Session data parse error:', error);
                    }
                }
                
                // Only clear auth if it's a real authentication error
                if (error.response?.data?.error && 
                    (error.response.data.error.includes('Yetkiniz yoxdur') || 
                     error.response.data.error.includes('Token') ||
                     error.response.data.error.includes('Icazə'))) {
                    clearAuth();
                    
                    // Only redirect if we're not already on the home page
                    if (window.location.pathname !== '/') {
                        toast.error('Səssiyanız bitib. Yenidən daxil olun.');
                        window.location.href = '/Sign';
                    }
                } else {
                    // For other 401/403 errors, just log them but don't clear auth
                    console.log('Server error, not clearing authentication');
                }
            }
            
            return Promise.reject(error);
        }
    );

    useEffect(() => {
        // Check JWT token on component mount
        checkJwtToken();
        
        // Check every 30 seconds
        const interval = setInterval(checkJwtToken, 30000);
        
        return () => clearInterval(interval);
    }, [])

    return (
        <ContextUser.Provider value={{
            apiClient,
            hasJwtToken,
            setAuthStatus,
            clearAuth,
            checkJwtToken
        }}>
            {
                children
            }
        </ContextUser.Provider>
    )
}

export default CheckUserContext
