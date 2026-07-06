import express from 'express';
import Auth from './routes/Auth.js';
import Category from './routes/Category.js';
import Product from './routes/Product.js';
import Contact from "./routes/Contact.js"
import TableRoutes from "./routes/Table.js";
import OrderRoutes from './routes/Order.js';
import TableSessionRoutes from './routes/TableSession.js';
import FeedbackRoutes from './routes/Feedback.js';
import StockRoutes from './routes/Stock.js';
import ExtraServiceRoutes from './routes/ExtraService.js';
import ExpenseRoutes from './routes/Expense.js';
import ConfigRoutes from './routes/Config.js';
import SetRequestRoutes from './routes/SetRequest.js';
import ComplaintRoutes from './routes/Complaint.js';
import EmployeeRoutes from './routes/Employee.js';
import AuditLogRoutes from './routes/AuditLog.js';
const router = express.Router();

router.use('/Auth', Auth)
router.use('/Category', Category)
router.use("/Product", Product)
router.use("/Contact", Contact)
router.use('/table', TableRoutes);
router.use('/order', OrderRoutes);
router.use('/tablesession', TableSessionRoutes);
router.use('/feedback', FeedbackRoutes);
router.use('/stock', StockRoutes);
router.use('/extraservice', ExtraServiceRoutes);
router.use('/expense', ExpenseRoutes);
router.use('/config', ConfigRoutes);
router.use('/setrequest', SetRequestRoutes);
router.use('/complaint', ComplaintRoutes);
router.use('/employee', EmployeeRoutes);
router.use('/audit', AuditLogRoutes);
export default router;