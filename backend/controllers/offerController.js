const fs = require("fs");
const path = require("path");

const pool = require("../config/database");

const db = pool.promise();


/* =========================================================
   DAYS
========================================================= */

const DAYS = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
];


/* =========================================================
   OFFERS IMAGE DIRECTORY
========================================================= */

const OFFERS_IMAGE_DIRECTORY = path.join(
    __dirname,
    "../../frontend/assets/images/offers"
);


/* =========================================================
   ENSURE IMAGE DIRECTORY EXISTS
========================================================= */

function ensureImageDirectory() {

    if (!fs.existsSync(OFFERS_IMAGE_DIRECTORY)) {

        fs.mkdirSync(
            OFFERS_IMAGE_DIRECTORY,
            {
                recursive: true
            }
        );

    }

}


/* =========================================================
   DELETE IMAGE FILE
========================================================= */

function deleteImageFile(filename) {

    if (!filename) {
        return;
    }


    /*
       Only use the filename part.

       This prevents paths such as:
       ../../something
       from being used accidentally.
    */

    const safeFilename = path.basename(
        String(filename)
    );


    const filePath = path.join(
        OFFERS_IMAGE_DIRECTORY,
        safeFilename
    );


    if (fs.existsSync(filePath)) {

        fs.unlinkSync(filePath);

        console.log(
            `🗑️ Offer image deleted: ${safeFilename}`
        );

    }

}


/* =========================================================
   GET ALL OFFERS
========================================================= */

const getAllOffers = async (req, res) => {

    try {

        const [rows] = await db.query(
            `
            SELECT
                id,
                day,
                image,
                status,
                created_at
            FROM offer_images
            ORDER BY FIELD(
                day,
                'Sunday',
                'Monday',
                'Tuesday',
                'Wednesday',
                'Thursday',
                'Friday',
                'Saturday'
            )
            `
        );


        return res.status(200).json({

            success: true,

            count: rows.length,

            data: rows

        });


    } catch (error) {

        console.error(
            "❌ Get Offers Error:",
            error
        );


        return res.status(500).json({

            success: false,

            message: "Failed to fetch offers.",

            error: error.message

        });

    }

};


/* =========================================================
   GET TODAY'S OFFER
========================================================= */

const getTodayOffer = async (req, res) => {

    try {

        const today = DAYS[
            new Date().getDay()
        ];


        const [rows] = await db.query(
            `
            SELECT
                id,
                day,
                image,
                status,
                created_at
            FROM offer_images
            WHERE day = ?
              AND status = 'ACTIVE'
            LIMIT 1
            `,
            [today]
        );


        if (rows.length === 0) {

            return res.status(404).json({

                success: false,

                message:
                    `No active offer found for ${today}.`,

                day: today

            });

        }


        return res.status(200).json({

            success: true,

            day: today,

            data: rows[0]

        });


    } catch (error) {

        console.error(
            "❌ Get Today's Offer Error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Failed to fetch today's offer.",

            error: error.message

        });

    }

};


/* =========================================================
   GET OFFER BY DAY
========================================================= */

const getOfferByDay = async (req, res) => {

    try {

        const day = String(
            req.params.day || ""
        ).trim();


        if (!DAYS.includes(day)) {

            return res.status(400).json({

                success: false,

                message: "Invalid day."

            });

        }


        const [rows] = await db.query(
            `
            SELECT
                id,
                day,
                image,
                status,
                created_at
            FROM offer_images
            WHERE day = ?
            LIMIT 1
            `,
            [day]
        );


        if (rows.length === 0) {

            return res.status(404).json({

                success: false,

                message: "Offer not found."

            });

        }


        return res.status(200).json({

            success: true,

            data: rows[0]

        });


    } catch (error) {

        console.error(
            "❌ Get Offer By Day Error:",
            error
        );


        return res.status(500).json({

            success: false,

            message: "Failed to fetch offer.",

            error: error.message

        });

    }

};


/* =========================================================
   SAVE / UPDATE OFFER
========================================================= */

