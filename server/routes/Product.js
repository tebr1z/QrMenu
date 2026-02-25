import express from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { CheckToken } from '../middleware/CkeckToken.js';
import Product from '../model/ProductModal.js';
import Category from "../model/CategoryModal.js";
import Table from '../model/TableModal.js';

const router = express.Router();

router.get("/GetProduct", async (req, res) => {
    try {
        // Optimized: only select needed fields and populate category name
        const products = await Product.find({})
            .populate("category", "name image")
            .select("name price category description image imageId freeMinutes freeMinutesForPS order stockQuantity purchasePrice unitCost isSet setItems createdAt")
            .lean(); // Use lean() for better performance (returns plain JS objects)
        res.status(200).json(products)
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.log(error)
        }
        res.status(500).json({ error: 'Məhsullar alınarkən xəta baş verdi' });
    }
})

router.get("/GetProduct/:name", async (req, res) => {
    const { name } = req.params;
    try {
        const categoryId = await Category.findOne({ name }).select("_id").lean();
        if (!categoryId) {
            return res.status(404).json({ message: "Category not found" });
        }

        // Optimized: use lean() and select only needed fields
        const products = await Product.find({ category: categoryId._id })
            .populate("category", "name image")
            .select("name price category description image imageId freeMinutes freeMinutesForPS order stockQuantity purchasePrice unitCost isSet setItems createdAt")
            .sort({ order: 1, createdAt: -1 })
            .lean();

        res.status(200).json(products)

    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.log(error)
        }
        res.status(500).json({ message: "Məhsullar alınarkən xəta baş verdi" });
    }
});

// router.use(CheckToken);
router.post("/AddProduct", async (req, res) => {
    // Log the request for debugging
    console.log('=== AddProduct Request ===');
    console.log('Request body:', req.body);
    console.log('Request files:', req.files);
    console.log('Files keys:', req.files ? Object.keys(req.files) : 'No files');
    
    const { name, price, category, description, freeMinutes, freeMinutesForPS, stockQuantity, purchasePrice, isSet, setItems } = req.body;
    let imageProduct = req.files && req.files.imageProduct;
    let imageId = null;
    
    console.log('Extracted data:');
    console.log('- name:', name);
    console.log('- price:', price);
    console.log('- category:', category);
    console.log('- description:', description);
    console.log('- freeMinutes:', freeMinutes);
    console.log('- imageProduct:', imageProduct);

    if (!name || !price || !category) {
        return res.status(422).json({ error: "Zəhmət olmasa, ad, qiymət və kateqoriya seçin." });
    }

    if (imageProduct) {
        try {
            console.log('Uploading image to Cloudinary...');
            console.log('Image file:', imageProduct.name);
            console.log('Image temp path:', imageProduct.tempFilePath);
            console.log('Image size:', imageProduct.size, 'bytes');
            
            // Upload to Cloudinary
            const uploadImg = await cloudinary.uploader.upload(
                imageProduct.tempFilePath,
                {
                    use_filename: true,
                    folder: "Home",
                    resource_type: "auto",
                    transformation: [
                        { width: 800, height: 600, crop: "limit" }
                    ]
                }
            );

            console.log('Cloudinary upload successful:');
            console.log('URL:', uploadImg.url);
            console.log('Public ID:', uploadImg.public_id);
            console.log('Secure URL:', uploadImg.secure_url);
            
            // Use secure URL for better compatibility
            imageProduct = uploadImg.secure_url || uploadImg.url;
            imageId = uploadImg.public_id;
            
            console.log('Final image URL:', imageProduct);
            console.log('Final image ID:', imageId);
            
        } catch (error) {
            console.log('Image upload error:', error);
            console.log('Error details:', error.message);
            console.log('Error stack:', error.stack);
            return res.status(500).json({ error: "Şəkil yüklənərkən xəta baş verdi: " + error.message })
        }
    }

    try {
        console.log('Creating new product with data:');
        console.log('- name:', name);
        console.log('- price:', parseFloat(price));
        console.log('- category:', category);
        console.log('- description:', description || '');
        console.log('- image:', imageProduct ? imageProduct : undefined);
        console.log('- imageId:', imageId);
        console.log('- freeMinutes:', Number(freeMinutes) || 0);
        
        // Calculate unit cost
        const stockQty = Number(stockQuantity) || 0;
        const purchasePrc = Number(purchasePrice) || 0;
        const unitCost = stockQty > 0 && purchasePrc > 0 ? purchasePrc / stockQty : 0;

        // Parse setItems if provided
        let parsedSetItems = [];
        if (isSet && setItems) {
            try {
                parsedSetItems = typeof setItems === 'string' ? JSON.parse(setItems) : setItems;
            } catch (e) {
                console.error('Error parsing setItems:', e);
            }
        }

        const newProduct = new Product({
            name,
            price: parseFloat(price),
            category,
            description: description || '',
            image: imageProduct ? imageProduct : undefined,
            imageId,
            freeMinutes: Number(freeMinutes) || 0,
            freeMinutesForPS: freeMinutesForPS || null,
            stockQuantity: stockQty,
            purchasePrice: purchasePrc,
            unitCost: unitCost,
            isSet: isSet === 'true' || isSet === true,
            setItems: parsedSetItems,
        })

        await newProduct.save()
        
        // Populate category before sending response
        await newProduct.populate('category')
        
        console.log('Saved product from database:', newProduct);
        console.log('Product image field:', newProduct.image);
        console.log('Product imageId field:', newProduct.imageId);

        res.status(201).json({ message: "Məhsul əlavə edildi", newProduct })

    } catch (error) {
        console.log('AddProduct error:', error)
        return res.status(500).json({ error: "Məhsul əlavə edilərkən xəta baş verdi" })
    }
})

