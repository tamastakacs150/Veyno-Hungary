//server/services/tiktok.js
import axios from "axios";
const TT_API = "https://open.tiktokapis.com";


export async function publishTikTok({ imageUrls, caption }) {
  const accessToken = process.env.TIKTOK_ACCESS_TOKEN;
  const { data: init } = await axios.post(
    "https://open.tiktokapis.com/v2/post/publish/content/init/",
    {
      post_info: { caption: caption?.slice(0, 2200) || "" },
      media: imageUrls.map(u => ({ type: "PHOTO", photo: { photo_url: u } })),
      source_info: { source: "PULL_FROM_URL" },
    },
    { headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" } }
  );

  // return here e.g. { data: { publish_id: "12345" } }
  return { publishId: init?.data?.publish_id, raw: init };
}

export async function getTikTokStatus(id) {
const accessToken = process.env.TIKTOK_ACCESS_TOKEN;
// Example: if TikTok provided an id in the publish init response, you can query the status here
// (The specific endpoint can be set according to the dev console documentation; here is a placeholder):
const { data } = await axios.get(`${TT_API}/v2/post/publish/status/`, {
headers: { Authorization: `Bearer ${accessToken}` },
params: { id },
});
return data;
}


export async function handleTikTokWebhook(payload) {
// Comes here if TikTok can ping you about the status being finalized
console.log("TikTok webhook payload:", JSON.stringify(payload));
}