const saveOffer = async (req, res) => {

    let uploadedFilename = null;

    try {

        const day = String(
            req.params.day || ""
        ).trim();


        /* ---------------------------------------------
           VALIDATE DAY
        --------------------------------------------- */

        if (!DAYS.includes(day)) {

            return res.status(400).json({

                success: false,

                message: "Invalid day."

            });

        }


        /* ---------------------------------------------
           VALIDATE IMAGE
        --------------------------------------------- */

        if (!req.file) {

            return res.status(400).json({

                success: false,

                message: "Please select an image."

            });

        }


        ensureImageDirectory();


        uploadedFilename = req.file.filename;


        /* ---------------------------------------------
           GET EXISTING OFFER
        --------------------------------------------- */

        const [existingRows] = await db.query(
            `
            SELECT
                id,
                image
            FROM offer_images
            WHERE day = ?
            LIMIT 1
            `,
            [day]
        );


        /* ---------------------------------------------
           UPDATE EXISTING OFFER
        --------------------------------------------- */

        if (existingRows.length > 0) {

            const existingImage =
                existingRows[0].image;


            await db.query(
                `
                UPDATE offer_images
                SET
                    image = ?,
                    status = 'ACTIVE'
                WHERE day = ?
                `,
                [
                    uploadedFilename,
                    day
                ]
            );


            /*
               Delete old image after successful DB update.
            */

            if (
                existingImage &&
                existingImage !== uploadedFilename
            ) {

                deleteImageFile(
                    existingImage
                );

            }


        }

        /* ---------------------------------------------
           CREATE NEW OFFER
        --------------------------------------------- */

        else {

            await db.query(
                `
                INSERT INTO offer_images
                (
                    day,
                    image,
                    status
                )
                VALUES
                (
                    ?,
                    ?,
                    'ACTIVE'
                )
                `,
                [
                    day,
                    uploadedFilename
                ]
            );

        }


        /* ---------------------------------------------
           SUCCESS RESPONSE
        --------------------------------------------- */

        return res.status(200).json({

            success: true,

            message:
                `${day} offer image saved successfully.`,

            data: {

                day: day,

                image: uploadedFilename,

                status: "ACTIVE"

            }

        });


    } catch (error) {

        /*
           If database operation fails after the new
           image has been uploaded, remove the new file.
        */

        if (uploadedFilename) {

            try {

                deleteImageFile(
                    uploadedFilename
                );

            } catch (fileError) {

                console.error(
                    "❌ Failed to remove uploaded image after error:",
                    fileError
                );

            }

        }


        console.error(
            "❌ Save Offer Error:",
            error
        );


        return res.status(500).json({

            success: false,

            message: "Failed to save offer.",

            error: error.message

        });

    }

};


/* =========================================================
   DELETE OFFER
========================================================= */

const deleteOffer = async (req, res) => {

    try {

        const day = String(
            req.params.day || ""
        ).trim();


        /* ---------------------------------------------
           VALIDATE DAY
        --------------------------------------------- */

        if (!DAYS.includes(day)) {

            return res.status(400).json({

                success: false,

                message: "Invalid day."

            });

        }


        /* ---------------------------------------------
           GET EXISTING IMAGE
        --------------------------------------------- */

        const [rows] = await db.query(
            `
            SELECT
                id,
                image
            FROM offer_images
            WHERE day = ?
            LIMIT 1
            `,
            [day]
        );


        /* ---------------------------------------------
           NO OFFER FOUND
        --------------------------------------------- */

        if (rows.length === 0) {

            return res.status(404).json({

                success: false,

                message:
                    "No offer image found for this day."

            });

        }


        const imageFilename =
            rows[0].image;


        /* ---------------------------------------------
           DELETE DATABASE RECORD
        --------------------------------------------- */

        await db.query(
            `
            DELETE FROM offer_images
            WHERE day = ?
            `,
            [day]
        );


        /* ---------------------------------------------
           DELETE ACTUAL IMAGE FILE
        --------------------------------------------- */

        if (imageFilename) {

            try {

                deleteImageFile(
                    imageFilename
                );

            } catch (fileError) {

                /*
                   DB record is already deleted.

                   Log file deletion error instead of
                   returning a false database failure.
                */

                console.error(
                    "❌ Failed to delete physical offer image:",
                    fileError
                );

            }

        }


        /* ---------------------------------------------
           SUCCESS RESPONSE
        --------------------------------------------- */

        return res.status(200).json({

            success: true,

            message:
                `${day} offer image deleted successfully.`

        });


    } catch (error) {

        console.error(
            "❌ Delete Offer Error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Failed to delete offer.",

            error: error.message

        });

    }

};


/* =========================================================
   EXPORT
========================================================= */

module.exports = {

    getAllOffers,

    getTodayOffer,

    getOfferByDay,

    saveOffer,

    deleteOffer

};