router.put("/UpdateProduct/:id", async (req, res) => {
    const { id } = req.params;
    
    // Log the request for debugging
    console.log('=== UpdateProduct Request ===');
    console.log('Product ID:', req.params.id);
    console.log('Request body:', req.body);
    console.log('Request files:', req.files);
    console.log('Files keys:', req.files ? Object.keys(req.files) : 'No files');
    
    const { name, price, category, description, freeMinutes, freeMinutesForPS, stockQuantity, purchasePrice, isSet, setItems } = req.body;
    const imageProduct = req.files && req.files.imageProduct;
    let updateProduct = {};
    
    console.log('Extracted data:');
    console.log('- id:', id);
    console.log('- name:', name);
    console.log('- price:', price);
    console.log('- category:', category);
    console.log('- description:', description);
    console.log('- freeMinutes:', freeMinutes);
    console.log('- freeMinutesForPS:', freeMinutesForPS);
    console.log('- imageProduct:', imageProduct);

    if (!name || !price || !category) {
        return res.status(422).json({ error: "Zəhmət olmasa, ad, qiymət və kateqoriya seçin." });
    } else {
        updateProduct.name = name;
        updateProduct.price = parseFloat(price);
        updateProduct.category = category;
        updateProduct.description = description || '';
        updateProduct.freeMinutes = Number(freeMinutes) || 0;
        updateProduct.freeMinutesForPS = freeMinutesForPS || null;
        
        // Calculate unit cost
        const stockQty = Number(stockQuantity) || 0;
        const purchasePrc = Number(purchasePrice) || 0;
        updateProduct.stockQuantity = stockQty;
        updateProduct.purchasePrice = purchasePrc;
        updateProduct.unitCost = stockQty > 0 && purchasePrc > 0 ? purchasePrc / stockQty : 0;
        
        // Parse setItems if provided
        if (isSet !== undefined) {
            updateProduct.isSet = isSet === 'true' || isSet === true;
            if (setItems) {
                try {
                    updateProduct.setItems = typeof setItems === 'string' ? JSON.parse(setItems) : setItems;
                } catch (e) {
                    console.error('Error parsing setItems:', e);
                    updateProduct.setItems = [];
                }
            }
        }
    }

    if (imageProduct) {
        const productImg = await Product.findById(id)
        try {
            console.log('Updating product image...');
            console.log('Old image ID:', productImg?.imageId);
            
            // Delete old image from Cloudinary if exists
            if (productImg && productImg.imageId) {
                console.log('Deleting old image from Cloudinary...');
                await cloudinary.uploader.destroy(productImg.imageId);
                console.log('Old image deleted successfully');
            }

            // Upload new image to Cloudinary
            console.log('Uploading new image to Cloudinary...');
            const uploadImg = await cloudinary.uploader.upload(
                imageProduct.tempFilePath,
                {
                    use_filename: true,
                    folder: "Home",
                    resource_type: "auto",
                    transformation: [
                        { width: 800, height: 600, crop: "limit" }
                    ]
                }
            );
            
            console.log('New image upload successful:');
            console.log('URL:', uploadImg.url);
            console.log('Public ID:', uploadImg.public_id);
            console.log('Secure URL:', uploadImg.secure_url);
            
            // Use secure URL for better compatibility
            updateProduct.image = uploadImg.secure_url || uploadImg.url;
            updateProduct.imageId = uploadImg.public_id;
            
            console.log('Final update image URL:', updateProduct.image);
            console.log('Final update image ID:', updateProduct.imageId);

        } catch (error) {
            console.log('Image upload error:', error);
            console.log('Error details:', error.message);
            console.log('Error stack:', error.stack);
            return res.status(500).json({ error: "Şəkil yüklənərkən xəta baş verdi: " + error.message })
        }
    }

    try {
        console.log('Final updateProduct object before database update:', updateProduct);
        
        const product = await Product.findByIdAndUpdate(
            { _id: id },
            { $set: updateProduct },
            { new: true }
        ).populate('category')

        if (!product) {
            return res.status(404).json({ error: "Məhsul tapılmadı" })
        }

        console.log('Updated product from database:', product);
        console.log('Product image field:', product.image);
        console.log('Product imageId field:', product.imageId);

        res.status(200).json({ message: "Məhsul yeniləndi", product })

    } catch (error) {
        console.log('UpdateProduct error:', error)
        return res.status(500).json({ error: "Məhsul yenilənərkən xəta baş verdi" })
    }
})

