import express from 'express';
import { CheckToken } from '../middleware/CkeckToken.js';
import Category from '../model/CategoryModal.js';
import cloudinary from "cloudinary";
const router = express.Router();


router.get("/GetCategory", async (req, res) => {
    try {
        const categories = await Category.find({})
        // .sort({ createdAt: -1 });
        res.status(200).json(categories);
    } catch (error) {
        console.log(error)
    }
})

router.use(CheckToken);

router.post("/AddCategory", async (req, res) => {
    const { name } = req.body;
    let imageCategory = req.files && req.files.imageCategory;
    let imageId = null;
    if (!name) {
        return res.status(422).json({ error: "Zəhmət olmasa, bir ad daxil edin" });
    }

    if (imageCategory) {
        try {
            const uploadImg = await cloudinary.uploader.upload(
                imageCategory.tempFilePath,
                {
                    use_filename: true,
                    folder: "Home",
                }
            );
            imageCategory = uploadImg.url;
            imageId = uploadImg.public_id;
        } catch (error) {
            console.log(error);
            return res.status(500).json({ error: "Şəkil yüklənərkən xəta baş verdi" });
        }
    }

    try {
        const newCategory = new Category({
            name,
            image: imageCategory ? imageCategory : undefined,
            imageId
        });
        await newCategory.save();
        res.status(201).json({ message: "Kateqoriya əlavə edildi", newCategory });
    } catch (error) {
        console.log(error)
    }
})

router.put("/UpdateCategory/:id", async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    let imageCategory = req.files && req.files.imageCategory;

    let updateCategory = {};

    if (name) {
        updateCategory.name = name;
    } else {
        return res.status(422).json({ error: "Zəhmət olmasa, bir ad daxil edin" });
    }
    if (imageCategory) {

        const categoryImage = await Category.findById(id);

        try {

            if (categoryImage.imageId) {
                await cloudinary.uploader.destroy(categoryImage.imageId);
            }

            const uploadImg = await cloudinary.uploader.upload(
                imageCategory.tempFilePath,
                {
                    use_filename: true,
                    folder: "Home",
                }
            );

            imageCategory = uploadImg.url;
            updateCategory.image = imageCategory;
            updateCategory.imageId = uploadImg.public_id;
        } catch (error) {
            console.log(error);
            return res.status(500).json({ error: "Şəkil yüklənərkən xəta baş verdi" });
        }
    }


    try {

        const category = await Category.findByIdAndUpdate(
            {
                _id: id,
            },
            {
                $set: updateCategory
            },
            { new: true }
        );

        if (!category) {
            return res.status(404).json({ message: "Kateqoriya tapılmadı" });
        }

        res.status(200).json({ message: " Kateqoriya yeniləndi", category });

    } catch (error) {
        console.log(error)
        return res.status(500).json({ error: "Server xətası" });
    }


})

router.delete("/DeleteCategory/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const categoryImage = await Category.findById(id);

        if (!categoryImage) {
            return res.status(404).json({ message: "Kateqoriya tapılmadı" });
        }

        if (categoryImage.imageId) {
            await cloudinary.uploader.destroy(categoryImage.imageId);
        }

        const category = await Category.findByIdAndDelete(id);
        if (!category) {
            return res.status(404).json({ message: "Kateqoriya tapılmadı" });
        }
        res.status(200).json({ message: "Kateqoriya silindi" });
    } catch (error) {
        console.log(error)
    }
})




export default router;