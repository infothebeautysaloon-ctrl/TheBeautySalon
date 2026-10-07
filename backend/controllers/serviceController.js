const pool = require("../config/database");
const fs = require("fs");
const path = require("path");


// =====================================================
// SERVICE IMAGE DIRECTORY
// =====================================================

const SERVICE_IMAGE_DIR = path.join(
    __dirname,
    "../uploads/services"
);


// Make sure folder exists
fs.mkdirSync(
    SERVICE_IMAGE_DIR,
    {
        recursive: true
    }
);


// =====================================================
// DELETE SERVICE IMAGE
// =====================================================

function deleteServiceImage(filename) {

    if (!filename) return;

    const safeName =
        path.basename(
            String(filename)
        );

    const filePath =
        path.join(
            SERVICE_IMAGE_DIR,
            safeName
        );

    try {

        if (
            fs.existsSync(
                filePath
            )
        ) {

            fs.unlinkSync(
                filePath
            );

        }

    } catch (error) {

        console.error(
            "SERVICE IMAGE DELETE ERROR:",
            error
        );

    }

}


// =====================================================
// VALIDATE SERVICE INPUT
// =====================================================

function validateServiceInput({
    name,
    category,
    price,
    duration
}) {

    if (
        !name ||
        !category ||
        price === undefined ||
        duration === undefined
    ) {

        return (
            "Service name, category, price and duration are required."
        );

    }


    const categoryValue =
        String(category)
            .toLowerCase()
            .trim();


    if (
        ![
            "him",
            "her",
            "child"
        ].includes(
            categoryValue
        )
    ) {

        return (
            "Category must be Him, Her or Child."
        );

    }


    if (
        !Number.isFinite(
            Number(price)
        ) ||
        Number(price) < 0
    ) {

        return (
            "Price must be a valid non-negative number."
        );

    }


    if (
        !Number.isInteger(
            Number(duration)
        ) ||
        Number(duration) <= 0
    ) {

        return (
            "Duration must be a positive whole number."
        );

    }


    return null;

}


// =====================================================
// NORMALIZE BRANCH
//
// NULL = ALL BRANCHES
// NUMBER = SPECIFIC BRANCH
// =====================================================

function normalizeBranchId(branch_id) {

    if (
        branch_id === undefined ||
        branch_id === null ||
        String(branch_id).trim() === "" ||
        String(branch_id).trim().toUpperCase() === "ALL"
    ) {

        return null;

    }


    const branchId =
        Number(branch_id);


    if (
        !Number.isInteger(branchId) ||
        branchId <= 0
    ) {

        return undefined;

    }


    return branchId;

}


// =====================================================
// GET ALL SERVICES
// =====================================================

const getAllServices = async (
    req,
    res
) => {

    try {

        const [rows] =
            await pool.promise().query(`

                SELECT

                    s.id,

                    s.name,

                    s.category,

                    s.branch_id,

                    s.price,

                    s.duration,

                    s.description,

                    s.service_image,

                    s.is_active,

                    s.created_at,

                    b.name AS branch_name

                FROM services s

                LEFT JOIN branches b
                    ON s.branch_id = b.id

                ORDER BY
                    s.id ASC

            `);


        const data =
            rows.map(
                function (service) {

                    return {

                        ...service,

                        branch_name:
                            service.branch_id === null
                                ? "All Branches"
                                : service.branch_name

                    };

                }
            );


        res.json({

            success: true,

            count:
                data.length,

            data

        });


    } catch (error) {

        console.error(
            "GET SERVICES ERROR:",
            error
        );


        res.status(500).json({

            success: false,

            message:
                "Failed to fetch services.",

            error:
                error.message

        });

    }

};


// =====================================================
// GET SINGLE SERVICE
// =====================================================

