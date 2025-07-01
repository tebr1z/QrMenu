import express from 'express';
import Auth from './routes/Auth.js';
import Category from './routes/Category.js';
import Product from './routes/Product.js';
import Contact from "./routes/Contact.js"
import TableRoutes from "./routes/Table.js";
import OrderRoutes from './routes/Order.js';
import TableSessionRoutes from './routes/TableSession.js';
const router = express.Router();

router.use('/Auth', Auth)
router.use('/Category', Category)
router.use("/Product", Product)
router.use("/Contact", Contact)
router.use('/table', TableRoutes);
router.use('/order', OrderRoutes);
router.use('/tablesession', TableSessionRoutes);
export default router;