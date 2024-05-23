/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import FormData from "form-data";
import type { proto } from "@whiskeysockets/baileys";

export function callWebHook(url: string, body: any, response?: (data: any) => void) {
	axios
		.post(url, body)
		.then((res) => {
			console.log("callWebHook response", res.status, res.data);

			if (res.status === 200 && response) response(res.data);
		})
		.catch((err) => {
			console.log("Error calling webhook", err.message);
		});
}

export async function callWebHookFile(
	url: string,
	body: {
		message: proto.IWebMessageInfo;
		messageContent: any;
		session: string;
		messageType: string;
	},
	buffer: any,
	response?: (data: any) => void,
) {
	try {
		const { message, session, messageType, messageContent } = body;
		const mimeType = messageContent?.mimetype || "audio/wave";
		const fileFormat = mimeType.split("/")[1];

		const formData = new FormData();
		formData.append("message", message);
		formData.append("messageContent", messageContent);
		formData.append("session", session);
		formData.append("messageType", messageType);
		formData.append("file", buffer, { filename: `file.${fileFormat}` });

		const data = await axios.post(url, formData, {
			headers: formData.getHeaders(),
		});

		if (data.status === 200 && response) response(data.data);
	} catch (error) {
		console.log("Error calling webhook", error);
	}
}
