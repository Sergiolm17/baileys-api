import { Router } from "express";
import { message } from "@/controllers";
import requestValidator from "@/middlewares/request-validator";
import sessionValidator from "@/middlewares/session-validator";
import { query, body } from "express-validator";

const router = Router({ mergeParams: true });
router.get(
	"/",
	query("cursor").isNumeric().optional(),
	query("limit").isNumeric().optional(),
	requestValidator,
	message.list,
);

router.post("/send", requestValidator, sessionValidator, message.sendWithFormData);
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

export default router;
