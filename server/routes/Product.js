import express from 'express';
import cloudinary from 'cloudinary';
import { CheckToken } from '../middleware/CkeckToken.js';
import Product from '../model/ProductModal.js';
import Category from "../model/CategoryModal.js";

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

        const products = await Product.find({ category: categoryId._id }).populate("category")

        res.status(200).json(products)

    } catch (error) {
        console.log(error)
        res.status(404).json({ message: "Product not found" });
    }
});

router.use(CheckToken);
router.post("/AddProduct", async (req, res) => {
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
            console.log(error)
            return res.status(500).json({ error: "Şəkil yüklənərkən xəta baş verdi" })
        }
    }

    try {

        const newProduct = new Product({
            name,
            price,
            category,
            description,
            image: imageProduct ? imageProduct : undefined,
            imageId,
            freeMinutes: Number(freeMinutes) || 0,
        })

        await newProduct.save()

        res.status(201).json({ message: "Məhsul əlavə edildi", newProduct })

    } catch (error) {
        console.log(error)
        return res.status(500).json({ error: "Məhsul əlavə edilərkən xəta baş verdi" })
    }
})

router.put("/UpdateProduct/:id", async (req, res) => {
    const { id } = req.params;
    const { name, price, category, description, freeMinutes } = req.body;
    const imageProduct = req.files && req.files.imageProduct;
    let updateProduct = {};

    if (!name || !price || !category) {
        return res.status(422).json({ error: "Zəhmət olmasa, ad, qiymət və kateqoriya seçin." });
    } else {
        updateProduct.name = name;
        updateProduct.price = price;
        updateProduct.category = category;
        updateProduct.description = description;
        updateProduct.freeMinutes = Number(freeMinutes) || 0;
    }


    if (imageProduct) {
        const productImg = await Product.findById(id)
        try {
            if (productImg.imageId) {
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
            console.log(error)
            return res.status(500).json({ error: "Şəkil yüklənərkən xəta baş verdi" })
        }
    }


    try {

        const product = await Product.findByIdAndUpdate(
            {
                _id: id,
            },
            {
                $set: updateProduct
            },
            { new: true }
        )

        if (!product) {
            return res.status(404).json({ error: "Məhsul tapılmadı" })
        }

        res.status(200).json({ message: "Məhsul yeniləndi", product })

    } catch (error) {
        console.log(error)
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

export default router