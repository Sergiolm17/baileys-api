import { Router } from "express";
import { message } from "@/controllers";
import requestValidator from "@/middlewares/request-validator";
import sessionValidator from "@/middlewares/session-validator";
import { query, body } from "express-validator";
import multer from "multer";

const storage = multer.memoryStorage();
const upload = multer({ storage });

const router = Router({ mergeParams: true });
router.get(
	"/",
	query("cursor").isNumeric().optional(),
	query("limit").isNumeric().optional(),
	requestValidator,
	message.list,
);

router.post("/send", upload.single("file"), requestValidator, sessionValidator, message.send);

router.post(
	"/send/bulk",
	body().isArray().notEmpty(),
	requestValidator,
	sessionValidator,
	message.sendBulk,
);
router.post(
	"/download",
	body().isObject().notEmpty(),
	requestValidator,
	sessionValidator,
	message.download,
);
router.post(
	"/downloadcontent",
	body().isObject().notEmpty(),
	requestValidator,
	sessionValidator,
	message.downloadContent,
);

export default router;
