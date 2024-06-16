import type { proto, WAGenericMediaMessage, WAMessage } from "@whiskeysockets/baileys";
import { downloadMediaMessage } from "@whiskeysockets/baileys";
import { serializePrisma } from "@/store";
import type { RequestHandler } from "express";
import { logger } from "@/shared";
import { delay as delayMs } from "@/utils";
import { getSession, jidExists } from "@/whatsapp";
import { prisma } from "@/db";
import type { Message } from "@prisma/client";

export const list: RequestHandler = async (req, res) => {
	try {
		const { sessionId } = req.params;
		const { cursor = undefined, limit = 25 } = req.query;
		const messages = (
			await prisma.message.findMany({
				cursor: cursor ? { pkId: Number(cursor) } : undefined,
				take: Number(limit),
				skip: cursor ? 1 : 0,
				where: { sessionId },
			})
		).map((m: Message) => serializePrisma(m));

		res.status(200).json({
			data: messages,
			cursor:
				messages.length !== 0 && messages.length === Number(limit)
					? messages[messages.length - 1].pkId
					: null,
		});
	} catch (e) {
		const message = "An error occured during message list";
		logger.error(e, message);
		res.status(500).json({ error: message });
	}
};

export const send: RequestHandler = async (req, res) => {
	try {
		let { jid, type = "number", message, options } = req.body;

		// Procesa los datos de form-data si existen
		if (req.is("multipart/form-data")) {
			jid = req.body.jid;
			type = req.body.type || "number";
			message = JSON.parse(req.body.message);
			options = JSON.parse(req.body.options) || {};

			// Si se envía un archivo, ajusta el mensaje para que sea compatible con Buffer
			if (req.file) {
				const mediaType = req.file.mimetype.split("/")[0]; // 'image' o 'document'
				message = {
					...message, // Concatenar con el mensaje enviado por el usuario
					[mediaType]: req.file.buffer,
				};
			}
		}

		const session = getSession(req.params.sessionId)!;

		const { exists, formatJid } = await jidExists(session, jid, type);
		if (!exists) return res.status(400).json({ error: "JID does not exist" });

		const result = await session.sendMessage(formatJid, message, options);
		res.status(200).json(result);
	} catch (e) {
		const errorMessage = "An error occurred during message send";
		logger.error(e, errorMessage);
		res.status(500).json({ error: errorMessage });
	}
};

export const sendBulk: RequestHandler = async (req, res) => {
	const session = getSession(req.params.sessionId)!;
	const results: { index: number; result: proto.WebMessageInfo | undefined }[] = [];
	const errors: { index: number; error: string }[] = [];

	for (const [
		index,
		{ jid, type = "number", delay = 1000, message, options },
	] of req.body.entries()) {
		try {
			const exists = await jidExists(session, jid, type);
			if (!exists) {
				errors.push({ index, error: "JID does not exists" });
				continue;
			}

			if (index > 0) await delayMs(delay);
			const result = await session.sendMessage(jid, message, options);
			results.push({ index, result });
		} catch (e) {
			const message = "An error occured during message send";
			logger.error(e, message);
			errors.push({ index, error: message });
		}
	}

	res
		.status(req.body.length !== 0 && errors.length === req.body.length ? 500 : 200)
		.json({ results, errors });
};

export const download: RequestHandler = async (req, res) => {
	try {
		const session = getSession(req.params.sessionId)!;
		const message = req.body as WAMessage;
		const type = Object.keys(message.message!)[0] as keyof proto.IMessage;
		const content = message.message![type] as WAGenericMediaMessage;
		const buffer = await downloadMediaMessage(
			message,
			"buffer",
			{},
			{ logger, reuploadRequest: session.updateMediaMessage },
		);

		res.setHeader("Content-Type", content.mimetype!);
		res.write(buffer);
		res.end();
	} catch (e) {
		const message = "An error occured during message media download";
		logger.error(e, message);
		res.status(500).json({ error: message });
	}
};
