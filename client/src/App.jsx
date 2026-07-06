import React from 'react'
import Header from './components/Header'
import { Routes, Route } from 'react-router-dom'

import { useLocation, Navigate } from 'react-router-dom'


import Home from './page/Home'
import Detail from './page/Detail'
import Navbar from './components/Navbar'
import CustomSetButton from './components/CustomSetButton'
import ComplaintBox from './components/ComplaintBox'
import Contact from './page/Contact'
import WorkTime from './page/WorkTime'
import Language from './page/Language'
import Sign from './page/Sign'
import Admin from './page/Admin'
import AdminCategory from './page/AdminCategory'
import AdminProduct from './page/AdminProduct'
import AdminMenu from './page/AdminMenu'
import AdminWelcome from './components/AdminComponents/AdminWelcome'
import AdminContact from './page/AdminContact'
import AdminTablePage from './components/AdminComponents/AdminTablePage'
import AdminTableManagePage from './components/AdminComponents/AdminTableManagePage'
import AdminAccountsPage from './components/AdminComponents/AdminAccountsPage'
import AdminSetRequests from './page/AdminSetRequests'
import AdminComplaints from './page/AdminComplaints'
import AdminStockControl from './page/AdminStockControl'
import TableStatus from './page/TableStatus'
import NotFound from './page/NotFound'
import AdminSoldProductsPage from './components/AdminComponents/AdminSoldProductsPage'
import AdminFinancePage from './components/AdminComponents/AdminFinancePage'
import RoleGuard from './components/AdminComponents/RoleGuard'
import AdminUsers from './page/AdminUsers'
import AdminSalesReport from './page/AdminSalesReport'
import AdminEmployeePayroll from './page/AdminEmployeePayroll'
import AdminAuditLog from './page/AdminAuditLog'
import AdminSetIngredients from './page/AdminSetIngredients'

const App = () => {
  const { pathname } = useLocation()

  const hideHeader = pathname.startsWith('/Sign') || pathname.startsWith('/Admin');
  const hideNavbar = hideHeader;

  return (
    <>
      {hideHeader ? null : <Header />}
      {!hideNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/Details/:name" element={<Detail />} />
        <Route path="/Contact" element={<Contact />} />
        <Route path="/WorkTime" element={<WorkTime />} />
        <Route path="/TableStatus" element={<TableStatus />} />
        {/* <Route path="/Language" element={<Language />} /> */}

        <Route path="/Sign" element={<Sign />} />
        <Route path="/Admin" element={<Admin />} >
          <Route index element={<RoleGuard routeKey="Welcome"><AdminWelcome /></RoleGuard>} />
          <Route path='Contact' element={<RoleGuard routeKey="Contact"><AdminContact /></RoleGuard>} />
          <Route path='Menu' element={<RoleGuard routeKey="Menu"><AdminMenu /></RoleGuard>} />
          <Route path="Category" element={<RoleGuard routeKey="Category"><AdminCategory /></RoleGuard>} />
          <Route path="Product" element={<RoleGuard routeKey="Product"><AdminProduct /></RoleGuard>} />
          <Route path="Tables" element={<RoleGuard routeKey="Tables"><AdminTablePage /></RoleGuard>} />
          <Route path="TableManage" element={<RoleGuard routeKey="TableManage"><AdminTableManagePage /></RoleGuard>} />
          <Route path="Accounts" element={<RoleGuard routeKey="Accounts"><AdminAccountsPage /></RoleGuard>} />
          <Route path="SoldProducts" element={<RoleGuard routeKey="SoldProducts"><AdminSoldProductsPage /></RoleGuard>} />
          <Route path="SalesReport" element={<RoleGuard routeKey="SalesReport"><AdminSalesReport /></RoleGuard>} />
          <Route path="EmployeePayroll" element={<RoleGuard routeKey="EmployeePayroll"><AdminEmployeePayroll /></RoleGuard>} />
          <Route path="Finance" element={<RoleGuard routeKey="Finance"><AdminFinancePage /></RoleGuard>} />
          <Route path="SetRequests" element={<RoleGuard routeKey="SetRequests"><AdminSetRequests /></RoleGuard>} />
          <Route path="Complaints" element={<RoleGuard routeKey="Complaints"><AdminComplaints /></RoleGuard>} />
          <Route path="StockControl" element={<RoleGuard routeKey="StockControl"><AdminStockControl /></RoleGuard>} />
          <Route path="SetIngredients" element={<RoleGuard routeKey="SetIngredients"><AdminSetIngredients /></RoleGuard>} />
          <Route path="Users" element={<RoleGuard routeKey="Users"><AdminUsers /></RoleGuard>} />
          <Route path="AuditLog" element={<RoleGuard routeKey="AuditLog"><AdminAuditLog /></RoleGuard>} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
      {!hideHeader && (
        <>
          <CustomSetButton />
          <ComplaintBox />
        </>
      )}
    </>
  )
}

export default App