router.delete("/DeleteProduct/:id", async (req, res) => {
    const { id } = req.params;
    try {

        const productImg = await Product.findById(id)

        if (!productImg) {
            return res.status(404).json({ error: "Məhsul tapılmadı" })
        }

        if (productImg.imageId) {
            await cloudinary.uploader.destroy(productImg.imageId)
        }
        // ------------------------------
        const product = await Product.findByIdAndDelete(id)

        if (!product) {
            return res.status(404).json({ error: "Məhsul tapılmadı" })
        }

        res.status(200).json({ message: "Məhsul silindi", product })

    } catch (error) {
        console.log(error)
        return res.status(500).json({ error: "Məhsul silinərkən xəta baş verdi" })
    }
})

router.get('/GetTables', async (req, res) => {
    try {
        const tables = await Table.find({});
        res.status(200).json(tables);
    } catch (error) {
        res.status(500).json({ error: "Masalar alınarkən xəta baş verdi" });
    }
});

router.post('/AddTable', async (req, res) => {
    const { name, hourlyPrice, extraItems } = req.body;
    if (!name || hourlyPrice === undefined) {
        return res.status(400).json({ error: "Masa adı və saatlıq qiymət tələb olunur" });
    }
    try {
        let parsedExtraItems = [];
        if (Array.isArray(extraItems)) {
            parsedExtraItems = extraItems;
        } else if (typeof extraItems === 'string') {
            try {
                parsedExtraItems = JSON.parse(extraItems);
            } catch (err) {
                parsedExtraItems = [];
            }
        }
        const newTable = new Table({ name, hourlyPrice, extraItems: parsedExtraItems });
        await newTable.save();
        res.status(201).json({ message: "Masa əlavə olundu", newTable });
    } catch (error) {
        res.status(500).json({ error: "Masa əlavə edilərkən xəta baş verdi" });
    }
});

router.delete('/DeleteTable/:id', async (req, res) => {
    try {
        const table = await Table.findByIdAndDelete(req.params.id);
        if (!table) return res.status(404).json({ error: "Masa tapılmadı" });
        res.status(200).json({ message: "Masa silindi", table });
    } catch (error) {
        res.status(500).json({ error: "Masa silinərkən xəta baş verdi" });
    }
});

router.put('/UpdateTable/:id', async (req, res) => {
    const { name, hourlyPrice, extraItems } = req.body;
    try {
        let parsedExtraItems;
        if (Array.isArray(extraItems)) {
            parsedExtraItems = extraItems;
        } else if (typeof extraItems === 'string') {
            try {
                parsedExtraItems = JSON.parse(extraItems);
            } catch (err) {
                parsedExtraItems = undefined;
            }
        }
        const table = await Table.findByIdAndUpdate(
            req.params.id,
            { name, hourlyPrice, ...(parsedExtraItems !== undefined ? { extraItems: parsedExtraItems } : {}) },
            { new: true }
        );
        if (!table) return res.status(404).json({ error: "Masa tapılmadı" });
        res.status(200).json({ message: "Masa yeniləndi", table });
    } catch (error) {
        res.status(500).json({ error: "Masa yenilənərkən xəta baş verdi" });
    }
});

// Update product order within category
router.put("/UpdateProductOrder", async (req, res) => {
    try {
        const { products, categoryId } = req.body;
        
        if (!products || !Array.isArray(products)) {
            return res.status(400).json({ error: "Məhsul siyahısı tələb olunur" });
        }

        if (!categoryId) {
            return res.status(400).json({ error: "Kateqoriya ID tələb olunur" });
        }

        // Optimized: Use bulk operations instead of individual updates
        const bulkOps = products.map((product, i) => ({
            updateOne: {
                filter: { _id: product._id },
                update: { $set: { order: i } }
            }
        }));

        await Product.bulkWrite(bulkOps);

        res.status(200).json({ message: "Məhsul sırası yeniləndi" });
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.log('Update product order error:', error);
        }
        res.status(500).json({ error: "Məhsul sırası yenilənərkən xəta baş verdi" });
    }
});

export default router