# AI Marketing Pipeline

Documentation for the marketing feature in `server/controllers/aiMarketingController.js`, its
routes in `server/routes/aiMarketing.js`, the publishing services in `server/services/`, and the
admin UI in `client/src/components/admin/AiMarketingAssistant.tsx`.

It takes a product from the shop database and generates a complete social media post for it —
caption, image and short video — and can publish the result to Instagram.

## Flow

```
                    Product (MongoDB, the shop's own collection)
                                    |
        +---------------------------+---------------------------+
        |                           |                           |
   DeepSeek chat              Gemini image                RunwayML video
   caption + hashtags         gemini-2.5-flash-image      text_to_video
   JSON mode                  streamed response           async task + webhook
        |                           |                           |
        +---------------------------+---------------------------+
                                    |
                        Instagram Graph API / TikTok
```

## The three integrations, and why each is different

**DeepSeek — text.** A system prompt defines the brand voice and the exact shape of the answer;
the product row is passed in as JSON. The request uses `response_format: { type: "json_object" }`
so the reply parses directly into `{ title, description, hashtags }` instead of being scraped out
of prose. Without JSON mode the model wraps the caption in explanation and the parse breaks
unpredictably.

**Gemini — images.** `generateContentStream` returns the image in chunks, so the handler writes
the parts out as they arrive and saves the file under `client/public/generated/`. Product images
are fetched and passed in as inline data, so the generated image is based on the actual product
photo rather than the description alone. Local files under `public/products/...` are read from
disk; only genuinely remote URLs go through HTTP, and those are checked by `validateSafeUrl()`
with a size cap and a short timeout so the fetch cannot be pointed at internal addresses.

**RunwayML — video.** Video generation takes minutes, so it cannot be one request. The endpoint
is split into three: `POST /video/start` submits the task and returns a `taskId`,
`GET /video/status/:id` polls it, and a webhook receives the result when it is ready. The
interesting failure modes here are about state, not about the model.

**Publishing.** The Instagram Graph API needs two calls: first create a media container with the
image URL and caption, then publish that container. The image therefore has to be reachable at a
public URL before publishing — that is what the S3-compatible storage and `CDN_PUBLIC_BASE` are
for.

## Endpoints

| Method | Endpoint                     | Purpose                              |
|--------|------------------------------|--------------------------------------|
| POST   | `/api/ai/generate-post`      | Caption, description and hashtags    |
| POST   | `/api/ai/generate-image`     | Product image from a prompt          |
| POST   | `/api/ai/video/start`        | Start video generation, returns id   |
| GET    | `/api/ai/video/status/:id`   | Poll generation status               |

## Configuration

See `env.example`. The AI features need `DEEPSEEK_API_KEY`, `GEMINI_API_KEY` and
`RUNWAYML_API_SECRET`; publishing additionally needs `IG_USER_ID` and `FB_PAGE_ACCESS_TOKEN`,
and image hosting needs the `S3_*` variables and `CDN_PUBLIC_BASE`.

No secrets belong in this repository — `.env` is gitignored, and `env.example` lists variable
names only.

## Known limitations

- **No cost controls.** Every generation calls a paid API and nothing caps how often that can
  happen. There is request rate limiting on the server, but no per-user quota or spend limit.
  This is the most important thing to fix before anyone else uses it.
- **Polling, not events.** Video status is polled from the client; the webhook exists but the
  client does not subscribe to it, so a long generation means a long series of requests.
- **No retries.** If a provider returns an error the endpoint reports it and stops. There is no
  queue and no retry with backoff, so a transient failure loses the generation.
- **No review step.** Generated content can be published without approval, which is fine for a
  personal shop and would not be for a real brand account.
- Tested with a single Instagram Professional account; the TikTok path is less complete.
