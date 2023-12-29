import * as tf from "@tensorflow/tfjs";
import { classes } from "./classes.json";
const model = await tf.loadGraphModel("https://static-model.vercel.app/model.json");
let count = 0;
async function start() {
	const devices = (await navigator.mediaDevices.enumerateDevices()).filter(device => device.kind === "videoinput");
	const deviceId = devices[count % devices.length].deviceId;
	console.log(devices[count % devices.length].deviceId);
	let constraints;
	if (/Mobi|Android/i.test(navigator.userAgent)) {
		constraints = {
			video: {
				width: 1920,
				height: 1080,
				facingMode: { exact: "environment" },
			},
			audio: false,
		};
	} else {
		constraints = {
			video: {
				width: 1920,
				height: 1080,
				deviceId: { exact: deviceId },
			},
			audio: false,
		};
	}
	const camera = await navigator.mediaDevices.getUserMedia(constraints);
	console.log(devices);
	const video = document.querySelector("#video");
	const box = document.querySelector(".box");
	video.autoplay = true;
	video.srcObject = camera;
	await new Promise(r => {
		video.onloadedmetadata = r;
	});
	const clientWidth = video.clientWidth;
	const clientHeight = video.clientHeight;
	const videoWidth = video.videoWidth;
	const videoHeight = video.videoHeight;
	const targetWidth = 115;
	const targetHeight = 35;
	const scale = Math.min(clientWidth / videoWidth, clientHeight / videoHeight);
	const width = targetWidth * scale;
	const height = targetHeight * scale;

	box.style.setProperty("--width", `${video.clientWidth}px`);
	box.style.setProperty("--height", `${video.clientHeight}px`);
	box.style.setProperty("--clip-width", `${width}px`);
	box.style.setProperty("--clip-height", `${height}px`);
	const loading = document.querySelector(".loading");
	loading.style.display = "none";
}

function captureImg(videoElm, canvas) {
	const ctx = canvas.getContext("2d");
	if (ctx === null) {
		throw new Error("ctx null");
	}
	const width = 115;
	const height = 35;
	canvas.width = width;
	canvas.height = height;

	const x = (videoElm.videoWidth - width) / 2;
	const y = (videoElm.videoHeight - height) / 2;

	ctx.strokeStyle = "red";
	ctx.lineWidth = 3;

	// trim
	ctx.drawImage(videoElm, x, y, width, height, 0, 0, width, height);
}

const predict = canvas => {
	let imgData = tf.browser.fromPixels(canvas);
	imgData = imgData.toFloat().div(tf.scalar(255)); // ピクセル値を[0,1]の範囲に正規化
	imgData = imgData.expandDims(); // Reshape the tensor to have a batch size of 1
	const prediction = model.predict(imgData);
	const result = prediction.dataSync();
	return result;
};

function sendToDiscord(blob, content) {
	const discordHookUrl = "https://webhook-proxy-resistance.vercel.app/proxy/discord/webhook";
	const data = {
		content: content,
	};
	const form = new FormData();
	form.append("payload_json", JSON.stringify(data));
	form.append("attachment", blob, "img.jpg");
	fetch(discordHookUrl, {
		method: "POST",
		body: form,
	});
}

// document.onload = () => {
start();

const takepic = document.querySelector(".takepic");
takepic.addEventListener("click", () => {
	const video = document.querySelector("#video");
	const canvas = document.createElement("canvas");
	captureImg(video, canvas);
	const prediction = predict(canvas);
	console.log(prediction);
	const maxIndex = prediction.indexOf(Math.max(...prediction));
	console.log(classes[maxIndex], maxIndex);
	const message = `class: ${classes[maxIndex]} (${prediction[maxIndex] * 100}%)`;
	canvas.toBlob(blob => {
		sendToDiscord(blob, message);
	});
	// postImg(img);
	// about:blankに画像を表示
	// const URL = toBlob(img);
	// console.log(URL);
	// window.open(URL, "_blank");
});

const rotate = document.querySelector(".rotate");
rotate.addEventListener("click", () => {
	count++;
	start();
});
// };
