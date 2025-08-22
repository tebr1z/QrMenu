import express from 'express';
import cloudinary from 'cloudinary';
import { CheckToken } from '../middleware/CkeckToken.js';
import Product from '../model/ProductModal.js';
import Category from "../model/CategoryModal.js";
import Table from '../model/TableModal.js';

const router = express.Router();

router.get("/GetProduct", async (req, res) => {
    try {
        const products = await Product.find({}).populate("category")
        res.status(200).json(products)
    } catch (error) {
        console.log(error)
    }
})

router.get("/GetProduct/:name", async (req, res) => {
    const { name } = req.params;
    try {
        const categoryId = await Category.findOne({ name })
        if (!categoryId) {
            return res.status(404).json({ message: "Category not found" });
        }

        const products = await Product.find({ category: categoryId._id })
            .populate("category")
            .sort({ order: 1, createdAt: -1 });

        res.status(200).json(products)

    } catch (error) {
        console.log(error)
        res.status(404).json({ message: "Product not found" });
    }
});

// router.use(CheckToken);
router.post("/AddProduct", async (req, res) => {
    // Log the request for debugging
    console.log('AddProduct request body:', req.body);
    console.log('AddProduct request files:', req.files);
    
    const { name, price, category, description, freeMinutes } = req.body;
    let imageProduct = req.files && req.files.imageProduct;
    let imageId = null;

    if (!name || !price || !category) {
        return res.status(422).json({ error: "Zəhmət olmasa, ad, qiymət və kateqoriya seçin." });
    }

    if (imageProduct) {
        try {
            const uploadImg = await cloudinary.uploader.upload(
                imageProduct.tempFilePath,
                {
                    use_filename: true,
                    folder: "Home",
                }
            );

            imageProduct = uploadImg.url;
            imageId = uploadImg.public_id;
        } catch (error) {
            console.log('Image upload error:', error)
            return res.status(500).json({ error: "Şəkil yüklənərkən xəta baş verdi" })
        }
    }

    try {
        const newProduct = new Product({
            name,
            price: parseFloat(price),
            category,
            description: description || '',
            image: imageProduct ? imageProduct : undefined,
            imageId,
            freeMinutes: Number(freeMinutes) || 0,
        })

        await newProduct.save()
        
        // Populate category before sending response
        await newProduct.populate('category')

        res.status(201).json({ message: "Məhsul əlavə edildi", newProduct })

    } catch (error) {
        console.log('AddProduct error:', error)
        return res.status(500).json({ error: "Məhsul əlavə edilərkən xəta baş verdi" })
    }
})

router.put("/UpdateProduct/:id", async (req, res) => {
    const { id } = req.params;
    
    // Log the request for debugging
    console.log('UpdateProduct request body:', req.body);
    console.log('UpdateProduct request files:', req.files);
    
    const { name, price, category, description, freeMinutes } = req.body;
    const imageProduct = req.files && req.files.imageProduct;
    let updateProduct = {};

    if (!name || !price || !category) {
        return res.status(422).json({ error: "Zəhmət olmasa, ad, qiymət və kateqoriya seçin." });
    } else {
        updateProduct.name = name;
        updateProduct.price = parseFloat(price);
        updateProduct.category = category;
        updateProduct.description = description || '';
        updateProduct.freeMinutes = Number(freeMinutes) || 0;
    }

    if (imageProduct) {
        const productImg = await Product.findById(id)
        try {
            if (productImg && productImg.imageId) {
                await cloudinary.uploader.destroy(productImg.imageId)
            }

            const uploadImg = await cloudinary.uploader.upload(
                imageProduct.tempFilePath,
                {
                    use_filename: true,
                    folder: "Home",
                }
            )
            updateProduct.image = uploadImg.url;
            updateProduct.imageId = uploadImg.public_id;

        } catch (error) {
            console.log('Image upload error:', error)
            return res.status(500).json({ error: "Şəkil yüklənərkən xəta baş verdi" })
        }
    }

    try {
        const product = await Product.findByIdAndUpdate(
            { _id: id },
            { $set: updateProduct },
            { new: true }
        ).populate('category')

        if (!product) {
            return res.status(404).json({ error: "Məhsul tapılmadı" })
        }

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
    const { name, hourlyPrice } = req.body;
    if (!name || hourlyPrice === undefined) {
        return res.status(400).json({ error: "Masa adı və saatlıq qiymət tələb olunur" });
    }
    try {
        const newTable = new Table({ name, hourlyPrice });
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
    const { name, hourlyPrice } = req.body;
    try {
        const table = await Table.findByIdAndUpdate(
            req.params.id,
            { name, hourlyPrice },
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
        
        console.log('Received products for order update:', products);
        console.log('Category ID:', categoryId);
        
        if (!products || !Array.isArray(products)) {
            return res.status(400).json({ error: "Məhsul siyahısı tələb olunur" });
        }

        if (!categoryId) {
            return res.status(400).json({ error: "Kateqoriya ID tələb olunur" });
        }

        // Update each product's order within the category
        for (let i = 0; i < products.length; i++) {
            const product = products[i];
            console.log(`Updating product ${product._id} with order ${i}`);
            await Product.findByIdAndUpdate(
                product._id,
                { order: i },
                { new: true }
            );
        }

        console.log('Product order updated successfully');
        res.status(200).json({ message: "Məhsul sırası yeniləndi" });
    } catch (error) {
        console.log('Update product order error:', error);
        res.status(500).json({ error: "Məhsul sırası yenilənərkən xəta baş verdi" });
    }
});

export default router