const getServiceById = async (
    req,
    res
) => {

    try {

        const [rows] =
            await pool.promise().query(`

                SELECT

                    s.id,

                    s.name,

                    s.category,

                    s.branch_id,

                    s.price,

                    s.duration,

                    s.description,

                    s.service_image,

                    s.is_active,

                    s.created_at,

                    b.name AS branch_name

                FROM services s

                LEFT JOIN branches b
                    ON s.branch_id = b.id

                WHERE s.id = ?

                LIMIT 1

            `, [

                req.params.id

            ]);


        if (
            !rows.length
        ) {

            return res.status(404).json({

                success: false,

                message:
                    "Service not found."

            });

        }


        const service =
            rows[0];


        if (
            service.branch_id === null
        ) {

            service.branch_name =
                "All Branches";

        }


        res.json({

            success: true,

            data:
                service

        });


    } catch (error) {

        console.error(
            "GET SERVICE ERROR:",
            error
        );


        res.status(500).json({

            success: false,

            message:
                "Failed to fetch service.",

            error:
                error.message

        });

    }

};


// =====================================================
// CREATE SERVICE
// =====================================================

const createService = async (
    req,
    res
) => {

    try {

        const {
            name,
            category,
            description,
            price,
            duration,
            is_active,
            branch_id
        } = req.body;


        // =================================================
        // VALIDATE BASIC SERVICE DATA
        // =================================================

        const validationError =
            validateServiceInput({

                name,
                category,
                price,
                duration

            });


        if (
            validationError
        ) {

            if (req.file) {

                deleteServiceImage(
                    req.file.filename
                );

            }


            return res.status(400).json({

                success: false,

                message:
                    validationError

            });

        }


        // =================================================
        // NORMALIZE BRANCH
        //
        // Empty / ALL = ALL BRANCHES
        // =================================================

        const branchId =
            normalizeBranchId(
                branch_id
            );


        if (
            branchId === undefined
        ) {

            if (req.file) {

                deleteServiceImage(
                    req.file.filename
                );

            }


            return res.status(400).json({

                success: false,

                message:
                    "Invalid branch selected."

            });

        }


        // =================================================
        // VALIDATE SPECIFIC BRANCH
        // =================================================

        if (
            branchId !== null
        ) {

            const [branchRows] =
                await pool.promise().query(`

                    SELECT
                        id

                    FROM branches

                    WHERE id = ?

                    AND is_active = 1

                    LIMIT 1

                `, [

                    branchId

                ]);


            if (
                !branchRows.length
            ) {

                if (req.file) {

                    deleteServiceImage(
                        req.file.filename
                    );

                }


                return res.status(400).json({

                    success: false,

                    message:
                        "Selected branch is not available."

                });

            }

        }


        const categoryValue =
            String(category)
                .toLowerCase()
                .trim();


        const imageName =
            req.file
                ? req.file.filename
                : null;


        // =================================================
        // INSERT SERVICE
        // =================================================

        const [result] =
            await pool.promise().query(`

                INSERT INTO services
                (
                    name,
                    category,
                    branch_id,
                    price,
                    duration,
                    description,
                    service_image,
                    is_active
                )

                VALUES (?, ?, ?, ?, ?, ?, ?, ?)

            `, [

                String(name).trim(),

                categoryValue,

                branchId,

                Number(price),

                Number(duration),

                description
                    ? String(description).trim()
                    : null,

                imageName,

                is_active === "0" ||
                is_active === 0
                    ? 0
                    : 1

            ]);


        res.status(201).json({

            success: true,

            message:
                "Service added successfully.",

            serviceId:
                result.insertId,

            service_image:
                imageName

        });


    } catch (error) {

        if (req.file) {

            deleteServiceImage(
                req.file.filename
            );

        }


        console.error(
            "ADD SERVICE ERROR:",
            error
        );


        res.status(500).json({

            success: false,

            message:
                "Failed to add service.",

            error:
                error.message

        });

    }

};


// =====================================================
// UPDATE SERVICE
// =====================================================

