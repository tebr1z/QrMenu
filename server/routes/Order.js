import express from 'express';
import Order from '../model/OrderModal.js';
import Product from '../model/ProductModal.js';

const router = express.Router();

// Bütün sifarişləri al və ya tarixə / intervala görə filtrlə
router.get('/GetOrders', async (req, res) => {
    try {
        const { date, from, to } = req.query;
        const query = {};

        if (date) {
            // YYYY-MM-DD formatında gəlir
            const start = new Date(date);
            const end = new Date(date);
            end.setDate(end.getDate() + 1);
            query.createdAt = { $gte: start, $lt: end };
        } else if (from || to) {
            const start = from ? new Date(from) : new Date('1970-01-01');
            const end = to ? new Date(to) : new Date('2999-12-31');
            query.createdAt = { $gte: start, $lt: end };
        }

        const orders = await Order.find(query).sort({ createdAt: -1 });
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ error: 'Sifarişlər alınarkən xəta baş verdi' });
    }
});

// Yeni sifariş əlavə et
router.post('/AddOrder', async (req, res) => {
    try {
        const { tableId, startTime, endTime, orderId } = req.body;
        
        // Optimized duplicate check - single query with $or
        const duplicateQuery = orderId 
            ? { $or: [{ orderId: orderId }, { tableId, startTime: { $gte: startTime - 10000, $lte: startTime + 10000 }, endTime: { $gte: endTime - 10000, $lte: endTime + 10000 } }] }
            : { tableId, startTime: { $gte: startTime - 10000, $lte: startTime + 10000 }, endTime: { $gte: endTime - 10000, $lte: endTime + 10000 } };
        
        const existingOrder = await Order.findOne(duplicateQuery);
        
        if (existingOrder) {
            return res.status(409).json({ 
                error: 'Bu sifariş artıq yaradılıb', 
                order: existingOrder 
            });
        }
        
        const order = new Order(req.body);
        await order.save();
        
        // Stokdan düş - optimized with bulk operations (N+1 problem fixed)
        if (order.selectedMenu && Array.isArray(order.selectedMenu) && order.selectedMenu.length > 0) {
            // Collect all product IDs first
            const productIds = order.selectedMenu
                .map(item => item._id || item.id)
                .filter(id => id);
            
            if (productIds.length > 0) {
                // Fetch all products in one query (bulk operation)
                const products = await Product.find({ _id: { $in: productIds } });
                const productMap = new Map(products.map(p => [p._id.toString(), p]));
                
                // Collect all set item product IDs
                const setProductIds = new Set();
                products.forEach(product => {
                    if (product.isSet && product.setItems && product.setItems.length > 0) {
                        product.setItems.forEach(setItem => {
                            if (setItem.productId) {
                                setProductIds.add(setItem.productId.toString());
                            }
                        });
                    }
                });
                
                // Fetch all set products in one query
                let setProducts = [];
                if (setProductIds.size > 0) {
                    setProducts = await Product.find({ _id: { $in: Array.from(setProductIds) } });
                }
                const setProductMap = new Map(setProducts.map(p => [p._id.toString(), p]));
                
                // Prepare bulk update operations
                const bulkOps = [];
                
                // Process each ordered item
                for (const item of order.selectedMenu) {
                    const productId = item._id || item.id;
                    if (!productId) continue;
                    
                    const product = productMap.get(productId.toString());
                    if (!product) continue;
                    
                    // Handle set products
                    if (product.isSet && product.setItems && product.setItems.length > 0) {
                        for (const setItem of product.setItems) {
                            const setProductId = setItem.productId?.toString();
                            if (!setProductId) continue;
                            
                            const setProduct = setProductMap.get(setProductId);
                            if (setProduct && setProduct.stockQuantity >= setItem.quantity) {
                                bulkOps.push({
                                    updateOne: {
                                        filter: { _id: setProduct._id },
                                        update: { $inc: { stockQuantity: -setItem.quantity } }
                                    }
                                });
                            }
                        }
                    }
                    
                    // Decrement main product stock
                    if (product.stockQuantity > 0) {
                        bulkOps.push({
                            updateOne: {
                                filter: { _id: product._id },
                                update: { $inc: { stockQuantity: -1 } }
                            }
                        });
                    }
                }
                
                // Execute all updates in one bulk operation
                if (bulkOps.length > 0) {
                    await Product.bulkWrite(bulkOps);
                }
            }
        }
        
        res.status(201).json({ message: 'Sifariş əlavə olundu', order });
    } catch (error) {
        // Log error for debugging but don't expose details to client
        if (process.env.NODE_ENV === 'development') {
            console.error('AddOrder error:', error);
        }
        res.status(500).json({ error: 'Sifariş əlavə edilərkən xəta baş verdi' });
    }
});

// Sifarişi sil (müvəqqəti funksiya duplicate-ləri silmək üçün)
router.delete('/:id', async (req, res) => {
    try {
        const order = await Order.findByIdAndDelete(req.params.id);
        if (!order) {
            return res.status(404).json({ error: 'Sifariş tapılmadı' });
        }
        res.status(200).json({ message: 'Sifariş silindi', order });
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('DeleteOrder error:', error);
        }
        res.status(500).json({ error: 'Sifariş silinərkən xəta baş verdi' });
    }
});

export default router; 