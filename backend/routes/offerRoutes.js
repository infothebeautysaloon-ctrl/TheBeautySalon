const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

const {
    getAllOffers,
    getTodayOffer,
    getOfferByDay,
    saveOffer,
    deleteOffer
} = require("../controllers/offerController");


/* =========================================================
   UPLOAD DIRECTORY
========================================================= */

const uploadDirectory = path.join(
    __dirname,
    "../../frontend/assets/images/offers"
);


/* =========================================================
   CREATE UPLOAD DIRECTORY IF NOT EXISTS
========================================================= */

if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, {
        recursive: true
    });
}


/* =========================================================
   MULTER STORAGE
========================================================= */

const storage = multer.diskStorage({

    destination: (req, file, cb) => {

        cb(
            null,
            uploadDirectory
        );

    },

    filename: (req, file, cb) => {

        const day = String(
            req.params.day || "offer"
        )
            .trim()
            .toLowerCase();

        const extension = path
            .extname(file.originalname)
            .toLowerCase();

        cb(
            null,
            `${day}${extension}`
        );

    }

});


/* =========================================================
   FILE FILTER
========================================================= */

const fileFilter = (req, file, cb) => {

    const allowedExtensions = [
        ".jpg",
        ".jpeg",
        ".png",
        ".webp",
        ".gif"
    ];

    const extension = path
        .extname(file.originalname)
        .toLowerCase();

    if (
        allowedExtensions.includes(extension)
    ) {

        cb(null, true);

    } else {

        cb(
            new Error(
                "Only JPG, JPEG, PNG, WEBP and GIF images are allowed."
            )
        );

    }

};


/* =========================================================
   MULTER CONFIGURATION
========================================================= */

const upload = multer({

    storage: storage,

    fileFilter: fileFilter,

    limits: {
        fileSize: 5 * 1024 * 1024
    }

});


/* =========================================================
   ROUTES
========================================================= */

/*
   IMPORTANT:
   /today MUST COME BEFORE /:day
*/

router.get(
    "/today",
    getTodayOffer
);


/* GET ALL OFFERS */

router.get(
    "/",
    getAllOffers
);


/* GET OFFER BY DAY */

router.get(
    "/:day",
    getOfferByDay
);


/* CREATE / UPDATE OFFER IMAGE */

router.put(
    "/:day",
    upload.single("image"),
    saveOffer
);


/* DELETE OFFER IMAGE + DATABASE RECORD */

router.delete(
    "/:day",
    deleteOffer
);


/* =========================================================
   EXPORT ROUTER
========================================================= */

module.exports = router;