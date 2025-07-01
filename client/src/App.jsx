import React from 'react'
import Header from './components/Header'
import { Routes, Route } from 'react-router-dom'

import { useLocation, Navigate } from 'react-router-dom'


import Home from './page/Home'
import Detail from './page/Detail'
import Navbar from './components/Navbar'
import Contact from './page/Contact'
import WorkTime from './page/WorkTime'
import Language from './page/Language'
import Sign from './page/Sign'
import Admin from './page/Admin'
import AdminCategory from './page/AdminCategory'
import AdminProduct from './page/AdminProduct'
import AdminMenu from './page/AdminMenu'
import AdminWelcome from './components/AdminComponents/AdminWelcome'
import CheckUserContext from './context/CheckUserContext'
import axios from "axios"
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AdminContext from './context/AdminContext'
import AdminContact from './page/AdminContact'
import AdminTablePage from './components/AdminComponents/AdminTablePage'
import AdminTableManagePage from './components/AdminComponents/AdminTableManagePage'
import AdminAccountsPage from './components/AdminComponents/AdminAccountsPage'

axios.defaults.withCredentials = true;

const App = () => {
  const { pathname } = useLocation()

  const hideHeader = pathname.startsWith('/Sign') || pathname.startsWith('/Admin');

  return (
    <>

      <CheckUserContext>
        <AdminContext>
          {
            hideHeader ? null : <Header />
          }
          <ToastContainer />
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/Details/:name" element={<Detail />} />
            <Route path="/Contact" element={<Contact />} />
            <Route path="/WorkTime" element={<WorkTime />} />
            {/* <Route path="/Language" element={<Language />} /> */}

            <Route path="/Sign" element={<Sign />} />
            <Route path="/Admin" element={<Admin />} >
              <Route index element={<AdminWelcome />} />
              <Route path='Contact' element={<AdminContact />} />
              <Route path='Menu' element={<AdminMenu />} />
              <Route path="Category" element={<AdminCategory />} />
              <Route path="Product" element={<AdminProduct />} />
              <Route path="Tables" element={<AdminTablePage />} />
              <Route path="TableManage" element={<AdminTableManagePage />} />
              <Route path="Accounts" element={<AdminAccountsPage />} />
            </Route>
          </Routes>
        </AdminContext>
      </CheckUserContext >
    </>

  )
}

export default App