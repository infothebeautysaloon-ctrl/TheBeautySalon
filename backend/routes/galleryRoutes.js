
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

const {
    getAllGalleryImages,
    getGalleryImageById,
    createGalleryImage,
    updateGalleryImage,
    deleteGalleryImage
} = require("../controllers/galleryController");

// Upload directory
const uploadDirectory = path.join(
    __dirname,
    "../uploads/gallery"
);

if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, {
        recursive: true
    });
}

// Supported image formats
const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/bmp",
    "image/x-ms-bmp",
    "image/avif"
];

const allowedExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".bmp",
    ".avif"
];

// File storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDirectory);
    },

    filename: (req, file, cb) => {
        const extension = path
            .extname(file.originalname)
            .toLowerCase();

        const originalName = path
            .basename(file.originalname, extension)
            .replace(/[^a-zA-Z0-9_-]/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "")
            .toLowerCase();

        const safeName = originalName || "gallery-image";

        const filename =
            `${Date.now()}-${safeName}${extension}`;

        cb(null, filename);
    }
});

// Validate uploaded file
const fileFilter = (req, file, cb) => {
    const extension = path
        .extname(file.originalname)
        .toLowerCase();

    if (
        allowedMimeTypes.includes(file.mimetype) &&
        allowedExtensions.includes(extension)
    ) {
        return cb(null, true);
    }

    cb(
        new Error(
            "Unsupported image format. Use JPG, JPEG, PNG, WEBP, GIF, BMP or AVIF."
        )
    );
};

// Multer configuration
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1
    }
});

// Gallery APIs
router.get("/", getAllGalleryImages);

router.get("/:id", getGalleryImageById);

router.post(
    "/",
    upload.single("image"),
    createGalleryImage
);

router.put(
    "/:id",
    upload.single("image"),
    updateGalleryImage
);

router.delete("/:id", deleteGalleryImage);

// Upload error handling
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({
                success: false,
                message: "Image size must be 5 MB or less."
            });
        }

        return res.status(400).json({
            success: false,
            message: error.message
        });
    }

    if (error) {
        return res.status(400).json({
            success: false,
            message: error.message || "Image upload failed."
        });
    }

    next();
});

module.exports = router;