const updateService = async (
    req,
    res
) => {

    try {

        const {
            name,
            category,
            description,
            price,
            duration,
            is_active,
            branch_id
        } = req.body;


        // =================================================
        // VALIDATE BASIC SERVICE DATA
        // =================================================

        const validationError =
            validateServiceInput({

                name,
                category,
                price,
                duration

            });


        if (
            validationError
        ) {

            if (req.file) {

                deleteServiceImage(
                    req.file.filename
                );

            }


            return res.status(400).json({

                success: false,

                message:
                    validationError

            });

        }


        // =================================================
        // NORMALIZE BRANCH
        //
        // Empty / ALL = ALL BRANCHES
        // =================================================

        const branchId =
            normalizeBranchId(
                branch_id
            );


        if (
            branchId === undefined
        ) {

            if (req.file) {

                deleteServiceImage(
                    req.file.filename
                );

            }


            return res.status(400).json({

                success: false,

                message:
                    "Invalid branch selected."

            });

        }


        // =================================================
        // VALIDATE SPECIFIC BRANCH
        // =================================================

        if (
            branchId !== null
        ) {

            const [branchRows] =
                await pool.promise().query(`

                    SELECT
                        id

                    FROM branches

                    WHERE id = ?

                    AND is_active = 1

                    LIMIT 1

                `, [

                    branchId

                ]);


            if (
                !branchRows.length
            ) {

                if (req.file) {

                    deleteServiceImage(
                        req.file.filename
                    );

                }


                return res.status(400).json({

                    success: false,

                    message:
                        "Selected branch is not available."

                });

            }

        }


        // =================================================
        // GET OLD SERVICE
        // =================================================

        const [existingRows] =
            await pool.promise().query(`

                SELECT
                    service_image

                FROM services

                WHERE id = ?

                LIMIT 1

            `, [

                req.params.id

            ]);


        if (
            !existingRows.length
        ) {

            if (req.file) {

                deleteServiceImage(
                    req.file.filename
                );

            }


            return res.status(404).json({

                success: false,

                message:
                    "Service not found."

            });

        }


        const oldImage =
            existingRows[0]
                .service_image ||
            null;


        // =================================================
        // IMAGE HANDLING
        // =================================================

        const newImage =
            req.file
                ? req.file.filename
                : oldImage;


        const categoryValue =
            String(category)
                .toLowerCase()
                .trim();


        const activeValue =
            is_active === "0" ||
            is_active === 0
                ? 0
                : 1;


        // =================================================
        // UPDATE SERVICE
        // =================================================

        const [result] =
            await pool.promise().query(`

                UPDATE services

                SET

                    name = ?,

                    category = ?,

                    branch_id = ?,

                    price = ?,

                    duration = ?,

                    description = ?,

                    service_image = ?,

                    is_active = ?

                WHERE id = ?

            `, [

                String(name).trim(),

                categoryValue,

                branchId,

                Number(price),

                Number(duration),

                description
                    ? String(description).trim()
                    : null,

                newImage,

                activeValue,

                req.params.id

            ]);


        if (
            !result.affectedRows
        ) {

            if (req.file) {

                deleteServiceImage(
                    req.file.filename
                );

            }


            return res.status(404).json({

                success: false,

                message:
                    "Service not found."

            });

        }


        // =================================================
        // DELETE OLD IMAGE
        // =================================================

        if (
            req.file &&
            oldImage &&
            oldImage !== newImage
        ) {

            deleteServiceImage(
                oldImage
            );

        }


        res.json({

            success: true,

            message:
                "Service updated successfully.",

            service_image:
                newImage

        });


    } catch (error) {

        if (req.file) {

            deleteServiceImage(
                req.file.filename
            );

        }


        console.error(
            "UPDATE SERVICE ERROR:",
            error
        );


        res.status(500).json({

            success: false,

            message:
                "Failed to update service.",

            error:
                error.message

        });

    }

};


// =====================================================
// DELETE / DEACTIVATE SERVICE
//
// If service has bookings:
//     Do NOT permanently delete
//     Set is_active = 0
//
// If service has NO bookings:
//     Permanently delete service
//
// This protects booking history.
// =====================================================

