# 1. Bázis image
FROM node:20-alpine

# 2. Munkakönyvtár
WORKDIR /app

# 3. Másolás
COPY . .

# 4. Telepítés
RUN npm install

# --- VITE VÁLTOZÓK IMPORTÁLÁSA (KÖTELEZŐ A BUILD ELŐTT) ---
ARG VITE_STRIPE_PUBLISHABLE_KEY
ENV VITE_STRIPE_PUBLISHABLE_KEY=$VITE_STRIPE_PUBLISHABLE_KEY

ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
# ---------------------------------------------------------

# 5. Build folyamat (Beégeti a domain címet a kódba)
RUN npm run build

# 6. Környezeti változók alapbeállítása (Backend)
ENV NODE_ENV=production
ENV PORT=5555

# 7. Port kinyitása (csak dokumentáció, a tunnel használja)
EXPOSE 5555

# 8. Indítás
CMD ["npm", "start"]