//server/services/instagram.js
import axios from "axios";
const IG_API = "https://graph.facebook.com/v19.0";


export async function publishInstagram({ imageUrl, caption }) {
const igUserId = process.env.IG_USER_ID; // IG Professional account ID
const token = process.env.FB_PAGE_ACCESS_TOKEN; // long-lived Page token


// 1) container creation
const { data: cont } = await axios.post(
`${IG_API}/${igUserId}/media`, null,
{ params: { image_url: imageUrl, caption, access_token: token } }
);


// 2) publishing
const { data: pub } = await axios.post(
`${IG_API}/${igUserId}/media_publish`, null,
{ params: { creation_id: cont.id, access_token: token } }
);


return pub; // { id: media_id }
}