const deleteService = async (
    req,
    res
) => {

    const serviceId =
        req.params.id;


    try {

        // =================================================
        // 1. CHECK SERVICE EXISTS
        // =================================================

        const [serviceRows] =
            await pool.promise().query(`

                SELECT

                    id,

                    name,

                    service_image,

                    is_active

                FROM services

                WHERE id = ?

                LIMIT 1

            `, [

                serviceId

            ]);


        if (
            !serviceRows.length
        ) {

            return res.status(404).json({

                success: false,

                message:
                    "Service not found."

            });

        }


        const service =
            serviceRows[0];


        // =================================================
        // 2. CHECK EXISTING BOOKINGS
        // =================================================

        const [bookingRows] =
            await pool.promise().query(`

                SELECT
                    COUNT(*) AS bookingCount

                FROM bookings

                WHERE service_id = ?

            `, [

                serviceId

            ]);


        const bookingCount =
            Number(
                bookingRows[0]
                    .bookingCount
            );


        // =================================================
        // 3. BOOKINGS EXIST
        // =================================================

        if (
            bookingCount > 0
        ) {

            const [updateResult] =
                await pool.promise().query(`

                    UPDATE services

                    SET
                        is_active = 0

                    WHERE id = ?

                `, [

                    serviceId

                ]);


            if (
                !updateResult.affectedRows
            ) {

                return res.status(500).json({

                    success: false,

                    message:
                        "Failed to deactivate service."

                });

            }


            return res.json({

                success: true,

                action:
                    "deactivated",

                bookingCount,

                message:
                    `"${service.name}" has existing bookings, so it was deactivated instead of permanently deleted.`

            });

        }


        // =================================================
        // 4. NO BOOKINGS
        // =================================================

        const [deleteResult] =
            await pool.promise().query(`

                DELETE FROM services

                WHERE id = ?

            `, [

                serviceId

            ]);


        if (
            !deleteResult.affectedRows
        ) {

            return res.status(404).json({

                success: false,

                message:
                    "Service not found."

            });

        }


        // =================================================
        // 5. DELETE IMAGE
        // =================================================

        if (
            service.service_image
        ) {

            deleteServiceImage(
                service.service_image
            );

        }


        return res.json({

            success: true,

            action:
                "deleted",

            bookingCount:
                0,

            message:
                `"${service.name}" was permanently deleted successfully.`

        });


    } catch (error) {

        console.error(
            "DELETE SERVICE ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Failed to manage service.",

            error:
                error.message

        });

    }

};


// =====================================================
// ACTIVATE SERVICE
// =====================================================

const activateService = async (
    req,
    res
) => {

    try {

        // =================================================
        // CHECK SERVICE EXISTS
        // =================================================

        const [serviceRows] =
            await pool.promise().query(`

                SELECT

                    id,

                    name,

                    is_active

                FROM services

                WHERE id = ?

                LIMIT 1

            `, [

                req.params.id

            ]);


        if (
            !serviceRows.length
        ) {

            return res.status(404).json({

                success: false,

                message:
                    "Service not found."

            });

        }


        // =================================================
        // ACTIVATE
        // =================================================

        const [result] =
            await pool.promise().query(`

                UPDATE services

                SET
                    is_active = 1

                WHERE id = ?

            `, [

                req.params.id

            ]);


        if (
            !result.affectedRows
        ) {

            return res.status(500).json({

                success: false,

                message:
                    "Failed to activate service."

            });

        }


        return res.json({

            success: true,

            action:
                "activated",

            message:
                `"${serviceRows[0].name}" has been activated successfully.`

        });


    } catch (error) {

        console.error(
            "ACTIVATE SERVICE ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Failed to activate service."

        });

    }

};


// =====================================================
// EXPORTS
// =====================================================

module.exports = {

    getAllServices,

    getServiceById,

    createService,

    updateService,

    deleteService,

    activateService

};