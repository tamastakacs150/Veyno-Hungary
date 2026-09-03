# AI Marketing Pipeline

Documentation for the marketing feature in `server/controllers/aiMarketingController.js`, its
routes in `server/routes/aiMarketing.js`, the publishing services in `server/services/`, and the
admin UI in `client/src/components/admin/AiMarketingAssistant.tsx`.

It takes a product from the shop database and generates a complete social media post for it —
caption, image and short video. Publishing that result to Instagram or TikTok is started but
not finished — see below.

## Flow

```
                    Product (MongoDB, the shop's own collection)
                                    |
        +---------------------------+---------------------------+
        |                           |                           |
   DeepSeek chat              Gemini image                RunwayML video
   caption + hashtags         gemini-2.5-flash-image      text_to_video
   JSON mode                  streamed response           async task + polling
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

**RunwayML — video.** Video generation takes minutes, so it cannot be one request.
`POST /video/start` submits the task and returns a `taskId`, and `GET /video/status/:id` polls
it — this is the path that actually works. A webhook endpoint is registered at
`/api/ai-marketing/runway/webhook`, but its handler is currently a stub: it accepts the callback
and returns 200 without persisting the result, so nothing depends on it yet. Finishing it means
storing the result against the task and verifying the callback signature, since that route is
necessarily unauthenticated.

**Publishing — unfinished.** The intended flow is the Instagram Graph API's two calls: first
create a media container with the image URL and caption, then publish that container. That is why
the image has to be reachable at a public URL first, which is what the S3-compatible storage and
`CDN_PUBLIC_BASE` are for. The server routes (`/api/social/publish`, the TikTok status endpoint)
and the service functions exist, but this path has never been run end to end against a real
account, so treat it as scaffolding rather than a working feature.

## Endpoints

| Method | Endpoint                               | Purpose                           |
|--------|----------------------------------------|-----------------------------------|
| POST   | `/api/ai-marketing/generate-post`      | Caption, description and hashtags |
| POST   | `/api/ai-marketing/generate-image`     | Product image from a prompt       |
| POST   | `/api/ai-marketing/video/start`        | Start video generation, returns id|
| GET    | `/api/ai-marketing/video/status/:id`   | Poll generation status            |
| POST   | `/api/ai-marketing/runway/webhook`     | Runway callback (stub, public)    |

## Configuration

See `env.example`. The AI features need `DEEPSEEK_API_KEY`, `GEMINI_API_KEY` and
`RUNWAYML_API_SECRET`; publishing additionally needs `IG_USER_ID` and `FB_PAGE_ACCESS_TOKEN`,
and image hosting needs the `S3_*` variables and `CDN_PUBLIC_BASE`.

No secrets belong in this repository — `.env` is gitignored, and `env.example` lists variable
names only.

## Access control

All generation routes sit behind `authMiddleware` + `requireAdmin`, so only an administrator can
spend API credits. The separate customer-facing assistant at `/api/ai/support` is scoped the
other way: it requires a logged-in user and filters orders by `{ user: req.user._id }` or the
account's own email, so a customer cannot look up somebody else's order by guessing an order
number.

## Known limitations

- **No cost controls.** Every generation calls a paid API and nothing caps how often that can
  happen. There is request rate limiting on the server, but no per-user quota or spend limit.
  This is the most important thing to fix before anyone else uses it.
- **The webhook is a stub.** `runwayWebhook` destructures the callback body and discards it.
  Video results are only ever obtained by polling, so a long generation means a long series of
  requests. The handler also does not verify the callback signature — that has to be added before
  it is wired up, because the route is public by necessity.
- **No retries.** If a provider returns an error the endpoint reports it and stops. There is no
  queue and no retry with backoff, so a transient failure loses the generation.
- **No review step.** Nothing sits between generation and the publish call, which would matter
  if the publishing path were finished.
- **Publishing is untested.** The generation side (text, image, video) works; the publish side has
  not been verified against a live Instagram or TikTok account.
